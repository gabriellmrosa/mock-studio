import {
  getMotionSegment,
  lerpHexColor,
  type Keyframe,
  type MotionTransform,
} from "./scene-motion";
import {
  MAX_SCREEN_PAN,
  MAX_SCREEN_ZOOM,
  MIN_SCREEN_ZOOM,
  type ScreenFit,
  type ScreenId,
} from "./scene-objects";

/**
 * O enquadramento da tela que anima por keyframe: zoom, posição e a cor de
 * fundo. O corte não (decisão do usuário): ele esconde as bordas gravadas no
 * arquivo, é do arquivo e não da cena, e animado a tela "comeria" as bordas
 * no meio da transição.
 *
 * Um keyframe só tem esses campos depois que alguém os edita com ele
 * selecionado. Sem eles, o keyframe vale o enquadramento do arquivo — então,
 * sem keyframe selecionado, o painel da tela continua editando o arquivo e o
 * efeito aparece em todos os keyframes que não têm o seu.
 */
export type AnimatedScreenFit = Pick<ScreenFit, "background" | "panX" | "panY" | "zoom">;

export const ANIMATED_SCREEN_FIT_KEYS = ["background", "panX", "panY", "zoom"] as const;

/** O campo do keyframe de cada tela (o Duo tem duas). */
function fieldOf(screen: ScreenId) {
  return screen === "outer" ? "outerScreenFit" : "screenFit";
}

export function getKeyframeScreenFit(
  transform: MotionTransform,
  screen: ScreenId,
): AnimatedScreenFit | undefined {
  return transform[fieldOf(screen)];
}

/** Se algum keyframe tem enquadramento próprio desta tela. */
export function hasScreenFitMotion(keyframes: Keyframe[], screen: ScreenId) {
  return keyframes.some((keyframe) => getKeyframeScreenFit(keyframe.transform, screen));
}

function pickAnimated(fit: ScreenFit | AnimatedScreenFit): AnimatedScreenFit {
  return { background: fit.background, panX: fit.panX, panY: fit.panY, zoom: fit.zoom };
}

/**
 * O enquadramento da tela num instante: o do arquivo (`base`), com zoom,
 * posição e fundo vindos dos keyframes, deslizando entre eles na curva do
 * trecho. Um keyframe sem enquadramento próprio vale o do arquivo.
 */
export function sampleScreenFit(
  keyframes: Keyframe[],
  timeMs: number,
  screen: ScreenId,
  base: ScreenFit,
): ScreenFit {
  const segment = getMotionSegment(keyframes, timeMs);

  if (!segment) {
    return base;
  }

  const from = getKeyframeScreenFit(segment.from.transform, screen) ?? pickAnimated(base);
  const to = getKeyframeScreenFit(segment.to.transform, screen) ?? pickAnimated(base);
  const t = segment.from === segment.to ? 1 : segment.progress;
  const mix = (a: number, b: number) => a + (b - a) * t;

  return {
    ...base,
    background: lerpHexColor(from.background, to.background, t),
    panX: mix(from.panX, to.panX),
    panY: mix(from.panY, to.panY),
    zoom: mix(from.zoom, to.zoom),
  };
}

/**
 * Um keyframe com o enquadramento da tela mudado: parte do que ele mostra
 * agora (o seu, ou o do arquivo) e aplica só os campos que animam.
 */
export function withKeyframeScreenFit(
  keyframe: Keyframe,
  screen: ScreenId,
  base: ScreenFit,
  patch: Partial<ScreenFit>,
): Keyframe {
  const current = getKeyframeScreenFit(keyframe.transform, screen) ?? pickAnimated(base);
  const next = { ...current };

  for (const key of ANIMATED_SCREEN_FIT_KEYS) {
    if (patch[key] !== undefined) {
      (next as Record<string, unknown>)[key] = patch[key];
    }
  }

  return {
    ...keyframe,
    transform: { ...keyframe.transform, [fieldOf(screen)]: normalizeAnimatedScreenFit(next) },
  };
}

/** Separa o que anima (vai para o keyframe) do que é do arquivo (o corte). */
export function splitScreenFitPatch(patch: Partial<ScreenFit>) {
  const animated: Partial<ScreenFit> = {};
  const file: Partial<ScreenFit> = {};

  for (const [key, value] of Object.entries(patch) as Array<[keyof ScreenFit, never]>) {
    if ((ANIMATED_SCREEN_FIT_KEYS as readonly string[]).includes(key)) {
      animated[key] = value;
    } else {
      file[key] = value;
    }
  }

  return { animated, file };
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Leitura defensiva (template, link): fora do formato, `null`; números no limite. */
export function normalizeAnimatedScreenFit(value: unknown): AnimatedScreenFit | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<AnimatedScreenFit>;
  const isNumber = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

  if (
    !isNumber(input.zoom) ||
    !isNumber(input.panX) ||
    !isNumber(input.panY) ||
    typeof input.background !== "string" ||
    !HEX_COLOR.test(input.background)
  ) {
    return null;
  }

  const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

  return {
    background: input.background.toLowerCase(),
    panX: clamp(input.panX, -MAX_SCREEN_PAN, MAX_SCREEN_PAN),
    panY: clamp(input.panY, -MAX_SCREEN_PAN, MAX_SCREEN_PAN),
    zoom: clamp(input.zoom, MIN_SCREEN_ZOOM, MAX_SCREEN_ZOOM),
  };
}

/**
 * Um keyframe novo no meio de um trecho nasce com o enquadramento que a tela
 * mostra naquele instante (a pose interpolada não o traz), em cada tela que
 * já anima — sem isso, ele voltaria ao do arquivo e a tela daria um pulo.
 */
export function withCapturedScreenFits(
  keyframe: Keyframe,
  keyframes: Keyframe[],
  bases: Partial<Record<ScreenId, ScreenFit>>,
): Keyframe {
  let transform = keyframe.transform;

  for (const screen of ["main", "outer"] as const) {
    const base = bases[screen];

    if (base && !getKeyframeScreenFit(transform, screen) && hasScreenFitMotion(keyframes, screen)) {
      transform = {
        ...transform,
        [fieldOf(screen)]: pickAnimated(sampleScreenFit(keyframes, keyframe.timeMs, screen, base)),
      };
    }
  }

  return transform === keyframe.transform ? keyframe : { ...keyframe, transform };
}

/** Zoom, posição e fundo de uma tela num instante, se ela anima; senão `null`. */
export function sampleAnimatedScreenFit(
  keyframes: Keyframe[],
  timeMs: number,
  screen: ScreenId,
  base: ScreenFit,
): AnimatedScreenFit | null {
  return hasScreenFitMotion(keyframes, screen)
    ? pickAnimated(sampleScreenFit(keyframes, timeMs, screen, base))
    : null;
}
