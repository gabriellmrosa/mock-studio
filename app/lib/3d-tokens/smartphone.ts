// Tokens de cores do modelo Smartphone (variante sem notch — GLB do iPhone).
// Estrutura espelhada no Smartphone 2; as partes têm os mesmos nomes semânticos.

export type SmartphoneThemeName = "gray" | "black" | "light-gray" | "blood";

export interface SmartphoneColors {
  [key: string]: string;
  body: string;
  sideCuts: string;
  topCutout: string;
  frame: string;
  rearInset: string;
  cameraMicroPart: string;
  cameraBlock: string;
  cameraBlockInner: string;
  cameraLensHighlight: string;
  cameraSideDetail: string;
}

export const SMARTPHONE_DEFAULT_THEME: SmartphoneThemeName = "gray";

export const SMARTPHONE_THEMES: Record<
  SmartphoneThemeName,
  SmartphoneColors
> = {
  gray: buildSmartphoneColorsFromPrimary("#8A8A8E"),
  black: buildSmartphoneColorsFromPrimary("#1C1C1E"),
  "light-gray": buildSmartphoneColorsFromPrimary("#d1d1d1"),
  blood: buildSmartphoneColorsFromPrimary("#6a2525"),
};

export function buildSmartphoneColorsFromPrimary(
  hex: string,
): SmartphoneColors {
  return {
    body: hex,
    sideCuts: hex,
    topCutout: "#000000",
    frame: lerpHexToBlack(hex, 0.18),
    rearInset: lerpHexToBlack(hex, 0.08),
    cameraMicroPart: lerpHexToBlack(hex, 0.22),
    cameraBlock: lerpHexToBlack(hex, 0.1),
    cameraBlockInner: lerpHexToBlack(hex, 0.16),
    cameraLensHighlight: lerpHexToWhite(hex, 0.28),
    cameraSideDetail: lerpHexToBlack(hex, 0.2),
  };
}

function lerpHexToWhite(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return toHex(
    Math.round(r + t * (255 - r)),
    Math.round(g + t * (255 - g)),
    Math.round(b + t * (255 - b)),
  );
}

function lerpHexToBlack(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return toHex(
    Math.round(r * (1 - t)),
    Math.round(g * (1 - t)),
    Math.round(b * (1 - t)),
  );
}

function toHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
