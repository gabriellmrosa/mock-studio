"use client";

import {
  DEVICE_MODELS,
  type DeviceModelId,
} from "../models/device-models";
import { DEFAULT_OBJECT_TRANSFORM } from "./scene-presets";

export type SceneObject = {
  colors: Record<string, string>;
  debugMode: boolean;
  debugPartColors: Record<string, string>;
  deletable: boolean;
  deviceTheme: string;
  id: string;
  imageUrl: string;
  modelId: DeviceModelId;
  name: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  showDeviceShell: boolean;
};

const MODEL_PLACEHOLDERS: Record<DeviceModelId, string> = {
  smartphone: "/placeholder-1290x2755.png",
  smartphone2: "/placeholder-1290x2848.png",
  smartwatch: "/placeholder-1290x1452.png",
  notebook: "/placeholder-1290x2755.png",
};

export function getPlaceholderImageUrl(modelId: DeviceModelId = "smartphone") {
  return MODEL_PLACEHOLDERS[modelId];
}

export function isPlaceholderImageUrl(imageUrl: string) {
  return Object.values(MODEL_PLACEHOLDERS).includes(imageUrl);
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
    imageUrl: getPlaceholderImageUrl(modelId),
    modelId,
    name,
    ...DEFAULT_OBJECT_TRANSFORM,
    showDeviceShell: true,
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
    imageUrl: getPlaceholderImageUrl(modelId),
    modelId,
    ...DEFAULT_OBJECT_TRANSFORM,
    showDeviceShell: true,
  };
}
