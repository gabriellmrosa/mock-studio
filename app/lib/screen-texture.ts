"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { detectHdrTransfer, type HdrTransfer } from "./hdr-video";
import { createScreenCompositor } from "./screen-compositor";
import {
  MAX_TEXTURE_SIZE,
  buildScreenCanvas,
  getCoverCrop,
} from "./mockup-image";
import {
  DEFAULT_SCREEN_FIT,
  MAX_SCREEN_CROP,
  MAX_SCREEN_ZOOM,
  MIN_SCREEN_ZOOM,
  type ScreenFit,
} from "./scene-objects";

/**
 * Textura da tela de um aparelho. Os seis modelos faziam o mesmo caminho à
 * mão — carregar a imagem, recortar em "cover" no formato da tela, configurar
 * a textura —, e cada fonte nova (vídeo, hoje) teria que ser repetida seis
 * vezes. Aqui fica o caminho único; o material continua em cada modelo, porque
 * ali há diferenças legítimas (polygonOffset, material declarativo).
 *
 * A fonte (imagem ou vídeo) nunca vai direto para o material: passa pela
 * composição ([screen-compositor.ts](app/lib/screen-compositor.ts)), que
 * aplica enquadramento, fundo e conversão HDR numa textura no formato da tela.
 */

export type ScreenSource =
  | { fit?: ScreenFit; kind: "image"; url: string }
  /** `key` identifica o objeto, para o controlador achar o vídeo dele. */
  | { fit?: ScreenFit; kind: "video"; key: string; url: string };

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

/**
 * Telas cujo vídeo está fora do trecho do clipe na timeline: mostram só a cor
 * de fundo, como uma tela sem vídeo. Quem decide é quem decide o tempo (o
 * controlador do canvas, ou a exportação); o compositor só lê.
 */
const hiddenScreenVideos = new Set<string>();

