// Tokens de cores do modelo Duo (GLB "iPhone Duo 3D Model", PikkmeStudios).
// Partes semânticas, uma por material do arquivo, de modo que tudo no aparelho
// tenha uma cor editável:
// - body: o vidro das costas, o platô das câmeras e parte dos anéis das lentes
// - frame: a lateral de titânio, a dobradiça, os botões e o resto dos anéis
// - frameHighlight: os filetes polidos do frame
// - grooves: os sulcos escuros em volta do aparelho
// - logo
// - bezel: a moldura preta das duas telas e o furo da câmera da frente
// - lens: o interior das lentes — a cor multiplica a imagem delas

export type DuoThemeName =
  | "star-white"
  | "night-sky"
  | "black"
  | "gray"
  | "blue"
  | "green"
  | "blood"
  | "pink";

export interface DuoColors {
  [key: string]: string;
  body: string;
  frame: string;
  frameHighlight: string;
  grooves: string;
  logo: string;
  bezel: string;
  lens: string;
}

/** O que o aparelho tem de fábrica nas partes que o tema não pinta. */
const FIXED_PARTS = {
  grooves: "#000000",
  bezel: "#050505",
  // Branco não tinge: a lente fica com a imagem do arquivo.
  lens: "#ffffff",
} as const;

export const DUO_DEFAULT_THEME: DuoThemeName = "star-white";

/** Mistura duas cores (#rrggbb), `t` de 0 (só `from`) a 1 (só `to`). */
function mix(from: string, to: string, t: number) {
  const channel = (hex: string, index: number) =>
    parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);

  return `#${[0, 1, 2]
    .map((index) =>
      Math.round(channel(from, index) + (channel(to, index) - channel(from, index)) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * As partes a partir do corpo e do frame: os filetes seguem a cor do frame
 * (editáveis à parte, mas nascem iguais a ele), e o logo fica um pouco abaixo
 * do corpo, como no aparelho.
 */
function buildDuoTheme(body: string, frame: string): DuoColors {
  return {
    ...FIXED_PARTS,
    body,
    frame,
    frameHighlight: frame,
    logo: mix(body, "#000000", 0.08),
  };
}

// As duas cores em que o aparelho é vendido vêm primeiro: Star White são as
// cores do próprio arquivo e Night Sky foi tirada das fotos do aparelho. As
// outras seguem a paleta dos demais dispositivos, mais azul, verde e rosa.
export const DUO_THEMES: Record<DuoThemeName, DuoColors> = {
  "star-white": {
    ...FIXED_PARTS,
    body: "#efefea",
    frame: "#d6d6d6",
    frameHighlight: "#d6d6d6",
    logo: "#e1e1e1",
  },
  "night-sky": {
    ...FIXED_PARTS,
    body: "#2b3442",
    frame: "#3d4654",
    frameHighlight: "#3d4654",
    logo: "#222a36",
  },
  black: buildDuoTheme("#1c1c1e", "#3a3a3c"),
  gray: buildDuoTheme("#8a8a8e", "#a9a9ad"),
  blue: buildDuoTheme("#3b6a9c", "#5d86b3"),
  green: buildDuoTheme("#456f5a", "#678b76"),
  blood: buildDuoTheme("#8f2a2e", "#a9484c"),
  pink: buildDuoTheme("#d9aeb9", "#e6c6ce"),
};

/** Cor personalizada: o corpo manda, e o metal o acompanha. */
export function buildDuoColorsFromPrimary(hex: string): DuoColors {
  return {
    ...FIXED_PARTS,
    body: hex,
    frame: hex,
    frameHighlight: hex,
    logo: hex,
  };
}
