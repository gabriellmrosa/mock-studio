// Tokens de cores para o modelo Smartwatch 3D.
//
// Partes visíveis identificadas via debug mode:
//   twoSideButtons → Object_2  (dois botões laterais)
//   bandClasp      → Object_3  (presilha da pulseira)
//   oneSideButton  → Object_4  (botão lateral único)
//   body           → Object_5  (casca principal do relógio — cor primária)
//   bandDetails    → Object_6  (detalhes texturais da pulseira)
//   bandBottom     → Object_7  (pulseira parte de baixo)
//   bandDetails2   → Object_8  (detalhes texturais da pulseira 2 — inicia igual a bandDetails)
//   crownDetail    → Object_9  (peça pequena lateral do corpo)
//   bandTop        → Object_10 (pulseira parte de cima)
//   bodyBackground → Object_11 (miolo/bezel interno do corpo)
//
// A textura da tela é aplicada em um plano separado em Smartwatch.tsx.

export type SmartwatchThemeName = "gray" | "black" | "light-gray" | "blood";

export interface SmartwatchColors {
  [key: string]: string;
  twoSideButtons: string;
  bandClasp: string;
  oneSideButton: string;
  body: string;
  bandDetails: string;
  bandBottom: string;
  bandDetails2: string;
  crownDetail: string;
  bandTop: string;
  bodyBackground: string;
}

export const SMARTWATCH_DEFAULT_THEME: SmartwatchThemeName = "gray";

// body, bandTop, bandBottom, bandDetails e bandDetails2 recebem a cor primária.
// bodyBackground também segue a primária para manter o casco fechado.
// botões, bandClasp e crownDetail usam um tom mais escuro para manter contraste.
export const SMARTWATCH_THEMES: Record<SmartwatchThemeName, SmartwatchColors> = {
  gray: {
    body:           "#8A8A8E",
    twoSideButtons: "#6E6E72",
    oneSideButton:  "#6E6E72",
    bandClasp:      "#6E6E72",
    crownDetail:    "#6E6E72",
    bandTop:        "#8A8A8E",
    bandBottom:     "#8A8A8E",
    bandDetails:    "#8A8A8E",
    bandDetails2:   "#8A8A8E",
    bodyBackground: "#8A8A8E",
  },
  black: {
    body:           "#1C1C1E",
    twoSideButtons: "#111113",
    oneSideButton:  "#111113",
    bandClasp:      "#111113",
    crownDetail:    "#111113",
    bandTop:        "#1C1C1E",
    bandBottom:     "#1C1C1E",
    bandDetails:    "#1C1C1E",
    bandDetails2:   "#1C1C1E",
    bodyBackground: "#1C1C1E",
  },
  "light-gray": {
    body:           "#d1d1d1",
    twoSideButtons: "#b8b8b8",
    oneSideButton:  "#b8b8b8",
    bandClasp:      "#b8b8b8",
    crownDetail:    "#b8b8b8",
    bandTop:        "#d1d1d1",
    bandBottom:     "#d1d1d1",
    bandDetails:    "#d1d1d1",
    bandDetails2:   "#d1d1d1",
    bodyBackground: "#d1d1d1",
  },
  blood: {
    body:           "#6a2525",
    twoSideButtons: "#521c1c",
    oneSideButton:  "#521c1c",
    bandClasp:      "#521c1c",
    crownDetail:    "#521c1c",
    bandTop:        "#6a2525",
    bandBottom:     "#6a2525",
    bandDetails:    "#6a2525",
    bandDetails2:   "#6a2525",
    bodyBackground: "#6a2525",
  },
};

/**
 * Gera SmartwatchColors a partir de uma cor primária livre (color picker).
 * body, bodyBackground, bandTop, bandBottom, bandDetails e bandDetails2 = primária.
 * botões, bandClasp e crownDetail = 10% mais escuros.
 */
export function buildSmartwatchColorsFromPrimary(hex: string): SmartwatchColors {
  const darker = lerpHexToBlack(hex, 0.1);
  return {
    body:           hex,
    twoSideButtons: darker,
    oneSideButton:  darker,
    bandClasp:      darker,
    crownDetail:    darker,
    bandTop:        hex,
    bandBottom:     hex,
    bandDetails:    hex,
    bandDetails2:   hex,
    bodyBackground: hex,
  };
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
