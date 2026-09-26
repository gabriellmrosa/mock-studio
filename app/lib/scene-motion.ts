import type { SceneObject } from "./scene-objects";

/**
 * Motion por objeto: uma lista curta de keyframes, cada um um retrato dos sete
 * números de transform que o Inspector já edita.
 *
 * Decisão central: **as abas Static e Motion são independentes**. O transform
 * do objeto é a pose estática e só a aba Static mexe nele; os keyframes guardam
 * cada um o seu transform e só a aba Motion mexe neles. O primeiro keyframe
 * nasce como cópia da pose estática e a partir daí segue a própria vida.
 *
 * Tratar o primeiro keyframe como um apelido para a pose estática parecia
 * economizar estado, mas acoplava as abas: reordenar keyframes reescrevia o
 * Static, e editar o keyframe 1 mudava o objeto parado.
 *
 * A câmera não é animada: ela é ferramenta de visualização, e mantê-la fora
 * evita ter que arbitrar precedência com o auto-fit, o "Enquadrar cena" e a
 * pose guardada nos templates.
 */

export const MAX_KEYFRAMES = 4;
export const DEFAULT_SEGMENT_MS = 800;
export const MIN_SEGMENT_MS = 100;
export const MAX_SEGMENT_MS = 10000;

export const EASING_IDS = [
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
] as const;

export type EasingId = (typeof EASING_IDS)[number];

export type MotionTransform = {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
};

export type Keyframe = {
  /** Suavização do trecho que chega neste keyframe. Ignorada no primeiro. */
  easing: EasingId;
  id: string;
  /** Duração em ms do trecho que chega neste keyframe. Ignorada no primeiro. */
  durationMs: number;
  transform: MotionTransform;
};

/**
 * Curvas em potência de 2 em vez das cubic-bezier do CSS: a diferença é
 * imperceptível no movimento e dispensa resolver bezier a cada quadro.
 */
const EASING_FUNCTIONS: Record<EasingId, (t: number) => number> = {
  linear: (t) => t,
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) =>
    t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
};

export function applyEasing(easing: EasingId, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));

  return EASING_FUNCTIONS[easing](clamped);
}

export function captureTransform(object: SceneObject): MotionTransform {
  return {
    positionX: object.positionX,
    positionY: object.positionY,
    positionZ: object.positionZ,
    rotationX: object.rotationX,
    rotationY: object.rotationY,
    rotationZ: object.rotationZ,
    scale: object.scale,
  };
}

/** Transform de um keyframe, caindo para a pose estática se o índice não existir. */
export function resolveKeyframeTransform(
  object: SceneObject,
  index: number,
): MotionTransform {
  return object.keyframes[index]?.transform ?? captureTransform(object);
}

export function createKeyframe(
  transform: MotionTransform,
  overrides: Partial<Omit<Keyframe, "id" | "transform">> = {},
): Keyframe {
  return {
    durationMs: overrides.durationMs ?? DEFAULT_SEGMENT_MS,
    easing: overrides.easing ?? "ease-in-out",
    id: crypto.randomUUID(),
    transform,
  };
}

/**
 * Liga o motion do objeto. Os dois keyframes nascem copiando a pose estática —
 * um ponto só não é animação, então já entra um trecho editável.
 */
export function startMotion(object: SceneObject): Keyframe[] {
  if (object.keyframes.length > 0) {
    return object.keyframes;
  }

  const resting = captureTransform(object);

  return [createKeyframe({ ...resting }), createKeyframe({ ...resting })];
}

export function addKeyframe(object: SceneObject): Keyframe[] {
  if (object.keyframes.length >= MAX_KEYFRAMES) {
    return object.keyframes;
  }

  const last = object.keyframes[object.keyframes.length - 1];
  const transform = last?.transform ?? captureTransform(object);

  return [...object.keyframes, createKeyframe({ ...transform })];
}

/**
 * Remover deixa no máximo um keyframe sozinho; nesse caso o motion é desligado
 * por inteiro, já que um ponto só não é animação.
 */
export function removeKeyframe(
  keyframes: Keyframe[],
  id: string,
): Keyframe[] {
  const next = keyframes.filter((keyframe) => keyframe.id !== id);

  return next.length < 2 ? [] : next;
}

/**
 * Troca um keyframe de lugar com o vizinho. Como cada keyframe carrega o
 * próprio transform, isso é uma troca pura no array — e nada acontece com a
 * pose estática do objeto.
 *
 * Duração e suavização viajam junto com o keyframe, não ficam presas ao slot:
 * "este keyframe leva 1,2s para ser alcançado" é propriedade da pose.
 */
export function moveKeyframe(
  keyframes: Keyframe[],
  id: string,
  direction: -1 | 1,
): Keyframe[] | null {
  const index = keyframes.findIndex((keyframe) => keyframe.id === id);
  const target = index + direction;

  if (index < 0 || target < 0 || target >= keyframes.length) {
    return null;
  }

  const next = [...keyframes];

  [next[index], next[target]] = [next[target], next[index]];

  return next;
}

export function updateKeyframe(
  keyframes: Keyframe[],
  id: string,
  patch: Partial<Omit<Keyframe, "id">>,
): Keyframe[] {
  return keyframes.map((keyframe) =>
    keyframe.id === id ? { ...keyframe, ...patch } : keyframe,
  );
}

/** Duração total: a soma dos trechos, ignorando o primeiro keyframe. */
export function getMotionDuration(keyframes: Keyframe[]): number {
  return keyframes
    .slice(1)
    .reduce((total, keyframe) => total + keyframe.durationMs, 0);
}

export function hasMotion(object: SceneObject): boolean {
  return object.keyframes.length >= 2;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function lerpTransform(
  from: MotionTransform,
  to: MotionTransform,
  t: number,
): MotionTransform {
  return {
    positionX: lerp(from.positionX, to.positionX, t),
    positionY: lerp(from.positionY, to.positionY, t),
    positionZ: lerp(from.positionZ, to.positionZ, t),
    rotationX: lerp(from.rotationX, to.rotationX, t),
    rotationY: lerp(from.rotationY, to.rotationY, t),
    rotationZ: lerp(from.rotationZ, to.rotationZ, t),
    scale: lerp(from.scale, to.scale, t),
  };
}

/**
 * Transform do objeto em um instante da animação. Antes do início devolve o
 * primeiro keyframe e, depois do fim, segura o último — objetos com timelines
 * mais curtas simplesmente param, em vez de voltar ao começo sozinhos.
 */
export function sampleMotion(
  object: SceneObject,
  timeMs: number,
): MotionTransform | null {
  if (!hasMotion(object)) {
    return null;
  }

  const transforms = object.keyframes.map((keyframe) => keyframe.transform);

  if (timeMs <= 0) {
    return transforms[0];
  }

  let elapsed = 0;

  for (let index = 1; index < object.keyframes.length; index += 1) {
    const keyframe = object.keyframes[index];
    const segmentEnd = elapsed + keyframe.durationMs;

    if (timeMs <= segmentEnd) {
      const progress =
        keyframe.durationMs === 0
          ? 1
          : (timeMs - elapsed) / keyframe.durationMs;

      return lerpTransform(
        transforms[index - 1],
        transforms[index],
        applyEasing(keyframe.easing, progress),
      );
    }

    elapsed = segmentEnd;
  }

  return transforms[transforms.length - 1];
}
