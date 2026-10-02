"use client";

import {
  DEVICE_MODELS,
  type DeviceModelId,
} from "../models/device-models";
import {
  DEFAULT_OBJECT_TRANSFORM,
  OBJECT_POSITION_MULTIPLIER,
} from "./scene-presets";
import { createPlaceholderDataUrl } from "./placeholder-image";
import { cloneKeyframes, type Keyframe } from "./scene-motion";

/**
 * Enquadramento do conteúdo na tela, sobre o recorte "cover" automático.
 * - `crop*`: fração de cada borda do arquivo a esconder (0 a 0.25), para
 *   molduras gravadas junto — gravações de tela espelhadas costumam trazer uma.
 *   É uma máscara: o conteúdo não muda de tamanho nem de lugar, e a faixa
 *   cortada mostra o `background`.
 * - `zoom`: 0.5 a 3. Abaixo de 1 o conteúdo fica menor que a tela e o resto é
 *   preenchido com `background`, como as faixas cortadas.
 * - `panX`/`panY`: -1 a 1, a fração da folga usada para mover o conteúdo. Com
 *   zoom ≥ 1, ±1 encosta a borda do conteúdo na da tela (nunca aparece vão);
 *   abaixo de 1, encosta o conteúdo numa borda da tela. Positivo move o
 *   conteúdo para a direita e para cima.
 */
export type ScreenFit = {
  background: string;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  panX: number;
  panY: number;
  zoom: number;
};

export const DEFAULT_SCREEN_FIT: ScreenFit = {
  // O branco do fundo da tela no modo Estático.
  background: "#ffffff",
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  panX: 0,
  panY: 0,
  zoom: 1,
};
export const MIN_SCREEN_ZOOM = 0.5;
export const MAX_SCREEN_ZOOM = 3;
export const MAX_SCREEN_CROP = 0.25;

/**
 * Gravação de tela enviada pelo usuário. Fica como blob URL (não data URL,
 * como a imagem): um vídeo em base64 pesaria dezenas de MB na memória. Não é
 * revogado ao ser trocado — o mesmo vídeo pode estar num objeto duplicado ou
 * na cena do outro modo, e um blob de arquivo só referencia o arquivo em
 * disco, então mantê-lo custa pouco. Como as imagens, não entra em templates.
 */
export type ScreenVideo = {
  durationMs: number;
  /** Enquadramento próprio: imagem e vídeo raramente pedem o mesmo. */
  fit: ScreenFit;
  name: string;
  /** Instante da cena em que o clipe começa, no modo Movimento. */
  startMs: number;
  /**
   * Quanto do arquivo fica de fora no começo e no fim, em ms — o corte feito
   * arrastando as bordas do clipe na timeline. O arquivo não muda.
   */
  trimEndMs: number;
  trimStartMs: number;
  url: string;
};

/** Menor clipe que o corte deixa sobrar: abaixo disso some da timeline. */
export const MIN_SCREEN_VIDEO_CLIP_MS = 100;

/** Quanto do vídeo toca na cena: o arquivo menos os cortes. */
export function getScreenVideoClipDuration(video: ScreenVideo) {
  return Math.max(
    MIN_SCREEN_VIDEO_CLIP_MS,
    video.durationMs - (video.trimStartMs ?? 0) - (video.trimEndMs ?? 0),
  );
}

export type VideoClipPatch = Partial<
  Pick<ScreenVideo, "startMs" | "trimEndMs" | "trimStartMs">
>;

/**
 * Corta uma borda do clipe, como num editor de vídeo, a partir do clipe como
 * estava no início do arrasto. Na borda do começo o resto do vídeo não sai do
 * lugar: o clipe começa depois na cena na mesma medida em que o arquivo é
 * cortado. Nenhum corte passa do arquivo nem deixa menos que o clipe mínimo,
 * e o começo não vai para antes do zero da cena.
 */
export function trimVideoClip(
  video: ScreenVideo,
  edge: "start" | "end",
  deltaMs: number,
): VideoClipPatch {
  const trimStartMs = video.trimStartMs ?? 0;
  const trimEndMs = video.trimEndMs ?? 0;

  if (edge === "end") {
    const max = video.durationMs - trimStartMs - MIN_SCREEN_VIDEO_CLIP_MS;

    return { trimEndMs: Math.min(max, Math.max(0, trimEndMs - deltaMs)) };
  }

  const min = Math.max(0, trimStartMs - video.startMs);
  const max = video.durationMs - trimEndMs - MIN_SCREEN_VIDEO_CLIP_MS;
  const next = Math.min(max, Math.max(min, trimStartMs + deltaMs));

  return {
    startMs: video.startMs + (next - trimStartMs),
    trimStartMs: next,
  };
}

/**
 * Tempo do arquivo num instante da cena, ou `null` fora do clipe. Como num
 * editor de vídeo, o clipe só existe no trecho dele na timeline: antes e
 * depois a tela não mostra o vídeo. O fim é inclusivo — a cena que termina
 * junto com o clipe acaba no último quadro dele, não numa tela vazia.
 */
