"use client";

import {
  DEVICE_MODELS,
  type DeviceModelId,
} from "../models/device-models";
import type { PhoneColors, ThemeName } from "../components/Smartphone";

export type SceneObject = {
  colors: PhoneColors;
  debugMode: boolean;
  debugPartColors: Record<string, string>;
  deletable: boolean;
  deviceTheme: ThemeName | "";
  id: string;
  imageUrl: string;
  modelId: DeviceModelId;
  name: string;
  positionX: number;
  positionY: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  showDeviceShell: boolean;
};

const DEFAULT_IMAGE_URL = "/placeholder.png";

export function createSceneObject({
  deletable = true,
  modelId = "smartphone",
  name,
}: {
  deletable?: boolean;
  modelId?: DeviceModelId;
  name: string;
}): SceneObject {
  const model = DEVICE_MODELS[modelId];

  return {
    colors: { ...model.themes[model.defaultTheme] },
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deletable,
    deviceTheme: model.defaultTheme,
    id: crypto.randomUUID(),
    imageUrl: DEFAULT_IMAGE_URL,
    modelId,
    name,
    positionX: 0,
    positionY: 0,
    rotationX: 0,
    rotationY: 180,
    rotationZ: 0,
    showDeviceShell: true,
  };
}

export function resetSceneObject(object: SceneObject): SceneObject {
  const model = DEVICE_MODELS[object.modelId];

  return {
    ...object,
    colors: { ...model.themes[model.defaultTheme] },
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deviceTheme: model.defaultTheme,
    positionX: 0,
    positionY: 0,
    rotationX: 0,
    rotationY: 180,
    rotationZ: 0,
    showDeviceShell: true,
  };
}

export function changeSceneObjectModel(
  object: SceneObject,
  modelId: DeviceModelId,
): SceneObject {
  const model = DEVICE_MODELS[modelId];

  return {
    ...object,
    colors: { ...model.themes[model.defaultTheme] },
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deviceTheme: model.defaultTheme,
    imageUrl: DEFAULT_IMAGE_URL,
    modelId,
    positionX: 0,
    positionY: 0,
    rotationX: 0,
    rotationY: 180,
    rotationZ: 0,
    showDeviceShell: true,
  };
}
