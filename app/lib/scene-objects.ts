"use client";

import {
  DEVICE_MODELS,
  type DeviceModelId,
} from "../models/device-models";
import {
  DEFAULT_OBJECT_TRANSFORM,
  OBJECT_POSITION_MULTIPLIER,
} from "./scene-presets";

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
};

const MODEL_PLACEHOLDERS: Record<DeviceModelId, string> = {
  smartphone: "/placeholder-1290x2755.png",
  smartphone2: "/placeholder-1290x2748.png",
  smartwatch: "/placeholder-1290x1452.png",
  notebook: "/placeholder-2755x1684.png",
};

const SPAWN_GAP_WORLD_X = 28;

export function getPlaceholderImageUrl(modelId: DeviceModelId = "smartphone") {
  return MODEL_PLACEHOLDERS[modelId];
}

export function isPlaceholderImageUrl(imageUrl: string) {
  return Object.values(MODEL_PLACEHOLDERS).includes(imageUrl);
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

function getNormalizedSpawnWidth(modelId: DeviceModelId, scale = 1) {
  return (DEVICE_MODELS[modelId].spawnFootprintWidth * scale) / OBJECT_POSITION_MULTIPLIER;
}

export function getOffsetSpawnTransform(
  objects: SceneObject[],
  modelId: DeviceModelId,
) {
  const { positionY, positionZ } = DEFAULT_OBJECT_TRANSFORM;
  const objectsOnDefaultPlane = objects.filter((object) =>
    hasSameModelAtTransform(object, modelId, positionY, positionZ),
  );

  if (objectsOnDefaultPlane.length === 0) {
    return {
      positionX: DEFAULT_OBJECT_TRANSFORM.positionX,
      positionY,
      positionZ,
    };
  }

  const nextWidth = getNormalizedSpawnWidth(modelId);
  const gapX = SPAWN_GAP_WORLD_X / OBJECT_POSITION_MULTIPLIER;
  const rightmostEdge = Math.max(
    ...objectsOnDefaultPlane.map(
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
    ...DEFAULT_OBJECT_TRANSFORM,
    showDeviceShell: true,
    showNotebookKeyboard: true,
  };
}