export function getScreenVideoTime(
  video: ScreenVideo,
  sceneTimeMs: number,
): number | null {
  const offset = sceneTimeMs - video.startMs;

  if (offset < 0 || offset > getScreenVideoClipDuration(video)) {
    return null;
  }

  return (video.trimStartMs ?? 0) + offset;
}

/** Vídeo que a tela mostra de fato: o enviado, e só se for a fonte escolhida. */
export function getActiveScreenVideo(object: SceneObject) {
  return object.screenSource === "video" ? object.screenVideo : null;
}

/**
 * Enquadramento do que a tela mostra agora: o do vídeo ou o da imagem.
 * Completa com os padrões para aceitar enquadramentos de antes dos campos
 * novos (cena ainda na memória durante um hot reload).
 */
export function getActiveScreenFit(object: SceneObject): ScreenFit {
  return {
    ...DEFAULT_SCREEN_FIT,
    ...(getActiveScreenVideo(object)?.fit ?? object.imageFit),
  };
}

export type SceneObject = {
  colors: Record<string, string>;
  debugMode: boolean;
  debugPartColors: Record<string, string>;
  deletable: boolean;
  deviceTheme: string;
  id: string;
  /** Enquadramento da imagem; volta ao automático quando ela é trocada. */
  imageFit: ScreenFit;
  /**
   * Nome do arquivo enviado, para a linha do arquivo no Inspector — a imagem
   * é guardada como data URL, que não carrega nome. `null` = placeholder.
   */
  imageName: string | null;
  imageUrl: string;
  isVisible: boolean;
  /**
   * O que a tela mostra. Imagem e vídeo são guardados lado a lado: trocar de
   * fonte não apaga a outra. Com "video" e sem vídeo enviado, vale a imagem.
   */
  screenSource: "image" | "video";
  screenVideo: ScreenVideo | null;
  /** Vazio = objeto estático. Ver [scene-motion.ts](app/lib/scene-motion.ts). */
  keyframes: Keyframe[];
  modelId: DeviceModelId;
  name: string;
  matteColors: boolean;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  /** 0 a 1; em 0 o objeto some da cena (mas continua na lista). */
  opacity: number;
  showDeviceShell: boolean;
  showNotebookKeyboard: boolean;
  showTabletBezel: boolean;
};

// Placeholders são gerados em runtime (canvas) no tamanho de upload
// recomendado de cada modelo — não há mais PNGs estáticos em public/.
const MODEL_PLACEHOLDER_SIZES: Record<DeviceModelId, [number, number]> = {
  smartphone: [1290, 2748],
  smartphone2: [1290, 2748],
  smartphone3: [1290, 2755],
  smartwatch: [1290, 1452],
  notebook: [2755, 1684],
  tablet: [1668, 2388],
};

// Fração da altura usada como fonte no placeholder. O padrão (0.042) deixa o
// texto uniforme na maioria dos modelos; smartwatch e notebook têm a tela
// ocupando menos do enquadramento, então recebem um valor maior para o texto
// renderizado aparecer no mesmo tamanho visual.
const DEFAULT_PLACEHOLDER_FONT_SCALE = 0.042;
const MODEL_PLACEHOLDER_FONT_SCALE: Partial<Record<DeviceModelId, number>> = {
  smartwatch: 0.098,
  notebook: 0.066,
};

// Sentinel usado quando o canvas 2D não está disponível (SSR/jsdom); no
// browser a textura nunca vê esse valor porque o cache é preenchido no client.
const PLACEHOLDER_URL_PREFIX = "placeholder://";

const placeholderUrlCache = new Map<DeviceModelId, string>();

const SPAWN_GAP_WORLD_X = 28;

export function getPlaceholderImageUrl(modelId: DeviceModelId = "smartphone") {
  const cached = placeholderUrlCache.get(modelId);
  if (cached) {
    return cached;
  }

  const [width, height] = MODEL_PLACEHOLDER_SIZES[modelId];
  const fontScale =
    MODEL_PLACEHOLDER_FONT_SCALE[modelId] ?? DEFAULT_PLACEHOLDER_FONT_SCALE;
  const url =
    createPlaceholderDataUrl(width, height, fontScale) ??
    `${PLACEHOLDER_URL_PREFIX}${modelId}`;

  placeholderUrlCache.set(modelId, url);
  return url;
}

export function isPlaceholderImageUrl(imageUrl: string) {
  if (imageUrl.startsWith(PLACEHOLDER_URL_PREFIX)) {
    return true;
  }

  return [...placeholderUrlCache.values()].includes(imageUrl);
}

function hasSameModelAtTransform(
  object: SceneObject,
  modelId: DeviceModelId,
  positionY: number,
  positionZ: number,
) {
  return (
    object.modelId === modelId &&
    object.positionY === positionY &&
    object.positionZ === positionZ
  );
}

function isOnTransformPlane(
  object: SceneObject,
  positionY: number,
  positionZ: number,
) {
  return object.positionY === positionY && object.positionZ === positionZ;
}

