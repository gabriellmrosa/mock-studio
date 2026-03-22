"use client";

import {
  Smartphone,
  type DebugPartKey,
} from "../components/Smartphone";
import { Smartphone2, type Smartphone2DebugPartKey } from "../components/Smartphone2";
import {
  SMARTPHONE2_DEFAULT_THEME,
  SMARTPHONE2_THEMES,
  buildSmartphone2ColorsFromPrimary,
} from "../lib/3d-tokens/smartphone2";
import { Smartwatch, type SmartwatchDebugPartKey } from "../components/Smartwatch";
import { Notebook, type NotebookDebugPartKey } from "../components/Notebook";
import {
  SMARTPHONE_DEFAULT_THEME,
  SMARTPHONE_THEMES,
  buildSmartphoneColorsFromPrimary,
  type SmartphoneThemeName,
} from "../lib/3d-tokens/smartphone";
import {
  SMARTWATCH_DEFAULT_THEME,
  SMARTWATCH_THEMES,
  buildSmartwatchColorsFromPrimary,
} from "../lib/3d-tokens/smartwatch";
import {
  NOTEBOOK_DEFAULT_THEME,
  NOTEBOOK_THEMES,
  buildNotebookColorsFromPrimary,
} from "../lib/3d-tokens/notebook";
export type DeviceModelId =
  | "smartphone"
  | "smartphone2"
  | "smartwatch"
  | "notebook";

export type DeviceThemeOption = {
  id: string;
  label: string;
  preview: string;
};

export type DeviceModelDefinition = {
  // Chave do objeto colors que representa a cor primária — exibida no color picker do InspectorPanel.
  // undefined = modelo ainda sem temas definidos, color picker não aparece.
  primaryColorKey?: string;
  baseRotation: [number, number, number];
  buildColorsFromPrimary: (hex: string) => Record<string, string>;
  component:
    | typeof Smartphone
    | typeof Smartphone2
    | typeof Smartwatch
    | typeof Notebook;
  defaultTheme: string;
  id: DeviceModelId;
  initialDebugColors: Record<string, string>;
  modelScale: [number, number, number];
  // Offset base em world units adicionado ao AUTO_OBJECT_POSITIONS de cada índice.
  // Usado para centralizar visualmente modelos cujo pivot nativo não coincide com a origem.
  modelSpawnOffset: [number, number, number];
  name: string;
  // Offset em unidades GLTF (antes do scale) para centralizar a geometria na origem do grupo,
  // garantindo que o pivot de rotação coincida com o centro visual do modelo.
  // Calcular como: negativo do centro do bounding box visível em espaço GLTF.
  pivotOffset: [number, number, number];
  recommendedUploadSize: string;
  screenPosition: [number, number, number];
  screenSize: [number, number];
  themeOptions: DeviceThemeOption[];
  themes: Record<string, Record<string, string>>;
};

