"use client";

// Placeholder de tela gerado em runtime via canvas — substitui os PNGs
// estáticos de public/. Estilo: xadrez sutil + tamanho recomendado centralizado,
// na mesma família tipográfica do corpo da UI (--font-sans).

const CHECKER_LIGHT = "#ffffff";
const CHECKER_DARK = "#f0f0f0";
const TEXT_COLOR = "#9aa0a6";
const FONT_FAMILY = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export function createPlaceholderDataUrl(
  width: number,
  height: number,
  // Fração da altura usada como tamanho da fonte. É por modelo porque a tela
  // de alguns aparelhos (smartwatch, notebook) ocupa uma fração menor do
  // enquadramento, então precisam de um valor maior para o texto renderizado
  // aparecer no mesmo tamanho visual dos demais.
  fontScale = 0.042,
): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const cell = Math.max(8, Math.round(Math.min(width, height) / 22));
    context.fillStyle = CHECKER_LIGHT;
    context.fillRect(0, 0, width, height);
    context.fillStyle = CHECKER_DARK;
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        if ((x / cell + y / cell) % 2 === 0) {
          context.fillRect(x, y, cell, cell);
        }
      }
    }

    // Proporcional à ALTURA (não ao menor lado): como cada modelo é
    // enquadrado pela altura na cena, isso faz o texto aparecer no mesmo
    // tamanho visual em todos os placeholders, independente do aspecto.
    const fontSize = Math.round(height * fontScale);
    context.fillStyle = TEXT_COLOR;
    context.font = `400 ${fontSize}px ${FONT_FAMILY}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${width}×${height}`, width / 2, height / 2);

    return canvas.toDataURL("image/png");
  } catch {
    // Ambientes sem canvas 2D (SSR, jsdom) caem no sentinel do chamador.
    return null;
  }
}
