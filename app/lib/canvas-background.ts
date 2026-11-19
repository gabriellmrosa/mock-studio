import { lerpHexColor } from "./scene-motion";

/**
 * O estilo do fundo do canvas. "floor" é o de sempre: uma cor e as linhas do
 * chão em perspectiva (`canvas-grid.ts`). "flat" é um fundo liso, sem chão:
 * a mesma cor, ou um degradê linear dela até uma segunda.
 *
 * A primeira cor continua sendo a cor de fundo da cena (`backgroundColor`):
 * trocar de estilo não perde a cor escolhida. As linhas não existem no liso:
 * a opacidade delas é uma mistura com a cor de trás (`getGridLineColors`), que
 * só é exata sobre uma cor lisa — e um chão sobre um degradê chapado não faz
 * sentido de qualquer jeito (decisão do usuário).
 */
export type CanvasBackgroundStyle = "floor" | "flat";

export type CanvasGradient = {
  /** Em graus, como no CSS: 0 vai para cima, 90 para a direita, 180 para baixo. */
  angle: number;
  /** A cor de chegada; a de partida é a cor de fundo da cena. */
  color: string;
};

export type CanvasBackground = {
  /** Só vale no liso; `null` é cor sólida. */
  gradient: CanvasGradient | null;
  style: CanvasBackgroundStyle;
};

export const DEFAULT_CANVAS_BACKGROUND: CanvasBackground = {
  gradient: null,
  style: "floor",
};

/** De cima para baixo: o degradê que um fundo de cena costuma ter. */
export const DEFAULT_GRADIENT_ANGLE = 180;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Leitura defensiva (template, link): fora do formato, o padrão. */
export function normalizeCanvasBackground(value: unknown): CanvasBackground {
  const input = (value && typeof value === "object" ? value : {}) as Partial<{
    gradient: Partial<CanvasGradient> | null;
    style: unknown;
  }>;
  const style: CanvasBackgroundStyle = input.style === "flat" ? "flat" : "floor";
  const gradient = input.gradient;
  const isGradient =
    style === "flat" &&
    gradient &&
    typeof gradient === "object" &&
    typeof gradient.color === "string" &&
    HEX_COLOR.test(gradient.color) &&
    typeof gradient.angle === "number" &&
    Number.isFinite(gradient.angle);

  return {
    gradient: isGradient
      ? {
          angle: normalizeAngle(gradient.angle as number),
          color: (gradient.color as string).toLowerCase(),
        }
      : null,
    style,
  };
}

/** 0 a 360: o campo do ângulo e o CSS concordam, e 360 não vira 0. */
export function normalizeAngle(angle: number) {
  return angle < 0 || angle > 360 ? ((angle % 360) + 360) % 360 : angle;
}

/**
 * O que um campo do painel muda, a partir do fundo de agora. O degradê se
 * mescla campo a campo: o seletor de cor é memoizado e chama um `onChange` de
 * um render antigo, então quem muda só a cor não pode trazer junto o ângulo
 * daquele render (desfaria um ângulo mudado depois).
 */
export type CanvasBackgroundPatch = {
  gradient?: Partial<CanvasGradient> | null;
  style?: CanvasBackgroundStyle;
};

export function mergeCanvasBackground(
  current: CanvasBackground,
  patch: CanvasBackgroundPatch,
): CanvasBackground {
  const gradient =
    patch.gradient === undefined
      ? current.gradient
      : patch.gradient === null
        ? null
        : { ...current.gradient, ...patch.gradient };

  return normalizeCanvasBackground({ gradient, style: patch.style ?? current.style });
}

/**
 * A segunda cor de um degradê recém-ligado: a primeira mais escura (ou mais
 * clara, se ela já é escura) — um degradê que aparece, sem pedir uma escolha.
 */
export function getDefaultGradientColor(color: string) {
  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);
  const isLight = (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.5;

  return lerpHexColor(color, isLight ? "#000000" : "#ffffff", 0.3);
}

/**
 * O que guardar (template, link, impressão digital das alterações): nada no
 * chão — o degradê de um liso abandonado não aparece e não deve contar como
 * alteração —, e o liso como está.
 */
export function toStoredCanvasBackground(
  background: CanvasBackground,
): CanvasBackground | null {
  return background.style === "flat"
    ? { gradient: background.gradient ? { ...background.gradient } : null, style: "flat" }
    : null;
}

/** As linhas do chão só existem no estilo chão. */
export function hasFloorGrid(background: CanvasBackground) {
  return background.style === "floor";
}

/** O degradê em uso, se houver: só no liso. */
export function getActiveGradient(background: CanvasBackground) {
  return background.style === "flat" ? background.gradient : null;
}

/** O fundo como CSS: a cor, ou o degradê dela até a segunda. */
export function getCanvasBackgroundCss(color: string, background: CanvasBackground) {
  const gradient = getActiveGradient(background);

  return gradient
    ? `linear-gradient(${gradient.angle}deg, ${color}, ${gradient.color})`
    : color;
}

/**
 * A linha do degradê num retângulo, do jeito do CSS: passa pelo centro, no
 * ângulo dado, e é longa o bastante para os cantos opostos caírem exatamente
 * nas duas pontas (comprimento |l·sen θ| + |a·cos θ|). Com ela o degradê
 * exportado sai igual ao `linear-gradient` do editor em qualquer proporção.
 */
export function getGradientLine(width: number, height: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  // O y da tela cresce para baixo, e 0° do CSS aponta para cima.
  const dy = -Math.cos(radians);
  const half =
    (Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians))) / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  return {
    x0: centerX - dx * half,
    x1: centerX + dx * half,
    y0: centerY - dy * half,
    y1: centerY + dy * half,
  };
}

/** Pinta o fundo num canvas 2D, para a exportação compor a cena por cima. */
export function paintCanvasBackground(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  background: CanvasBackground,
) {
  const gradient = getActiveGradient(background);

  if (gradient) {
    const line = getGradientLine(width, height, gradient.angle);
    const fill = context.createLinearGradient(line.x0, line.y0, line.x1, line.y1);

    fill.addColorStop(0, color);
    fill.addColorStop(1, gradient.color);
    context.fillStyle = fill;
  } else {
    context.fillStyle = color;
  }

  context.fillRect(0, 0, width, height);
}