// ---------------------------------------------------------------------------
// Smartphone
// ---------------------------------------------------------------------------
const SMARTPHONE_THEME_OPTIONS: DeviceThemeOption[] = [
  { id: "gray",       label: "Cinza",      preview: "#8A8A8E" },
  { id: "black",      label: "Preto",      preview: "#1C1C1E" },
  { id: "light-gray", label: "Light Gray", preview: "#d1d1d1" },
  { id: "blood",      label: "Blood",      preview: "#6a2525" },
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

// ---------------------------------------------------------------------------
// Smartphone2 — cores de debug para identificação visual das partes visíveis
// ---------------------------------------------------------------------------
const SMARTPHONE2_DEBUG_COLORS: Record<Smartphone2DebugPartKey, string> = {
  topCutout: "#ff6600",
  frame: "#00ff99",
  rearInset: "#ffcc00",
  body: "#cc00ff",
  sideCuts: "#00ffff",
  cameraMicroPart: "#ff0099",
  frontGlass: "#33ccff",
  cameraBlock: "#66ff00",
  cameraBlockInner: "#0066ff",
  screen: "#ffffff",
  cameraLensHighlight: "#ff3300",
  cameraSideDetail: "#ffff99",
};

const SMARTPHONE2_THEME_OPTIONS = [
  { id: "gray",       label: "Cinza",      preview: "#8A8A8E" },
  { id: "black",      label: "Preto",      preview: "#1C1C1E" },
  { id: "light-gray", label: "Light Gray", preview: "#d1d1d1" },
  { id: "blood",      label: "Blood",      preview: "#6a2525" },
];

// ---------------------------------------------------------------------------
// Smartwatch — cores de debug para identificação visual das partes visíveis.
// O miolo do casco é Object_11. A tela é um plano separado no componente.
// ---------------------------------------------------------------------------
const SMARTWATCH_DEBUG_COLORS: Record<SmartwatchDebugPartKey, string> = {
  twoSideButtons: "#ff0066",
  bandClasp:      "#00ff99",
  oneSideButton:  "#ff6600",
  body:           "#0066ff",
  bandDetails:    "#ffcc00",
  bandBottom:     "#cc00ff",
  bandDetails2:   "#00ffff",
  crownDetail:    "#ffffff",
  bandTop:        "#66ff00",
  bodyBackground: "#ff0099",
};

const SMARTWATCH_THEME_OPTIONS = [
  { id: "gray",       label: "Cinza",      preview: "#8A8A8E" },
  { id: "black",      label: "Preto",      preview: "#1C1C1E" },
  { id: "light-gray", label: "Light Gray", preview: "#d1d1d1" },
  { id: "blood",      label: "Blood",      preview: "#6a2525" },
];

const NOTEBOOK_THEME_OPTIONS = [
  { id: "gray",       label: "Cinza",      preview: "#8A8A8E" },
  { id: "black",      label: "Preto",      preview: "#1C1C1E" },
  { id: "light-gray", label: "Light Gray", preview: "#d1d1d1" },
  { id: "blood",      label: "Blood",      preview: "#6a2525" },
];

const NOTEBOOK_DEBUG_COLORS: Record<NotebookDebugPartKey, string> = {
  touchpadBorder: "#ffffff",
  keyboardBaseOuter: "#ffffff",
  laptopOpenNotch: "#ffffff",
  DmUcWNXfiLPcftc: "#0066ff",
  ELAWKPIQpGuqYuU: "#ffcc00",
  FmsrGmNZGtSredn: "#cc00ff",
  jbtMEbemwaBHRTw: "#00ffff",
  jfSniDGKVWZvpyG: "#66ff00",
  lZDBMTdjXPebUMa: "#ff0099",
  ZroMGzfQtHrkgUh: "#ffffff",
  bckGBpxpLXNHmCa: "#ff3300",
  JXvTyELxHLGtnWp: "#33ccff",
  keyboardBacklight: "#ffffff",
  sIzFavpnYbDfLWk: "#00ff99",
  sonZrhRIQDlQHcy: "#ff6600",
  aBJxhjUzVIkBmJN: "#0066ff",
  mTDvrHXNRqkIrBd: "#ffcc00",
  fVNvUQeYMdbMNOA: "#cc00ff",
  IJeReHnhQHJFtgB: "#00ffff",
  lzNeOaWQWAReGok: "#66ff00",
  WZqbfOdYdlPMpRs: "#ff0099",
  speakerGrilles: "#ffffff",
  bodyBottom: "#ffffff",
  powerButtonInner: "#ffffff",
  keyboardDeck: "#ffffff",
  EBRhBFNqcMTaWWv: "#00ff99",
  keyboardKeys: "#ffffff",
  keyboardGlyphs: "#ffffff",
  touchpad: "#ffffff",
  rFquJMQWzuecHQa: "#cc00ff",
  eFpSjyrDhTgtyuf: "#00ffff",
  LBeBZdkKmrJVhJd: "#66ff00",
  MwJmMcLbTBwQpxl: "#ff0099",
  OCxZAMeEkQKexHA: "#ffffff",
  XodVrcYKiUPGCmX: "#ff3300",
  screenRubberSeal: "#ffffff",
  screenBackCover: "#ffffff",
  hingeRubberSeal: "#ffffff",
  xiLiwJHfkqIwaTs: "#ff6600",
  LQtuXuSGFKsUXjP: "#0066ff",
  screenBezel: "#ffffff",
  screen: "#ffffff",
  lowerHingeBar: "#ffffff",
  QSjoCOCzvxPnLpK: "#66ff00",
};

// ---------------------------------------------------------------------------
export const DEVICE_MODELS: Record<DeviceModelId, DeviceModelDefinition> = {
  smartphone: {
    primaryColorKey: "smartphoneBody",
    baseRotation: [0, 0, 0],
    buildColorsFromPrimary: buildSmartphoneColorsFromPrimary,
    component: Smartphone,
    defaultTheme: SMARTPHONE_DEFAULT_THEME,
    id: "smartphone",
    initialDebugColors: SMARTPHONE_DEBUG_COLORS,
    modelScale: [1, 1, 1],
    modelSpawnOffset: [0, 0, 0],
    name: "Smartphone",
    pivotOffset: [0, 0, 0],
    recommendedUploadSize: "1290x2755",
    screenPosition: [-125, 314.85, -195],
    screenSize: [220, 470],
    themeOptions: SMARTPHONE_THEME_OPTIONS,
    themes: SMARTPHONE_THEMES,
  },
  smartphone2: {
    primaryColorKey: "body",
    baseRotation: [0, (90.5 * Math.PI) / 180, 0],
    buildColorsFromPrimary: buildSmartphone2ColorsFromPrimary,
    component: Smartphone2,
    defaultTheme: SMARTPHONE2_DEFAULT_THEME,
    id: "smartphone2",
    initialDebugColors: SMARTPHONE2_DEBUG_COLORS,
    modelScale: [122.9, 122.9, 122.9],
    modelSpawnOffset: [0, 0, 0],
    name: "Smartphone 2",
    pivotOffset: [0, 0, 0],
    recommendedUploadSize: "1290x2748",
    screenPosition: [0, 0, 0],
    screenSize: [0, 0],
    themeOptions: SMARTPHONE2_THEME_OPTIONS,
    themes: SMARTPHONE2_THEMES,
  },
  smartwatch: {
    primaryColorKey: "body",
    // GLTF tem -PI/2 X baked. +PI/2 X cancela → modelo nativo deitado.
    // Z -PI/2 ergue o relógio do chão; Y PI enfrenta a câmera.
    baseRotation: [0, -Math.PI / 2, 0],
    buildColorsFromPrimary: buildSmartwatchColorsFromPrimary,
    component: Smartwatch,
    defaultTheme: SMARTWATCH_DEFAULT_THEME,
    id: "smartwatch",
    initialDebugColors: SMARTWATCH_DEBUG_COLORS,
    // GLTF bounding box: [14.509, 8.231, 15.128]. Após -PI/2 X baked na cena:
    // altura Three.js = 15.128. Scale alvo: ~490 / 15.128 ≈ 32.4
    modelScale: [19.44, 19.44, 19.44],
    modelSpawnOffset: [130, 40, 270],
    name: "Smartwatch",
    pivotOffset: [0, 0, 0],
    recommendedUploadSize: "1290x1452",
    // Calibrado a partir do bbox do scene graph do miolo frontal (Object_11),
    // já com a rotação baked do GLB aplicada:
    // center ≈ [6.575, 14.518, -0.097], size ≈ [12.992, 8.813, 8.057].
    // O plano da tela fica ligeiramente à frente da face frontal para evitar
    // z-fighting com o bodyBackground, centrado em Y/Z.
    screenPosition: [0.02, 14.52, -0.1],
    screenSize: [6.87, 7.73],
    themeOptions: SMARTWATCH_THEME_OPTIONS,
    themes: SMARTWATCH_THEMES,
  },
  notebook: {
    primaryColorKey: "keyboardBaseOuter",
    // Notebook está de costas com baseRotation=[0,0,0] — mesma correção do smartphone2.
    baseRotation: [0, Math.PI, 0],
    buildColorsFromPrimary: buildNotebookColorsFromPrimary,
    component: Notebook,
    defaultTheme: NOTEBOOK_DEFAULT_THEME,
    id: "notebook",
    initialDebugColors: NOTEBOOK_DEBUG_COLORS,
    // GLTF com scale=0.01 baked. Bounds efetivos: [0.312, 0.300, 0.212] world units.
    // Após PI/2 X rotation: altura = 0.212. Scale alvo: ~490 / 0.212 ≈ 2311
    modelScale: [2311, 2311, 2311],
    modelSpawnOffset: [120, 100, 0],
    name: "Notebook",
    pivotOffset: [0, 0, 0],
    recommendedUploadSize: "2755x1684",
    screenPosition: [0, 0, 0],
    screenSize: [0, 0],
    themeOptions: NOTEBOOK_THEME_OPTIONS,
    themes: NOTEBOOK_THEMES,
  },
};

export const DEVICE_MODEL_LIST = Object.values(DEVICE_MODELS);
export const DEFAULT_DEVICE_MODEL = DEVICE_MODELS.smartphone;

// Re-export para compatibilidade com imports existentes
export type { SmartphoneThemeName };
