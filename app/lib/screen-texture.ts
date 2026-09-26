"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import {
  MAX_TEXTURE_SIZE,
  buildScreenCanvas,
  getCoverCrop,
} from "./mockup-image";

/**
 * Textura da tela de um aparelho. Os seis modelos faziam o mesmo caminho à
 * mão — carregar a imagem, recortar em "cover" no formato da tela, configurar
 * a textura —, e cada fonte nova (vídeo, hoje) teria que ser repetida seis
 * vezes. Aqui fica o caminho único; o material continua em cada modelo, porque
 * ali há diferenças legítimas (polygonOffset, material declarativo).
 */

export type ScreenSource =
  | { kind: "image"; url: string }
  /** `key` identifica o objeto, para o controlador achar o vídeo dele. */
  | { kind: "video"; key: string; url: string };

/**
 * Elementos de vídeo das telas, por objeto. O hook só cria e registra; quem
 * decide o tempo é o controlador do canvas, que lê o relógio da cena a cada
 * quadro. Fica fora do React de propósito: sincronizar vídeo via estado
 * re-renderizaria a árvore a cada quadro.
 */
const screenVideos = new Map<string, HTMLVideoElement>();

export function getScreenVideoElement(key: string) {
  return screenVideos.get(key) ?? null;
}

type ScreenTextureOptions = {
  /** Proporção da tela do modelo; só a razão entre os dois importa. */
  cropWidth: number;
  cropHeight: number;
  /** Depende das UVs de cada modelo: GLBs e geometrias procedurais divergem. */
  flipY: boolean;
};

// 1×1 transparente: o useTexture não pode ser chamado condicionalmente, então
// quando a fonte é vídeo ele carrega isto e o resultado é ignorado.
const BLANK_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function configureScreenTexture(texture: THREE.Texture, flipY: boolean) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = flipY;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
}

/**
 * Recorte "cover" expresso como transformação de UV, para fontes que não dá
 * para recortar num canvas a cada quadro (vídeo). Mesmo recorte do
 * `buildScreenCanvas`: centralizado, mantendo a proporção da tela.
 */
export function getCoverUvTransform(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
) {
  const crop = getCoverCrop(
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
  );

  return {
    offset: [crop.srcX / sourceWidth, crop.srcY / sourceHeight] as const,
    repeat: [crop.srcW / sourceWidth, crop.srcH / sourceHeight] as const,
  };
}

function useImageScreenTexture(
  url: string,
  { cropHeight, cropWidth, flipY }: ScreenTextureOptions,
) {
  const sourceTexture = useTexture(url);

  const texture = useMemo(() => {
    const image = sourceTexture.image as
      | HTMLImageElement
      | HTMLCanvasElement
      | undefined;

    if (!image) {
      return sourceTexture;
    }

    const width =
      image instanceof HTMLImageElement
        ? image.naturalWidth || image.width
        : image.width;
    const height =
      image instanceof HTMLImageElement
        ? image.naturalHeight || image.height
        : image.height;
    const canvas = buildScreenCanvas(
      image,
      width,
      height,
      cropWidth,
      cropHeight,
      MAX_TEXTURE_SIZE,
    );
    const next = sourceTexture.clone();

    next.image = canvas;
    configureScreenTexture(next, flipY);
    next.minFilter = THREE.LinearMipmapLinearFilter;
    next.needsUpdate = true;

    return next;
  }, [cropHeight, cropWidth, flipY, sourceTexture]);

  useEffect(() => {
    if (texture !== sourceTexture) {
      return () => texture.dispose();
    }
  }, [sourceTexture, texture]);

  return texture;
}

/**
 * Vídeo como textura: o WebGL lê o quadro atual a cada render, então o vídeo
 * entra no export como qualquer outra textura. Nasce pausado e sem loop — o
 * tempo é do controlador do canvas (quadro fixo no Estático, playhead no
 * Movimento). Mudo, que é o que o navegador deixa tocar sem gesto do usuário.
 * Sem mipmaps: gerá-los a cada quadro custaria caro e a tela quase nunca é
 * vista minúscula.
 */
function useVideoScreenTexture(
  key: string | null,
  url: string | null,
  { cropHeight, cropWidth, flipY }: ScreenTextureOptions,
) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (!url || !key) {
      return;
    }

    const video = document.createElement("video");
    let created: THREE.VideoTexture | null = null;

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    // No documento, mas invisível. Um <video> solto em memória não apresenta
    // quadros ao compositor: o Chrome pausa "vídeo sem áudio em segundo
    // plano" e o VideoTexture, que se atualiza a cada quadro apresentado,
    // fica congelado.
    video.setAttribute("aria-hidden", "true");
    video.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(video);

    // Com o vídeo pausado e posicionado pelo app (quadro fixo, playhead), não
    // há quadro "apresentado" a cada seek; atualiza a textura explicitamente.
    // Vale também para o primeiro quadro, que chega sem nenhum seek.
    function handleSeeked() {
      if (created) {
        created.needsUpdate = true;
      }
    }

    // As dimensões só existem depois dos metadados, e o recorte depende delas.
    function handleMetadata() {
      const next = new THREE.VideoTexture(video);
      const { offset, repeat } = getCoverUvTransform(
        video.videoWidth,
        video.videoHeight,
        cropWidth,
        cropHeight,
      );

      configureScreenTexture(next, flipY);
      next.minFilter = THREE.LinearFilter;
      next.generateMipmaps = false;
      next.offset.set(offset[0], offset[1]);
      next.repeat.set(repeat[0], repeat[1]);
      created = next;
      setTexture(next);
    }

    video.addEventListener("loadedmetadata", handleMetadata, { once: true });
    video.addEventListener("loadeddata", handleSeeked);
    video.addEventListener("seeked", handleSeeked);
    video.src = url;
    screenVideos.set(key, video);

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("loadeddata", handleSeeked);
      video.removeEventListener("seeked", handleSeeked);

      if (screenVideos.get(key) === video) {
        screenVideos.delete(key);
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      created?.dispose();
      setTexture(null);
    };
  }, [cropHeight, cropWidth, flipY, key, url]);

  return texture;
}

/**
 * Enquanto o vídeo carrega os metadados devolve null: o modelo mostra a tela
 * sem textura por um instante, em vez de suspender a cena inteira.
 */
export function useScreenTexture(
  source: ScreenSource,
  options: ScreenTextureOptions,
): THREE.Texture | null {
  const imageTexture = useImageScreenTexture(
    source.kind === "image" ? source.url : BLANK_IMAGE,
    options,
  );
  const videoTexture = useVideoScreenTexture(
    source.kind === "video" ? source.key : null,
    source.kind === "video" ? source.url : null,
    options,
  );

  return source.kind === "video" ? videoTexture : imageTexture;
}
