// Tokens de cores para o modelo Smartphone 3D.
//
// Apenas os elementos visíveis ao usuário final são listados aqui.
// Elementos traseiros/ocultos não precisam de token — usam o material original do GLTF.
//
// Quando entrar um novo modelo 3D, criar um arquivo análogo nesta pasta (ex: tablet.ts)
// seguindo a mesma estrutura.

export type SmartphoneThemeName = "gray" | "black" | "light-gray" | "blood";

// Elementos visíveis no modelo Smartphone identificados visualmente.
// O index signature permite atribuição de/para Record<string, string>.
export interface SmartphoneColors {
  [key: string]: string;
  gradientSound: string;
  smartphoneBody: string;
  rightBigSideButton: string;
  leftSmallSideButton: string;
  CircleTopLeft: string;
  CircleTopLeftMiddle: string;
  CircleTopRight: string;
  CircleTopRightMiddle: string;
}

export const SMARTPHONE_DEFAULT_THEME: SmartphoneThemeName = "gray";

// Cores derivadas dos círculos calculadas via lerp 25% para branco da cor do body.
// Os valores estão explícitos aqui para facilitar ajustes finos por tema sem tocar em código.
export const SMARTPHONE_THEMES: Record<SmartphoneThemeName, SmartphoneColors> = {
  gray: {
    gradientSound:       "#000000",
    smartphoneBody:      "#8A8A8E",
    rightBigSideButton:  "#8A8A8E",
    leftSmallSideButton: "#8A8A8E",
    CircleTopLeft:       "#A7A7AA",
    CircleTopLeftMiddle: "#A7A7AA",
    CircleTopRight:      "#A7A7AA",
    CircleTopRightMiddle:"#A7A7AA",
  },
  black: {
    gradientSound:       "#000000",
    smartphoneBody:      "#1C1C1E",
    rightBigSideButton:  "#1C1C1E",
    leftSmallSideButton: "#1C1C1E",
    CircleTopLeft:       "#555556",
    CircleTopLeftMiddle: "#555556",
    CircleTopRight:      "#555556",
    CircleTopRightMiddle:"#555556",
  },
  "light-gray": {
    gradientSound:       "#000000",
    smartphoneBody:      "#d1d1d1",
    rightBigSideButton:  "#d1d1d1",
    leftSmallSideButton: "#d1d1d1",
    CircleTopLeft:       "#DCDCDC",
    CircleTopLeftMiddle: "#DCDCDC",
    CircleTopRight:      "#DCDCDC",
    CircleTopRightMiddle:"#DCDCDC",
  },
  blood: {
    gradientSound:       "#000000",
    smartphoneBody:      "#6a2525",
    rightBigSideButton:  "#6a2525",
    leftSmallSideButton: "#6a2525",
    CircleTopLeft:       "#8F5B5B",
    CircleTopLeftMiddle: "#8F5B5B",
    CircleTopRight:      "#8F5B5B",
    CircleTopRightMiddle:"#8F5B5B",
  },
};

/**
 * Gera SmartphoneColors a partir de uma cor primária livre (color picker).
 * Os círculos são derivados como 25% mais claros, mantendo consistência visual com os temas.
 */
export function buildSmartphoneColorsFromPrimary(hex: string): SmartphoneColors {
  const circle = lerpHexToWhite(hex, 0.25);
  return {
    gradientSound:       "#000000",
    smartphoneBody:      hex,
    rightBigSideButton:  hex,
    leftSmallSideButton: hex,
    CircleTopLeft:       circle,
    CircleTopLeftMiddle: circle,
    CircleTopRight:      circle,
    CircleTopRightMiddle:circle,
  };
}

function lerpHexToWhite(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + t * (255 - r));
  const lg = Math.round(g + t * (255 - g));
  const lb = Math.round(b + t * (255 - b));
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}
