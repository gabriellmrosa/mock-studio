// Tokens de cores do modelo Duo (GLB "iPhone Duo 3D Model", PikkmeStudios).
// Partes semânticas, uma por material colorido do arquivo: body (o vidro das
// costas, o platô das câmeras e o topo dos anéis das lentes), frame (a
// lateral de titânio, os botões e a lombada), frameHighlight (os filetes
// polidos do frame) e logo.

export type DuoThemeName = "star-white" | "night-sky";

export interface DuoColors {
  [key: string]: string;
  body: string;
  frame: string;
  frameHighlight: string;
  logo: string;
}

export const DUO_DEFAULT_THEME: DuoThemeName = "star-white";

// As duas cores em que o aparelho é vendido. Star White são as cores do
// próprio arquivo; Night Sky foi tirada das fotos do aparelho.
export const DUO_THEMES: Record<DuoThemeName, DuoColors> = {
  "star-white": {
    body: "#efefea",
    frame: "#d6d6d6",
    frameHighlight: "#ffffff",
    logo: "#e1e1e1",
  },
  "night-sky": {
    body: "#2b3442",
    frame: "#3d4654",
    frameHighlight: "#5a6577",
    logo: "#222a36",
  },
};

/** Cor personalizada: o corpo manda, e o metal o acompanha. */
export function buildDuoColorsFromPrimary(hex: string): DuoColors {
  return {
    body: hex,
    frame: hex,
    frameHighlight: hex,
    logo: hex,
  };
}
