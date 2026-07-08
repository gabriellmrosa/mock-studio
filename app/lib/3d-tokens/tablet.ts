// Tokens de cores do modelo Tablet (geometria procedural, sem GLB).
// Partes semânticas: body (casco) e bezel (moldura frontal da tela).

export type TabletThemeName = "gray" | "black" | "light-gray" | "blood";

export interface TabletColors {
  [key: string]: string;
  body: string;
  bezel: string;
}

export const TABLET_DEFAULT_THEME: TabletThemeName = "gray";

export const TABLET_THEMES: Record<TabletThemeName, TabletColors> = {
  gray: buildTabletColorsFromPrimary("#8A8A8E"),
  black: buildTabletColorsFromPrimary("#1C1C1E"),
  "light-gray": buildTabletColorsFromPrimary("#d1d1d1"),
  blood: buildTabletColorsFromPrimary("#6a2525"),
};

export function buildTabletColorsFromPrimary(hex: string): TabletColors {
  return {
    body: hex,
    // A moldura fica sempre quase preta, como o recorte superior dos smartphones,
    // para manter o contraste com a tela em qualquer tema.
    bezel: "#101010",
  };
}
