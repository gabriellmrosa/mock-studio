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

function getCoverCrop(
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
    throw new Error("Nao foi possivel preparar a textura da tela.");
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

      reject(new Error("Nao foi possivel ler a imagem enviada."));
    };
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem enviada."));
    reader.readAsDataURL(file);
  });
}
