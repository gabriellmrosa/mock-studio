"use client";

export const SCREEN_WIDTH = 220;
export const SCREEN_HEIGHT = 470;
export const MAX_TEXTURE_SIZE = 2048;

type CropArea = {
  srcX: number;
  srcY: number;
  srcW: number;
  srcH: number;
};

export function getCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CropArea {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;

  if (sourceRatio > targetRatio) {
    const srcW = sourceHeight * targetRatio;
    return {
      srcX: (sourceWidth - srcW) / 2,
      srcY: 0,
      srcW,
      srcH: sourceHeight,
    };
  }

  const srcH = sourceWidth / targetRatio;
  return {
    srcX: 0,
    srcY: (sourceHeight - srcH) / 2,
    srcW: sourceWidth,
    srcH,
  };
}

export function buildScreenCanvas(
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth = SCREEN_WIDTH,
  targetHeight = SCREEN_HEIGHT,
  maxOutputSize = MAX_TEXTURE_SIZE,
) {
  const crop = getCoverCrop(
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
  );
  const scale = Math.min(1, maxOutputSize / Math.max(crop.srcW, crop.srcH));
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(crop.srcW * scale));
  canvas.height = Math.max(1, Math.round(crop.srcH * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Não foi possível preparar a textura da tela.");
  }

  context.drawImage(
    image,
    crop.srcX,
    crop.srcY,
    crop.srcW,
    crop.srcH,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas;
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Não foi possível ler a imagem enviada."));
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem enviada."));
    reader.readAsDataURL(file);
  });
}

/**
 * Confere se o navegador consegue mostrar a imagem antes de aceitá-la.
 *
 * Sem isto, qualquer arquivo virava data URL e só falhava dentro do canvas,
 * ao carregar a textura — e o erro derrubava o app inteiro (um HEIC no
 * Chrome, por exemplo). Nem a extensão nem o `type` do arquivo servem de
 * prova: os dois vêm do sistema, e o `accept` do input é só uma sugestão ao
 * seletor. O teste confiável é decodificar com o mesmo caminho da textura, um
 * `<img>` (o `TextureLoader` usa um): o que passar aqui a tela consegue
 * mostrar. Isso também acompanha o navegador sem lista de formatos para
 * manter — o Safari abre HEIC, e AVIF passa em todos os atuais.
 */
export async function probeImageFile(file: File) {
  const url = URL.createObjectURL(file);
  const image = new Image();

  try {
    image.src = url;
    await image.decode();

    // Um SVG sem tamanho decodifica com 0×0 e não vira textura.
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("A imagem não tem tamanho.");
    }
  } catch {
    throw new Error("O navegador não decodifica esta imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Tempo máximo para o navegador decodificar o primeiro quadro do vídeo. */
const VIDEO_PROBE_TIMEOUT_MS = 10000;

/**
 * Confere se o navegador consegue mostrar o vídeo antes de aceitá-lo.
 * `canPlayType` não serve: no Chrome do Mac ele responde "" para HEVC e o
 * vídeo toca mesmo assim, via decodificação por hardware — e em outra máquina
 * a mesma resposta pode ser verdade. O teste confiável é decodificar o
 * primeiro quadro, exigindo largura: um vídeo sem suporte pode carregar só a
 * trilha de áudio.
 */
export function probeVideoFile(file: File) {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");

  video.muted = true;
  video.preload = "auto";

  return new Promise<{ durationMs: number; url: string }>((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => fail(new Error("Tempo esgotado ao ler o vídeo.")),
      VIDEO_PROBE_TIMEOUT_MS,
    );

    function cleanup() {
      window.clearTimeout(timeoutId);
      video.removeAttribute("src");
      video.load();
    }

    function fail(error: Error) {
      cleanup();
      URL.revokeObjectURL(url);
      reject(error);
    }

    video.addEventListener(
      "loadeddata",
      () => {
        if (!video.videoWidth || !Number.isFinite(video.duration)) {
          fail(new Error("O navegador não decodifica este vídeo."));
          return;
        }

        const durationMs = Math.round(video.duration * 1000);

        cleanup();
        resolve({ durationMs, url });
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => fail(new Error("O navegador não decodifica este vídeo.")),
      { once: true },
    );
    video.src = url;
  });
}
