import { lerpHexColor } from "./scene-motion";

/**
 * As linhas do chão do canvas. Hoje valem para a cena inteira, como a cor de
 * fundo: a cor (ou `null`, "automática", que acompanha o fundo) e a
 * opacidade. Como as linhas só saem na exportação com fundo, é uma escolha de
 * quem entrega o resultado, e não só de quem edita.
 */
export type CanvasGrid = {
  /** `null`: automática — clara no fundo escuro e escura no claro. */
  color: string | null;
  /** 0 a 1; 0 esconde a grade. */
  opacity: number;
};

export const DEFAULT_CANVAS_GRID: CanvasGrid = { color: null, opacity: 1 };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Leitura defensiva (template, link): fora do formato, o padrão. */
export function normalizeCanvasGrid(value: unknown): CanvasGrid {
  const input = (value && typeof value === "object" ? value : {}) as Partial<CanvasGrid>;
  const opacity =
    typeof input.opacity === "number" && Number.isFinite(input.opacity)
      ? Math.min(1, Math.max(0, input.opacity))
      : DEFAULT_CANVAS_GRID.opacity;

  return {
    color:
      typeof input.color === "string" && HEX_COLOR.test(input.color)
        ? input.color.toLowerCase()
        : null,
    opacity,
  };
}

export function isDefaultCanvasGrid(grid: CanvasGrid) {
  return grid.color === DEFAULT_CANVAS_GRID.color && grid.opacity === DEFAULT_CANVAS_GRID.opacity;
}

/**
 * As cores das linhas — a das casas pequenas e a das seções (a cada 4 casas) —
 * já com a opacidade. O desenho da grade (drei) não tem opacidade própria, e o
 * que há atrás dela é o fundo: então a opacidade é a mistura da linha com o
 * fundo. Com um fundo liso é exato; sobre o degradê do palco, uma aproximação.
 */
export function getGridLineColors(backgroundHex: string, grid: CanvasGrid) {
  const red = parseInt(backgroundHex.slice(1, 3), 16);
  const green = parseInt(backgroundHex.slice(3, 5), 16);
  const blue = parseInt(backgroundHex.slice(5, 7), 16);
  const isLight = (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.5;

  const lines = grid.color
    ? // A cor escolhida é a das seções; as casas, a meio caminho do fundo.
      { cell: lerpHexColor(backgroundHex, grid.color, 0.5), section: grid.color }
    : isLight
      ? { cell: "#888888", section: "#555555" }
      : { cell: "#555555", section: "#888888" };

  return {
    cell: lerpHexColor(backgroundHex, lines.cell, grid.opacity),
    section: lerpHexColor(backgroundHex, lines.section, grid.opacity),
  };
}
