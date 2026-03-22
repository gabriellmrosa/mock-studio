// Tokens de cores para o modelo Smartphone2 3D.
//
// Partes visíveis identificadas via debug mode:
//   sideBody      → Plane008_1 (casca lateral — cor primária)
//   chargingPort  → Plane008_2 (buraco do carregador na base)
//   frontBody     → Plane008_3 (painel frontal — mesma cor que sideBody)
//   sideButtons   → Plane008_5 (botões laterais)
//   speakerGrille → Plane008_8 (grade do speaker na frente, topo)
//
// Partes não visíveis (não fazem parte dos temas):
//   Plane008_4 (black3Part), Plane008_6 (cameraLensPart) — ocultas na cena.
//   Plane008_7 — tela, gerenciada pelo componente.

export type Smartphone2ThemeName = "gray" | "black" | "light-gray" | "blood";

export interface Smartphone2Colors {
  [key: string]: string;
  sideBody: string;
  chargingPort: string;
  frontBody: string;
  sideButtons: string;
  speakerGrille: string;
}

export const SMARTPHONE2_DEFAULT_THEME: Smartphone2ThemeName = "gray";

// sideBody e frontBody têm sempre a mesma cor (cor primária).
// sideButtons acompanha a cor primária com 10% de escurecimento.
// speakerGrille é derivado com 35% de clareamento para manter contraste sutil.
// chargingPort é sempre preto — representa o vão físico do conector.
export const SMARTPHONE2_THEMES: Record<Smartphone2ThemeName, Smartphone2Colors> = {
  gray: {
    sideBody:      "#8A8A8E",
    chargingPort:  "#000000",
    frontBody:     "#8A8A8E",
    sideButtons:   "#6E6E72",
    speakerGrille: "#ABABAE",
  },
  black: {
    sideBody:      "#1C1C1E",
    chargingPort:  "#000000",
    frontBody:     "#1C1C1E",
    sideButtons:   "#111113",
    speakerGrille: "#3A3A3C",
  },
  "light-gray": {
    sideBody:      "#d1d1d1",
    chargingPort:  "#000000",
    frontBody:     "#d1d1d1",
    sideButtons:   "#b8b8b8",
    speakerGrille: "#E2E2E2",
  },
  blood: {
    sideBody:      "#6a2525",
    chargingPort:  "#000000",
    frontBody:     "#6a2525",
    sideButtons:   "#521c1c",
    speakerGrille: "#8F5B5B",
  },
};

/**
 * Gera Smartphone2Colors a partir de uma cor primária livre (color picker).
 * frontBody e sideBody recebem a cor primária.
 * sideButtons escurece 10% em direção ao preto.
 * speakerGrille clareia 35% em direção ao branco.
 * chargingPort é sempre preto.
 */
export function buildSmartphone2ColorsFromPrimary(hex: string): Smartphone2Colors {
  return {
    sideBody:      hex,
    chargingPort:  "#000000",
    frontBody:     hex,
    sideButtons:   lerpHexToBlack(hex, 0.1),
    speakerGrille: lerpHexToWhite(hex, 0.35),
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
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