export function setScreenVideoShown(key: string, shown: boolean) {
  if (shown) {
    hiddenScreenVideos.delete(key);
  } else {
    hiddenScreenVideos.add(key);
  }
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
 * Onde amostrar o conteúdo para preencher a tela: recorte "cover" automático e
 * enquadramento do usuário, em UV da textura de origem. `offset`/`repeat`
 * levam a UV da tela (0 a 1) para a UV da origem; `contentMin`/`contentMax`
 * delimitam o conteúdo visível — fora dele a composição pinta o fundo.
 *
 * O corte das bordas é uma máscara, não um novo enquadramento: a escala e a
 * posição são calculadas sobre o arquivo inteiro, e o corte só esconde as
 * faixas, que passam a mostrar o fundo. Recalcular o "cover" sobre o que sobra
 * ampliava o conteúdo — cortar em cima e embaixo parecia um zoom.
 *
 * O sentido do V depende do `flipY` do modelo: com `flipY` o V cresce para o
 * topo da imagem, sem ele cresce para baixo. Sem compensar, "subir" o conteúdo
 * desceria no Notebook e no Smartwatch, e o corte de cima cortaria embaixo.
 */
export function getScreenLayout(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  fit: ScreenFit = DEFAULT_SCREEN_FIT,
  flipY = true,
) {
  const clampCrop = (value: number) =>
    Math.min(MAX_SCREEN_CROP, Math.max(0, value || 0));
  const cropLeft = clampCrop(fit.cropLeft);
  const cropRight = clampCrop(fit.cropRight);
  const cropTop = clampCrop(fit.cropTop);
  const cropBottom = clampCrop(fit.cropBottom);

  const crop = getCoverCrop(
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
  );
  const zoom = Math.min(MAX_SCREEN_ZOOM, Math.max(MIN_SCREEN_ZOOM, fit.zoom));
  const panX = Math.min(1, Math.max(-1, fit.panX));
  const panY = Math.min(1, Math.max(-1, fit.panY));

  // Janela em frações da origem. Com zoom < 1 passa de 1 e a folga fica
  // negativa: o mesmo cálculo de posição passa a mover o conteúdo dentro da
  // tela.
  const windowU = crop.srcW / sourceWidth / zoom;
  const windowV = crop.srcH / sourceHeight / zoom;

  // Borda que fica em V = 0: a de baixo com flipY, a de cima sem.
  const cropAtV0 = flipY ? cropBottom : cropTop;
  const cropAtV1 = flipY ? cropTop : cropBottom;

  return {
    contentMax: [1 - cropRight, 1 - cropAtV1] as const,
    contentMin: [cropLeft, cropAtV0] as const,
    // Mover o conteúdo para a direita é levar a janela para a esquerda.
    offset: [
      ((1 - windowU) / 2) * (1 - panX),
      ((1 - windowV) / 2) * (flipY ? 1 - panY : 1 + panY),
    ] as const,
    repeat: [windowU, windowV] as const,
  };
}

function useImageScreenTexture(
  url: string,
  { flipY }: ScreenTextureOptions,
) {
  const sourceTexture = useTexture(url);

  const texture = useMemo(() => {
    const image = sourceTexture.image as
      | HTMLImageElement
      | HTMLCanvasElement
      | undefined;

    if (!image) {
      return { size: null, texture: sourceTexture };
    }

    const width =
      image instanceof HTMLImageElement
        ? image.naturalWidth || image.width
        : image.width;
    const height =
      image instanceof HTMLImageElement
        ? image.naturalHeight || image.height
        : image.height;
    // A imagem inteira, só reduzida ao teto de textura: o recorte é feito na
    // composição, para o enquadramento alcançar o que sobrar fora dele.
    const canvas = buildScreenCanvas(
      image,
      width,
      height,
      width,
      height,
      MAX_TEXTURE_SIZE,
    );
    const next = sourceTexture.clone();

    next.image = canvas;
    configureScreenTexture(next, flipY);
    next.minFilter = THREE.LinearMipmapLinearFilter;
    next.needsUpdate = true;

    return { size: { height, width }, texture: next };
  }, [flipY, sourceTexture]);

  useEffect(() => {
    if (texture.texture !== sourceTexture) {
      return () => texture.texture.dispose();
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
type VideoScreenState = {
  size: { height: number; width: number };
  texture: THREE.VideoTexture;
  transfer: HdrTransfer | null;
};

function useVideoScreenTexture(
  key: string | null,
  url: string | null,
  { flipY }: ScreenTextureOptions,
) {
  const [state, setState] = useState<VideoScreenState | null>(null);

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
    function handleSeeked() {
      if (created) {
        created.needsUpdate = true;
      }
    }

    // Só com um quadro decodificado dá para saber a curva (HDR ou não) — e as
    // dimensões, de que o recorte depende, já estão prontas nesse ponto.
    function handleFirstFrame() {
      const next = new THREE.VideoTexture(video);
      const transfer = detectHdrTransfer(video);

      configureScreenTexture(next, flipY);
      // HDR é lido cru pela composição: nenhuma curva aplicada aqui.
      if (transfer) {
        next.colorSpace = THREE.NoColorSpace;
      }
      next.minFilter = THREE.LinearFilter;
      next.generateMipmaps = false;
      next.needsUpdate = true;
      created = next;
      setState({
        size: { height: video.videoHeight, width: video.videoWidth },
        texture: next,
        transfer,
      });
    }

    video.addEventListener("loadeddata", handleFirstFrame, { once: true });
    video.addEventListener("seeked", handleSeeked);
    video.src = url;
    screenVideos.set(key, video);

    return () => {
      video.removeEventListener("loadeddata", handleFirstFrame);
      video.removeEventListener("seeked", handleSeeked);

      if (screenVideos.get(key) === video) {
        screenVideos.delete(key);
        hiddenScreenVideos.delete(key);
      }

      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      created?.dispose();
      setState(null);
    };
  }, [flipY, key, url]);

  return state;
}

type CompositionInput = {
  size: { height: number; width: number };
  texture: THREE.Texture;
  transfer: HdrTransfer | null;
};

/**
 * Desenha a fonte na textura da tela. Recompõe quando algo muda — e, no vídeo,
 * a cada quadro, porque o quadro muda sozinho.
 */
function useScreenComposition(
  input: CompositionInput | null,
  /** A chave do vídeo da tela, ou `null` quando a fonte é imagem. */
  videoKey: string | null,
  fit: ScreenFit | undefined,
  { cropHeight, cropWidth, flipY }: ScreenTextureOptions,
) {
  const renderer = useThree((three) => three.gl);
  const compositor = useMemo(
    () => createScreenCompositor(cropWidth, cropHeight),
    [cropHeight, cropWidth],
  );

  useEffect(() => () => compositor.dispose(), [compositor]);

  const resolvedFit = { ...DEFAULT_SCREEN_FIT, ...fit };
  const layout = input
    ? getScreenLayout(
        input.size.width,
        input.size.height,
        cropWidth,
        cropHeight,
        resolvedFit,
        flipY,
      )
    : null;

  const background = resolvedFit.background;
  const layoutKey = layout ? JSON.stringify(layout) : "";

  // O useFrame lê daqui o estado atual sem se re-inscrever a cada render.
  // Atualizar num efeito (e não no render) também marca a tela para
  // recompor — é o único momento em que uma imagem precisa ser redesenhada.
  const frame = useRef<{
    background: string;
    dirty: boolean;
    input: CompositionInput | null;
    layout: ReturnType<typeof getScreenLayout> | null;
    videoKey: string | null;
  }>({ background, dirty: true, input: null, layout: null, videoKey });

  useEffect(() => {
    frame.current = { background, dirty: true, input, layout, videoKey };
    // `layout` é recriado a cada render; `layoutKey` é o que muda de verdade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [background, compositor, input, layoutKey, videoKey]);

  // Prioridade padrão: roda antes do render da cena, que já vê a tela pronta.
  // Prioridade positiva desligaria o render automático do R3F.
  useFrame(() => {
    const current = frame.current;

    if (!current.input || !current.layout) {
      return;
    }

    if (!current.dirty && current.videoKey === null) {
      return;
    }

    // Fora do clipe: uma área de conteúdo vazia (mínimo depois do máximo)
    // deixa só a cor de fundo.
    const isHidden =
      current.videoKey !== null && hiddenScreenVideos.has(current.videoKey);

    compositor.render(renderer, {
      background: current.background,
      layout: isHidden
        ? { ...current.layout, contentMax: [0, 0], contentMin: [1, 1] }
        : current.layout,
      source: current.input.texture,
      transfer: current.input.transfer,
    });
    current.dirty = false;
  });

  return input ? compositor.texture : null;
}

/**
 * Enquanto o vídeo carrega o primeiro quadro devolve null: o modelo mostra a
 * tela sem textura por um instante, em vez de suspender a cena inteira.
 */
export function useScreenTexture(
  source: ScreenSource,
  options: ScreenTextureOptions,
): THREE.Texture | null {
  const image = useImageScreenTexture(
    source.kind === "image" ? source.url : BLANK_IMAGE,
    options,
  );
  const videoState = useVideoScreenTexture(
    source.kind === "video" ? source.key : null,
    source.kind === "video" ? source.url : null,
    options,
  );
  const isVideo = source.kind === "video";

  const input = useMemo<CompositionInput | null>(() => {
    if (isVideo) {
      return videoState;
    }

    return image.size
      ? { size: image.size, texture: image.texture, transfer: null }
      : null;
  }, [image, isVideo, videoState]);

  return useScreenComposition(
    input,
    source.kind === "video" ? source.key : null,
    source.fit,
    options,
  );
}