function getNormalizedSpawnWidth(modelId: DeviceModelId, scale = 1) {
  return (DEVICE_MODELS[modelId].spawnFootprintWidth * scale) / OBJECT_POSITION_MULTIPLIER;
}

function getOffsetSpawnTransformForPlane(
  objects: SceneObject[],
  modelId: DeviceModelId,
  positionY: number,
  positionZ: number,
  scale = 1,
) {
  const objectsOnPlane = objects.filter((object) =>
    hasSameModelAtTransform(object, modelId, positionY, positionZ),
  );

  if (objectsOnPlane.length === 0) {
    return {
      positionX: DEFAULT_OBJECT_TRANSFORM.positionX,
      positionY,
      positionZ,
    };
  }

  const nextWidth = getNormalizedSpawnWidth(modelId, scale);
  const gapX = SPAWN_GAP_WORLD_X / OBJECT_POSITION_MULTIPLIER;
  const rightmostEdge = Math.max(
    ...objectsOnPlane.map(
      (object) =>
        object.positionX + getNormalizedSpawnWidth(object.modelId, object.scale) / 2,
    ),
  );

  return {
    positionX: rightmostEdge + nextWidth / 2 + gapX,
    positionY,
    positionZ,
  };
}

export function getSequentialSpawnTransform(
  objects: SceneObject[],
  modelId: DeviceModelId,
  scale = 1,
) {
  const { positionY, positionZ } = DEFAULT_OBJECT_TRANSFORM;
  const objectsOnPlane = objects.filter((object) =>
    isOnTransformPlane(object, positionY, positionZ),
  );

  if (objectsOnPlane.length === 0) {
    return {
      positionX: DEFAULT_OBJECT_TRANSFORM.positionX,
      positionY,
      positionZ,
    };
  }

  const nextWidth = getNormalizedSpawnWidth(modelId, scale);
  const gapX = SPAWN_GAP_WORLD_X / OBJECT_POSITION_MULTIPLIER;
  const rightmostEdge = Math.max(
    ...objectsOnPlane.map(
      (object) =>
        object.positionX + getNormalizedSpawnWidth(object.modelId, object.scale) / 2,
    ),
  );

  return {
    positionX: rightmostEdge + nextWidth / 2 + gapX,
    positionY,
    positionZ,
  };
}

export function getOffsetSpawnTransform(
  objects: SceneObject[],
  modelId: DeviceModelId,
) {
  const { positionY, positionZ } = DEFAULT_OBJECT_TRANSFORM;
  return getOffsetSpawnTransformForPlane(objects, modelId, positionY, positionZ);
}

export function createSceneObject({
  deletable = true,
  id,
  modelId = "smartphone",
  name,
}: {
  deletable?: boolean;
  id?: string;
  modelId?: DeviceModelId;
  name: string;
}): SceneObject {
  const model = DEVICE_MODELS[modelId];

  return {
    colors: { ...(model.themes[model.defaultTheme] ?? {}) },
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deletable,
    deviceTheme: model.defaultTheme,
    id: id ?? crypto.randomUUID(),
    imageFit: { ...DEFAULT_SCREEN_FIT },
    imageName: null,
    imageUrl: getPlaceholderImageUrl(modelId),
    isVisible: true,
    screenSource: "image",
    screenVideo: null,
    keyframes: [],
    modelId,
    name,
    matteColors: true,
    ...DEFAULT_OBJECT_TRANSFORM,
    showDeviceShell: true,
    showNotebookKeyboard: true,
    showTabletBezel: true,
  };
}

export function duplicateSceneObject({
  id,
  name,
  objects,
  source,
}: {
  id?: string;
  name: string;
  objects: SceneObject[];
  source: SceneObject;
}): SceneObject {
  const spawnTransform = getOffsetSpawnTransformForPlane(
    objects,
    source.modelId,
    source.positionY,
    source.positionZ,
    source.scale,
  );

  return {
    ...source,
    deletable: true,
    id: id ?? crypto.randomUUID(),
    // Ids de keyframe precisam ser únicos na cena: a seleção da timeline os
    // procura sem saber de qual objeto são.
    keyframes: cloneKeyframes(source.keyframes),
    name,
    ...spawnTransform,
  };
}

export function resetSceneObject(object: SceneObject): SceneObject {
  return {
    ...object,
    ...DEFAULT_OBJECT_TRANSFORM,
  };
}

export function changeSceneObjectModel(
  object: SceneObject,
  modelId: DeviceModelId,
): SceneObject {
  const model = DEVICE_MODELS[modelId];

  return {
    ...object,
    colors: { ...(model.themes[model.defaultTheme] ?? {}) },
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deviceTheme: model.defaultTheme,
    imageFit: { ...DEFAULT_SCREEN_FIT },
    imageName: null,
    imageUrl: getPlaceholderImageUrl(modelId),
    modelId,
    matteColors: true,
    screenSource: "image",
    screenVideo: null,
    showDeviceShell: true,
    showNotebookKeyboard: true,
    showTabletBezel: true,
  };
}
