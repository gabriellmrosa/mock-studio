import {
  getActiveScreenVideos,
  getScreenVideoClipDuration,
  isCameraObject,
  isDeviceObject,
  isTextObject,
  type SceneObject,
} from "./scene-objects";
import { DEFAULT_CAMERA_ORBIT, lerpOrbit, type CameraOrbit } from "./camera-orbit";
import { DEFAULT_FOLD_ANGLE } from "./scene-presets";
import type { BackgroundPose } from "./canvas-background";

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
  /** 0 a 1. Para um objeto entrar em cena: 0 no primeiro keyframe. */
  opacity: number;
  /**
   * Abertura do dobrável, em graus. Opcional: keyframes de antes dele (em
   * templates salvos) não a têm, e valem aberto.
   */
  foldAngle?: number;
  /**
   * Cor e espaço entre letras do texto, só dele. Opcionais: os keyframes dos
   * aparelhos não os têm, e quem não os tem segura o valor do próprio texto.
   * São os dois campos de estilo que animam sem recompor as quebras de linha
   * (o tamanho, o peso e a largura não: saltariam em vez de deslizar).
   */
  letterSpacing?: number;
  textColor?: string;
  /**
   * A órbita da câmera num keyframe dela; os campos de pose acima ficam nos
   * zeros. Só a câmera o tem (ver `camera-orbit.ts`).
   */
  orbit?: CameraOrbit;
  /**
   * O fundo da cena num keyframe do Fundo (estilo, cores, degradê e grade);
   * os campos de pose acima ficam nos zeros. Só o Fundo o tem. O que se vê
   * entre dois keyframes não sai daqui, e sim de `sampleBackgroundLook`: a
   * dissolução entre estilos não é um fundo que dê para guardar.
   */
  background?: BackgroundPose;
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
    opacity: object.opacity,
    // A abertura é só do dobrável; a cor e o espaço entre letras, só do texto.
    ...(isDeviceObject(object) ? { foldAngle: object.foldAngle } : {}),
    ...(isTextObject(object)
      ? {
          letterSpacing: object.text.letterSpacing,
          textColor: object.text.color,
        }
      : {}),
    // A câmera não tem pose: a órbita dela vem do canvas, não do objeto. Isto é
    // só o ponto de partida se faltar de onde capturar.
    ...(isCameraObject(object) ? { orbit: { ...DEFAULT_CAMERA_ORBIT } } : {}),
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

/**
 * O keyframe vizinho no tempo, antes ou depois, de onde se copia a pose
 * (`copyNeighborPose`). `null` no primeiro (para trás) e no último (para a
 * frente).
 */
export function findNeighborKeyframe(
  keyframes: Keyframe[],
  id: string,
  direction: "previous" | "next",
): Keyframe | null {
  const sorted = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
  const index = sorted.findIndex((keyframe) => keyframe.id === id);

  if (index === -1) {
    return null;
  }

  return sorted[direction === "previous" ? index - 1 : index + 1] ?? null;
}

/**
 * O keyframe fica com a pose do vizinho — posição, rotação, escala, opacidade,
 * e o que mais for pose (a abertura do Duo, a cor do texto, a órbita da
 * câmera). O instante e a curva dele ficam: é o "igual ao anterior" dos
 * editores de animação, para segurar uma pose ou voltar a ela.
 */
export function copyNeighborPose(
  keyframes: Keyframe[],
  id: string,
  direction: "previous" | "next",
): Keyframe[] {
  const neighbor = findNeighborKeyframe(keyframes, id, direction);

  if (!neighbor) {
    return keyframes;
  }

  const { orbit, ...pose } = neighbor.transform;

  return updateKeyframe(keyframes, id, {
    transform: { ...pose, ...(orbit ? { orbit: { ...orbit } } : {}) },
  });
}

/**
 * O instante da cena durante o play: o relógio desde o começo, preso no fim.
 * O play só para um pouco depois do fim (um temporizador com folga), e nesse
 * resto o relógio passa da cena: um clipe que termina junto com ela já
 * contava como acabado, e a tela piscava o fundo antes de parar.
 */
