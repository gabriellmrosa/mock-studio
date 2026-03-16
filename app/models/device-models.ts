"use client";

import {
  DEFAULT_THEME,
  Smartphone,
  THEMES,
  type DebugPartKey,
  type PhoneColors,
  type ThemeName,
} from "../components/Smartphone";

export type DeviceModelId = "smartphone";

export type DeviceThemeOption = {
  id: ThemeName;
  label: string;
  preview: string;
};

export type DeviceModelDefinition = {
  component: typeof Smartphone;
  defaultTheme: ThemeName;
  id: DeviceModelId;
  initialDebugColors: Record<DebugPartKey, string>;
  name: string;
  screenPosition: [number, number, number];
  screenSize: [number, number];
  themeOptions: DeviceThemeOption[];
  themes: Record<ThemeName, PhoneColors>;
};

const SMARTPHONE_THEME_OPTIONS: DeviceThemeOption[] = [
  { id: "gray", label: "Cinza", preview: "#8A8A8E" },
  { id: "black", label: "Preto", preview: "#1C1C1E" },
  { id: "white", label: "Branco", preview: "#F5F5F7" },
];

const SMARTPHONE_DEBUG_COLORS: Record<DebugPartKey, string> = {
  smartphoneBody: "#cc00ff",
  estruturaFrontal: "#ff00cc",
  gradientSound: "#000000",
  botaoPowerDireito: "#ff6600",
  botaoVolumeCima: "#ffcc00",
  botaoVolumeBaixo: "#ffff00",
  rightBigSideButton: "#ff4400",
  CircleTopLeft: "#000000",
  CircleTopLeftMiddle: "#ccff99",
  leftSmallSideButton: "#66ff66",
  notchBolinha1: "#00ff00",
  notchBolinha2: "#00ffff",
  notchBolinha3: "#0099ff",
  CircleTopRightMiddle: "#ff0066",
  notchPill: "#33ccff",
  moduloCameraAro: "#99ff00",
  CircleTopRight: "#ff99cc",
  lente1: "#0000ff",
  lente2: "#ffff99",
  lente3: "#00ff99",
  behindOrHideElement1: "#ff0000",
  behindOrHideElement2: "#ff3300",
  behindOrHideElement3: "#ff5500",
  behindOrHideElement4: "#ff7700",
  behindOrHideElement5: "#ff9900",
  behindOrHideElement6: "#ffbb00",
  behindOrHideElement7: "#ffdd00",
};

export const DEVICE_MODELS: Record<DeviceModelId, DeviceModelDefinition> = {
  smartphone: {
    component: Smartphone,
    defaultTheme: DEFAULT_THEME,
    id: "smartphone",
    initialDebugColors: SMARTPHONE_DEBUG_COLORS,
    name: "Smartphone",
    screenPosition: [-125, 314.85, -195],
    screenSize: [220, 470],
    themeOptions: SMARTPHONE_THEME_OPTIONS,
    themes: THEMES,
  },
};

export const DEVICE_MODEL_LIST = Object.values(DEVICE_MODELS);
export const DEFAULT_DEVICE_MODEL = DEVICE_MODELS.smartphone;
