"use client";

import { Smartphone } from "../components/Smartphone";
import { Smartphone2 } from "../components/Smartphone2";
import { Smartphone3 } from "../components/Smartphone3";
import { Smartwatch } from "../components/Smartwatch";
import { Notebook } from "../components/Notebook";
import { Tablet } from "../components/Tablet";
import { Duo } from "../components/Duo";
import {
  DEVICE_MODEL_CATALOG,
  MODELS_WITH_FINISH,
  type DeviceModelId,
  type DeviceModelMetadata,
  type DeviceThemeOption,
  type SmartphoneThemeName,
} from "./device-catalog";

export type DeviceModelDefinition = DeviceModelMetadata & {
  component:
    | typeof Smartphone
    | typeof Smartphone2
    | typeof Smartphone3
    | typeof Smartwatch
    | typeof Notebook
    | typeof Tablet
    | typeof Duo;
};

export const DEVICE_MODELS: Record<DeviceModelId, DeviceModelDefinition> = {
  smartphone: {
    ...DEVICE_MODEL_CATALOG.smartphone,
    component: Smartphone,
  },
  smartphone2: {
    ...DEVICE_MODEL_CATALOG.smartphone2,
    component: Smartphone2,
  },
  smartphone3: {
    ...DEVICE_MODEL_CATALOG.smartphone3,
    component: Smartphone3,
  },
  smartwatch: {
    ...DEVICE_MODEL_CATALOG.smartwatch,
    component: Smartwatch,
  },
  notebook: {
    ...DEVICE_MODEL_CATALOG.notebook,
    component: Notebook,
  },
  tablet: {
    ...DEVICE_MODEL_CATALOG.tablet,
    component: Tablet,
  },
  duo: {
    ...DEVICE_MODEL_CATALOG.duo,
    component: Duo,
  },
};

export const DEVICE_MODEL_LIST = Object.values(DEVICE_MODELS);
export const DEFAULT_DEVICE_MODEL = DEVICE_MODELS.smartphone;

export { MODELS_WITH_FINISH };
export type {
  DeviceModelId,
  DeviceModelMetadata,
  DeviceThemeOption,
  SmartphoneThemeName,
};