export function getPlaybackTimeMs(
  startedAt: number,
  now: number,
  sceneDurationMs: number,
) {
  return Math.min(Math.max(0, now - startedAt), sceneDurationMs);
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

/**
 * Instante em que este objeto termina: o último keyframe ou o fim do vídeo de
 * qualquer das telas, o que vier depois — senão o play cortaria a gravação no
 * meio.
 */
export function getObjectMotionEnd(object: SceneObject): number {
  const lastKeyframe = object.keyframes[object.keyframes.length - 1]?.timeMs ?? 0;

  return Math.max(
    lastKeyframe,
    ...(isDeviceObject(object) ? getActiveScreenVideos(object) : []).map(
      ({ video }) => video.startMs + getScreenVideoClipDuration(video),
    ),
  );
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

/** Mistura duas cores #rrggbb canal a canal (em sRGB, como o seletor mostra). */
export function lerpHexColor(from: string, to: string, t: number): string {
  const channel = (hex: string, offset: number) =>
    parseInt(hex.slice(1 + offset * 2, 3 + offset * 2), 16);

  return `#${[0, 1, 2]
    .map((offset) =>
      Math.round(lerp(channel(from, offset), channel(to, offset), t))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
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
    opacity: lerp(from.opacity, to.opacity, t),
    foldAngle: lerp(
      from.foldAngle ?? DEFAULT_FOLD_ANGLE,
      to.foldAngle ?? DEFAULT_FOLD_ANGLE,
      t,
    ),
    // Só quando há de onde partir: sem o campo, o texto fica com o dele. Se
    // só um lado o tem, o outro o segura (como a abertura).
    ...(from.letterSpacing !== undefined || to.letterSpacing !== undefined
      ? {
          letterSpacing: lerp(
            (from.letterSpacing ?? to.letterSpacing) as number,
            (to.letterSpacing ?? from.letterSpacing) as number,
            t,
          ),
        }
      : {}),
    ...(from.orbit !== undefined || to.orbit !== undefined
      ? {
          orbit: lerpOrbit(
            (from.orbit ?? to.orbit) as CameraOrbit,
            (to.orbit ?? from.orbit) as CameraOrbit,
            t,
          ),
        }
      : {}),
    ...(from.textColor !== undefined || to.textColor !== undefined
      ? {
          textColor: lerpHexColor(
            (from.textColor ?? to.textColor) as string,
            (to.textColor ?? from.textColor) as string,
            t,
          ),
        }
      : {}),
    // O fundo como pose é o do keyframe mais perto: serve para capturar um
    // keyframe novo no meio de um trecho. O que se vê é a dissolução de
    // `sampleBackgroundLook`.
    ...(from.background !== undefined || to.background !== undefined
      ? {
          background: (t < 0.5
            ? (from.background ?? to.background)
            : (to.background ?? from.background)) as BackgroundPose,
        }
      : {}),
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
  const segment = getMotionSegment(object.keyframes, timeMs);

  if (!segment) {
    return null;
  }

  // Antes do primeiro e depois do último, o keyframe como está.
  return segment.from === segment.to
    ? segment.to.transform
    : lerpTransform(segment.from.transform, segment.to.transform, segment.progress);
}

/**
 * Entre quais keyframes cai um instante, e quanto do trecho já andou (com a
 * curva do keyframe de chegada aplicada). Antes do primeiro e depois do último,
 * o trecho é o próprio keyframe (progresso 0). `null` sem keyframes. É a conta
 * de `sampleMotion`, separada para quem interpola outra coisa que não a pose
 * (o fundo, em `sampleBackgroundLook`).
 */
export function getMotionSegment(
  keyframes: Keyframe[],
  timeMs: number,
): { from: Keyframe; progress: number; to: Keyframe } | null {
  if (keyframes.length === 0) {
    return null;
  }

  if (timeMs <= keyframes[0].timeMs) {
    return { from: keyframes[0], progress: 0, to: keyframes[0] };
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const from = keyframes[index - 1];
    const to = keyframes[index];

    if (timeMs <= to.timeMs) {
      const span = to.timeMs - from.timeMs;
      const progress = span === 0 ? 1 : (timeMs - from.timeMs) / span;

      return { from, progress: applyEasing(to.easing, progress, to.bezier), to };
    }
  }

  const last = keyframes[keyframes.length - 1];

  return { from: last, progress: 0, to: last };
}

/**
 * A pose que a cena mostra num instante. Como um clipe num editor de vídeo,
 * um objeto animado só existe enquanto a trilha dele está na régua: antes do
 * primeiro keyframe e depois do último fica fora de cena (opacidade 0). O que
 * a timeline desenha é o que o vídeo mostra — arrastar a trilha para frente
 * deixa o espaço de trás vazio, e uma trilha que acaba antes das outras tira o
 * objeto de cena ali (decisão do usuário; até a 2.5 ele segurava a pose final).
 * Os dois limites são inclusivos: o objeto que termina junto com a cena
 * aparece no último quadro.
 *
 * Com um keyframe só a trilha não tem comprimento: o objeto entra nele e fica
 * até o fim. Sem keyframes, não há o que amostrar (`null`), e ele fica sempre.
 * O clipe de vídeo da tela não estende a trilha: depois do último keyframe o
 * aparelho sai, com ou sem vídeo.
 *
 * Só para exibir: editar (criar keyframe no playhead) usa `sampleMotion`, que
 * segura a primeira e a última pose — um keyframe novo fora da trilha não pode
 * nascer invisível.
 */
export function sampleDisplayedMotion(
  object: SceneObject,
  timeMs: number,
): MotionTransform | null {
  const sampled = sampleMotion(object, timeMs);
  const { keyframes } = object;

  if (!sampled) {
    return null;
  }

  const isBeforeTrack = timeMs < keyframes[0].timeMs;
  const isAfterTrack =
    keyframes.length > 1 && timeMs > keyframes[keyframes.length - 1].timeMs;

  if (isBeforeTrack || isAfterTrack) {
    return { ...sampled, opacity: 0 };
  }

  return sampled;
}
