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
  "cubic-bezier",
] as const;

export type EasingId = (typeof EASING_IDS)[number];

export const DEFAULT_EASING: EasingId = "ease-in-out";

/** Pontos de controle P1 e P2 da curva, como no `cubic-bezier()` do CSS. */
export type CubicBezier = [x1: number, y1: number, x2: number, y2: number];

/** O `ease` do CSS: ponto de partida neutro ao abrir o editor de curva. */
export const DEFAULT_BEZIER: CubicBezier = [0.25, 0.1, 0.25, 1];

/**
 * Y livre permite overshoot (a curva passa do destino e volta), como no CSS.
 * X fica em [0, 1]: fora disso a curva deixaria de ser uma função do tempo.
 */
export const BEZIER_Y_RANGE = [-0.5, 1.5] as const;

export function clampBezier([x1, y1, x2, y2]: CubicBezier): CubicBezier {
  const clampX = (value: number) => Math.min(1, Math.max(0, value));
  const clampY = (value: number) =>
    Math.min(BEZIER_Y_RANGE[1], Math.max(BEZIER_Y_RANGE[0], value));

  return [clampX(x1), clampY(y1), clampX(x2), clampY(y2)];
}

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
  /** Curva do trecho, quando `easing` é "cubic-bezier". */
  bezier?: CubicBezier;
  /** Suavização do trecho que chega neste keyframe. Ignorada no primeiro. */
  easing: EasingId;
  id: string;
  /** Instante do keyframe em ms, contado do início da cena. */
  timeMs: number;
  transform: MotionTransform;
};

/**
 * Presets em potência de 2 em vez das cubic-bezier do CSS: a diferença é
 * imperceptível no movimento e dispensa resolver bezier a cada quadro. Quem
 * quer uma curva exata escolhe "cubic-bezier".
 */
const EASING_FUNCTIONS: Record<
  Exclude<EasingId, "cubic-bezier">,
  (t: number) => number
> = {
  linear: (t) => t,
  "ease-in": (t) => t * t,
  "ease-out": (t) => 1 - (1 - t) * (1 - t),
  "ease-in-out": (t) =>
    t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
};

/**
 * Progresso da curva no instante `x` (tempo normalizado). A bezier é
 * paramétrica — x(s) e y(s) —, então primeiro acha o `s` cujo x(s) = x:
 * Newton converge em poucas iterações e a bisseção cobre os casos em que a
 * derivada some. É o mesmo método dos navegadores para o `cubic-bezier()`.
 */
export function solveCubicBezier(
  [x1, y1, x2, y2]: CubicBezier,
  x: number,
): number {
  const curve = (a: number, b: number, s: number) =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  const slope = (a: number, b: number, s: number) =>
    3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s * s;

  let s = x;

  for (let i = 0; i < 8; i += 1) {
    const error = curve(x1, x2, s) - x;
    const derivative = slope(x1, x2, s);

    if (Math.abs(error) < 1e-6) {
      return curve(y1, y2, s);
    }

    if (Math.abs(derivative) < 1e-6) {
      break;
    }

    s -= error / derivative;
  }

  let low = 0;
  let high = 1;

  s = x;

  for (let i = 0; i < 40; i += 1) {
    const value = curve(x1, x2, s);

    if (Math.abs(value - x) < 1e-6) {
      break;
    }

    if (value < x) {
      low = s;
    } else {
      high = s;
    }

    s = (low + high) / 2;
  }

  return curve(y1, y2, s);
}

export function applyEasing(
  easing: EasingId,
  t: number,
  bezier: CubicBezier = DEFAULT_BEZIER,
): number {
  const clamped = Math.min(1, Math.max(0, t));

  // As pontas são exatas em qualquer curva: sem isso, o solver devolveria
  // 0,9999… e o objeto nunca chegaria de fato ao keyframe.
  if (clamped === 0 || clamped === 1) {
    return clamped;
  }

  return easing === "cubic-bezier"
    ? solveCubicBezier(bezier, clamped)
    : EASING_FUNCTIONS[easing](clamped);
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
    ...(keyframe.bezier ? { bezier: [...keyframe.bezier] as CubicBezier } : {}),
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
        applyEasing(to.easing, progress, to.bezier),
      );
    }
  }

  return keyframes[keyframes.length - 1].transform;
}
