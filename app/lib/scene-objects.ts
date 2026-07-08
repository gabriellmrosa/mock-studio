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

export type SceneObject = {
  colors: Record<string, string>;
  customColorsEnabled: boolean;
  debugMode: boolean;
  debugPartColors: Record<string, string>;
  deletable: boolean;
  deviceTheme: string;
  id: string;
  imageUrl: string;
  isVisible: boolean;
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
  smartwatch: 0.078,
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
    customColorsEnabled: false,
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deletable,
    deviceTheme: model.defaultTheme,
    id: id ?? crypto.randomUUID(),
    imageUrl: getPlaceholderImageUrl(modelId),
    isVisible: true,
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
    customColorsEnabled: false,
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deviceTheme: model.defaultTheme,
    imageUrl: getPlaceholderImageUrl(modelId),
    modelId,
    matteColors: true,
    showDeviceShell: true,
    showNotebookKeyboard: true,
    showTabletBezel: true,
  };
}
