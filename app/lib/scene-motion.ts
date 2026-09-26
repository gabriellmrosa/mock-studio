import type { SceneObject } from "./scene-objects";

/**
 * Motion por objeto: uma lista de keyframes, cada um um retrato dos sete
 * números de transform que o Inspector já edita, preso a um instante da cena.
 *
 * Decisão central: **a pose estática e os keyframes são independentes**. O
 * transform do objeto é a pose estática e só o modo Estático mexe nele; os
 * keyframes guardam cada um o seu transform e só o modo Movimento mexe neles.
 * Um keyframe criado num objeto sem motion nasce como cópia da pose estática e
 * a partir daí segue a própria vida.
 *
 * O tempo é **absoluto** (`timeMs`, contado do início da cena), como numa
 * timeline de editor de vídeo. Arrastar um keyframe, inserir um no meio de um
 * trecho ou deslocar a trilha inteira viram mudanças num número só. O modelo
 * anterior guardava durações relativas por trecho mais um atraso por objeto, e
 * cada uma dessas operações precisava redistribuir durações entre vizinhos.
 * Consequência: não existe mais "atraso de início" — ele é o tempo do primeiro
 * keyframe.
 *
 * A lista vive sempre ordenada por tempo. A suavização de um keyframe vale para
 * o trecho que **chega** nele, então é ignorada no primeiro.
 *
 * Um keyframe sozinho é válido: o objeto fica parado naquela pose durante toda
 * a cena. É o passo intermediário natural de quem cria keyframes na timeline.
 *
 * A câmera não é animada: ela é ferramenta de visualização, e mantê-la fora
 * evita ter que arbitrar precedência com o auto-fit, o "Enquadrar cena" e a
 * pose guardada nos templates.
 */

export const EASING_IDS = [
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
] as const;

export type EasingId = (typeof EASING_IDS)[number];

export const DEFAULT_EASING: EasingId = "ease-in-out";

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
  /** Instante do keyframe em ms, contado do início da cena. */
  timeMs: number;
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

function sortByTime(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
}

export function createKeyframe(
  timeMs: number,
  transform: MotionTransform,
  easing: EasingId = DEFAULT_EASING,
): Keyframe {
  return {
    easing,
    id: crypto.randomUUID(),
    timeMs: Math.max(0, Math.round(timeMs)),
    transform,
  };
}

/** Keyframe que ocupa exatamente este instante, se houver. */
export function findKeyframeAt(
  keyframes: Keyframe[],
  timeMs: number,
): Keyframe | null {
  const rounded = Math.round(timeMs);

  return keyframes.find((keyframe) => keyframe.timeMs === rounded) ?? null;
}

/**
 * Cria um keyframe no instante pedido com a pose que o objeto exibe ali — o
 * valor interpolado, se cair no meio de um trecho, ou a pose estática, se o
 * objeto ainda não tiver motion. Assim criar um keyframe nunca faz o objeto
 * pular. Se já houver um keyframe nesse instante, devolve ele em vez de
 * empilhar dois no mesmo ponto.
 */
export function insertKeyframe(
  object: SceneObject,
  timeMs: number,
): { id: string; keyframes: Keyframe[] } {
  const existing = findKeyframeAt(object.keyframes, timeMs);

  if (existing) {
    return { id: existing.id, keyframes: object.keyframes };
  }

  const transform = sampleMotion(object, timeMs) ?? captureTransform(object);
  const keyframe = createKeyframe(timeMs, { ...transform });

  return {
    id: keyframe.id,
    keyframes: sortByTime([...object.keyframes, keyframe]),
  };
}

/** Pode deixar a lista com um keyframe só ou vazia; ambos são estados válidos. */
export function removeKeyframe(
  keyframes: Keyframe[],
  id: string,
): Keyframe[] {
  return keyframes.filter((keyframe) => keyframe.id !== id);
}

/**
 * Leva um keyframe para outro instante. Ele pode cruzar os vizinhos — é assim
 * que se reordena — e a pose, a suavização e o id viajam junto.
 */
export function moveKeyframeTo(
  keyframes: Keyframe[],
  id: string,
  timeMs: number,
): Keyframe[] {
  return sortByTime(
    keyframes.map((keyframe) =>
      keyframe.id === id
        ? { ...keyframe, timeMs: Math.max(0, Math.round(timeMs)) }
        : keyframe,
    ),
  );
}

/**
 * Desloca a trilha inteira mantendo os intervalos entre os keyframes. Não deixa
 * o primeiro passar do zero, senão os intervalos se deformariam no clamp.
 */
export function shiftKeyframes(
  keyframes: Keyframe[],
  deltaMs: number,
): Keyframe[] {
  const first = keyframes[0]?.timeMs ?? 0;
  const applied = Math.max(-first, Math.round(deltaMs));

  return keyframes.map((keyframe) => ({
    ...keyframe,
    timeMs: keyframe.timeMs + applied,
  }));
}

export function updateKeyframe(
  keyframes: Keyframe[],
  id: string,
  patch: Partial<Omit<Keyframe, "id" | "timeMs">>,
): Keyframe[] {
  return keyframes.map((keyframe) =>
    keyframe.id === id ? { ...keyframe, ...patch } : keyframe,
  );
}

/** Mesmos keyframes com ids novos — para duplicar um objeto sem compartilhar ids. */
export function cloneKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return keyframes.map((keyframe) => ({
    ...keyframe,
    id: crypto.randomUUID(),
    transform: { ...keyframe.transform },
  }));
}

export function hasMotion(object: SceneObject): boolean {
  return object.keyframes.length > 0;
}

/** Instante em que este objeto termina de se mover: o último keyframe. */
export function getObjectMotionEnd(object: SceneObject): number {
  return object.keyframes[object.keyframes.length - 1]?.timeMs ?? 0;
}

/**
 * Duração da cena: o fim do objeto que termina por último. É o fim do
 * playback e, mais adiante, a duração do vídeo exportado.
 */
export function getSceneMotionDuration(objects: SceneObject[]): number {
  return objects.reduce(
    (longest, object) => Math.max(longest, getObjectMotionEnd(object)),
    0,
  );
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
 * Transform do objeto em um instante da cena. Antes do primeiro keyframe segura
 * a pose dele e, depois do último, segura a final — objetos com trilhas mais
 * curtas simplesmente param, em vez de voltar ao começo sozinhos.
 */
export function sampleMotion(
  object: SceneObject,
  timeMs: number,
): MotionTransform | null {
  const { keyframes } = object;

  if (keyframes.length === 0) {
    return null;
  }

  if (timeMs <= keyframes[0].timeMs) {
    return keyframes[0].transform;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const from = keyframes[index - 1];
    const to = keyframes[index];

    if (timeMs <= to.timeMs) {
      const span = to.timeMs - from.timeMs;
      const progress = span === 0 ? 1 : (timeMs - from.timeMs) / span;

      return lerpTransform(
        from.transform,
        to.transform,
        applyEasing(to.easing, progress),
      );
    }
  }

  return keyframes[keyframes.length - 1].transform;
}
