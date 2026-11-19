import {
  getGridLineColors,
  normalizeCanvasGrid,
  type CanvasGrid,
} from "./canvas-grid";
import type { UiTheme } from "./i18n";
import { getMotionSegment, lerpHexColor, type Keyframe } from "./scene-motion";

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

/**
 * A cor de fundo quando a cena não escolheu uma: a do palco de cada tema. É a
 * que o PNG e o vídeo levam e a que um keyframe do Fundo captura.
 */
export const DEFAULT_CANVAS_COLOR: Record<UiTheme, string> = {
  dark: "#2e2b28",
  light: "#f2ebe0",
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
  // A grade não entra na pintura: ela é desenhada na cena.
  paintBackgroundLook(
    context,
    width,
    height,
    getBackgroundLook({ ...background, color, grid: { color: null, opacity: 0 } }),
  );
}

/**
 * O fundo inteiro de um instante, como um keyframe do Fundo o guarda: o
 * estilo, a cor, o degradê (só no liso) e a grade (só no chão). É o que o
 * painel edita — a cor aqui é sempre uma cor de fato, nunca a automática.
 */
export type BackgroundPose = CanvasBackground & {
  color: string;
  grid: CanvasGrid;
};

/** Leitura defensiva de um keyframe do Fundo (template, link). */
export function normalizeBackgroundPose(value: unknown): BackgroundPose | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<BackgroundPose>;

  if (typeof input.color !== "string" || !HEX_COLOR.test(input.color)) {
    return null;
  }

  return {
    ...normalizeCanvasBackground(input),
    color: input.color.toLowerCase(),
    grid: normalizeCanvasGrid(input.grid),
  };
}

export type BackgroundPosePatch = CanvasBackgroundPatch & {
  color?: string;
  grid?: Partial<CanvasGrid>;
};

/** O que um campo do painel muda num fundo inteiro (ver `mergeCanvasBackground`). */
export function mergeBackgroundPose(
  current: BackgroundPose,
  patch: BackgroundPosePatch,
): BackgroundPose {
  return {
    ...mergeCanvasBackground(current, patch),
    color: patch.color ?? current.color,
    grid: normalizeCanvasGrid({ ...current.grid, ...patch.grid }),
  };
}

/**
 * O que se vê de um fundo, em números que dá para misturar: a cor de cima, a
 * de chegada (igual à de cima é cor lisa), o ângulo e as linhas do chão já
 * misturadas com o fundo, com a opacidade (0 é sem chão). Um liso é um chão de
 * linhas na cor do fundo, com opacidade 0 — por isso ir de um estilo ao outro
 * vira uma dissolução, e não um corte: as linhas somem enquanto as cores
 * deslizam (decisão do usuário).
 */
export type BackgroundLook = {
  angle: number;
  color: string;
  endColor: string;
  grid: { cell: string; opacity: number; section: string };
};

export function getBackgroundLook(pose: BackgroundPose): BackgroundLook {
  const gradient = getActiveGradient(pose);
  const lines =
    pose.style === "floor"
      ? { ...getGridLineColors(pose.color, pose.grid), opacity: pose.grid.opacity }
      : { cell: pose.color, opacity: 0, section: pose.color };

  return {
    angle: gradient?.angle ?? DEFAULT_GRADIENT_ANGLE,
    color: pose.color,
    endColor: gradient?.color ?? pose.color,
    grid: lines,
  };
}

function isSolidLook(look: BackgroundLook) {
  return look.endColor === look.color;
}

export function lerpBackgroundLook(
  from: BackgroundLook,
  to: BackgroundLook,
  t: number,
): BackgroundLook {
  // De uma cor lisa para um degradê, o degradê já nasce no ângulo dele: girar
  // o ângulo de um fundo liso não se vê, e só faria o degradê chegar girando.
  const fromAngle = isSolidLook(from) ? to.angle : from.angle;
  const toAngle = isSolidLook(to) ? from.angle : to.angle;
  const mix = (a: number, b: number) => a + (b - a) * t;

  return {
    angle: mix(fromAngle, toAngle),
    color: lerpHexColor(from.color, to.color, t),
    endColor: lerpHexColor(from.endColor, to.endColor, t),
    grid: {
      cell: lerpHexColor(from.grid.cell, to.grid.cell, t),
      opacity: mix(from.grid.opacity, to.grid.opacity),
      section: lerpHexColor(from.grid.section, to.grid.section, t),
    },
  };
}

/**
 * O fundo de um instante pelos keyframes do Fundo, com a curva de cada trecho.
 * `null` sem keyframes (ou sem fundo neles): vale o fundo da cena.
 */
export function sampleBackgroundLook(
  keyframes: Keyframe[],
  timeMs: number,
): BackgroundLook | null {
  const segment = getMotionSegment(keyframes, timeMs);
  const from = segment?.from.transform.background;
  const to = segment?.to.transform.background;

  if (!segment || !from || !to) {
    return null;
  }

  return segment.from === segment.to
    ? getBackgroundLook(to)
    : lerpBackgroundLook(getBackgroundLook(from), getBackgroundLook(to), segment.progress);
}

/** O visual como CSS: a cor, ou o degradê. */
export function getBackgroundLookCss(look: BackgroundLook) {
  return isSolidLook(look)
    ? look.color
    : `linear-gradient(${look.angle}deg, ${look.color}, ${look.endColor})`;
}

/** Se o visual precisa ser pintado (degradê) em vez de ser a cor de limpeza. */
export function isGradientLook(look: BackgroundLook) {
  return !isSolidLook(look);
}

/** Pinta o visual num canvas 2D, para a exportação compor a cena por cima. */
export function paintBackgroundLook(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  look: BackgroundLook,
) {
  if (isSolidLook(look)) {
    context.fillStyle = look.color;
  } else {
    const line = getGradientLine(width, height, look.angle);
    const fill = context.createLinearGradient(line.x0, line.y0, line.x1, line.y1);

    fill.addColorStop(0, look.color);
    fill.addColorStop(1, look.endColor);
    context.fillStyle = fill;
  }

  context.fillRect(0, 0, width, height);
}

/**
 * O fundo que a cena mostra num instante: o dos keyframes do Fundo, se houver
 * (só no Vídeo, com um instante), senão o fundo da cena.
 */
export function getSceneBackgroundLook(
  keyframes: Keyframe[],
  sceneLook: BackgroundLook,
  timeMs: number | null,
): BackgroundLook {
  return (timeMs !== null ? sampleBackgroundLook(keyframes, timeMs) : null) ?? sceneLook;
}
