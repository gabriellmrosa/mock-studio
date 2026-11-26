import {
  DEVICE_MODEL_CATALOG,
  DEVICE_MODEL_IDS,
  MODELS_WITH_FINISH,
  type DeviceModelId,
} from "../../models/device-catalog";
import { createCameraKeyframe, createCameraObject } from "../camera-objects";
import {
  DEFAULT_CAMERA_FOV,
  normalizeOrbit,
  orbitToLookAt,
  type CameraOrbit,
} from "../camera-orbit";
import {
  DEFAULT_CANVAS_BACKGROUND,
  normalizeCanvasBackground,
  type CanvasBackground,
} from "../canvas-background";
import {
  DEFAULT_CANVAS_GRID,
  normalizeCanvasGrid,
  type CanvasGrid,
} from "../canvas-grid";
import {
  BUILTIN_IMAGE_ASSETS,
  createImageObject,
  getBuiltinAssetImage,
  getImageSpawnPosition,
  getStickerImage,
  isBuiltinImageAssetId,
  normalizeImageSpeed,
} from "../image-objects";
import {
  DEFAULT_MOTION_FRAME,
  MOTION_FRAME_PRESETS,
  normalizeMotionFrame,
  type MotionFrame,
} from "../motion-frame";
import { createSceneCode, createSceneLink } from "../scene-link";
import {
  createKeyframe,
  EASING_IDS,
  type Keyframe,
  type MotionTransform,
} from "../scene-motion";
import {
  createSceneObject,
  type DeviceObject,
  type SceneObject,
} from "../scene-objects";
import {
  DEFAULT_FOLD_ANGLE,
  DEFAULT_OBJECT_TRANSFORM,
  OBJECT_POSITION_MULTIPLIER,
} from "../scene-presets";
import {
  createSceneTemplate,
  isValidTemplate,
  normalizeTemplate,
  type CameraPose,
  type SceneTemplate,
} from "../scene-templates";
import { isStickerId, STICKERS, type StickerCategoryId } from "../stickers";
import { getNearestWeight, TEXT_FONTS, type TextFontId } from "../text-fonts";
import { createTextObject } from "../text-objects";
import {
  MCP_ANIMATIONS,
  MCP_FRAME_PRESETS,
  MCP_LAYOUTS,
  validateBuildSceneInput,
  type McpAnimation,
  type McpBuildSceneInput,
  type McpDeviceInput,
  type McpKeyframeInput,
  type McpLayout,
} from "./scene-schema";

const DEFAULT_BASE_URL = "https://www.mockstudio.app.br/";
const DEFAULT_SCENE_NAME = "AI Scene";
const DEFAULT_DURATION_MS = 4000;
const FLAT_OBJECT_DEFAULT_Z = 0.25;
const DEVICE_GAP_UNITS = 0.35;

export const SCREENS_UPLOAD_NOTE =
  "Mock Studio templates and links never embed user images or videos. Open the link and upload or paste (Cmd+V / Ctrl+V) your own screens onto each device.";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Ferramenta 1 (`list_catalog`): devolve tudo o que o agente precisa saber para
 * compor cenas válidas no Mock Studio — aparelhos, temas, fontes, stickers,
 * assets embutidos, layouts semânticos e animações.
 */
export function listCatalog(options?: { stickerQuery?: string }) {
  const query = options?.stickerQuery ? normalizeSearch(options.stickerQuery) : "";

  const devices = DEVICE_MODEL_IDS.map((id) => {
    const model = DEVICE_MODEL_CATALOG[id];
    return {
      defaultTheme: model.defaultTheme,
      id: model.id,
      name: model.name,
      recommendedUploadSize: model.recommendedUploadSize,
      supportsBezelToggle: id === "tablet" || id === "duo",
      supportsFinish: MODELS_WITH_FINISH.includes(id),
      supportsFold: id === "duo",
      supportsKeyboardToggle: id === "notebook",
      themes: model.themeOptions.map((option) => option.id),
    };
  });

  const fonts = Object.entries(TEXT_FONTS).map(([id, info]) => ({
    id,
    label: info.label,
    weights: [...info.weights],
  }));

  const stickersByCategory: Record<string, string[]> = {};
  for (const category of Object.keys(STICKERS) as StickerCategoryId[]) {
    const ids = STICKERS[category].filter((id) =>
      query ? normalizeSearch(id).includes(query) : true,
    );
    if (ids.length > 0) {
      stickersByCategory[category] = [...ids];
    }
  }

  return {
    animations: [...MCP_ANIMATIONS],
    builtinImages: Object.keys(BUILTIN_IMAGE_ASSETS),
    devices,
    easings: [...EASING_IDS],
    fonts,
    frames: [...MCP_FRAME_PRESETS],
    layouts: [...MCP_LAYOUTS],
    note: SCREENS_UPLOAD_NOTE,
    stickers: stickersByCategory,
  };
}

type DevicePose = {
  foldAngle: number;
  opacity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  /** Em graus do Inspector (0 = de frente para a câmera). */
  rotationY: number;
  rotationZ: number;
  scale: number;
};

/** Calcula poses sem colisão a partir das larguras reais de cada modelo. */
function computeLayoutPoses(
  devices: McpDeviceInput[],
  layout: McpLayout,
): { poses: DevicePose[]; totalSpanUnits: number } {
  const models = devices.map((d) => d.model ?? "smartphone");
  const widths = models.map(
    (id) => DEVICE_MODEL_CATALOG[id].spawnFootprintWidth / OBJECT_POSITION_MULTIPLIER,
  );

  const basePose = (): DevicePose => ({
    foldAngle: DEFAULT_FOLD_ANGLE,
    opacity: 1,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  });

  if (devices.length === 0) {
    return { poses: [], totalSpanUnits: 0 };
  }

  if (layout === "single" || devices.length === 1) {
    const pose = basePose();
    if (layout === "duo-hero") {
      pose.rotationX = 4;
      pose.rotationY = -12;
    }
    return { poses: [pose], totalSpanUnits: widths[0] };
  }

  if (layout === "trio" && devices.length >= 3) {
    const centerWidth = widths[0];
    const leftWidth = widths[1];
    const rightWidth = widths[2];
    const sideScale = 0.88;
    const leftX = -(centerWidth / 2 + (leftWidth * sideScale) / 2 + 0.15);
    const rightX = centerWidth / 2 + (rightWidth * sideScale) / 2 + 0.15;

    const poses: DevicePose[] = devices.map((_, index) => {
      if (index === 0) {
        return { ...basePose(), positionZ: 0.15 };
      }
      if (index === 1) {
        return {
          ...basePose(),
          positionX: leftX,
          positionZ: -0.15,
          rotationY: 12,
          scale: sideScale,
        };
      }
      if (index === 2) {
        return {
          ...basePose(),
          positionX: rightX,
          positionZ: -0.15,
          rotationY: -12,
          scale: sideScale,
        };
      }
      // Aparelhos extras ficam em fila à direita.
      return {
        ...basePose(),
        positionX: rightX + (index - 1) * (widths[index] + DEVICE_GAP_UNITS),
        positionZ: -0.2,
        scale: sideScale,
      };
    });

    const span = rightX - leftX + Math.max(leftWidth, rightWidth) * sideScale;
    return { poses, totalSpanUnits: span };
  }

  // `side-by-side` e `duo-hero` com múltiplos aparelhos: distribui lado a lado
  // usando o footprint real de cada modelo, centrado em X = 0.
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) +
    DEVICE_GAP_UNITS * Math.max(0, widths.length - 1);
  let cursor = -totalWidth / 2;

  const poses = widths.map((w, index) => {
    const x = cursor + w / 2;
    cursor += w + DEVICE_GAP_UNITS;
    return {
      ...basePose(),
      positionX: Number(x.toFixed(3)),
      rotationX: layout === "duo-hero" && index === 0 ? 4 : 0,
      rotationY: layout === "duo-hero" && index === 0 ? -10 : 0,
    };
  });

  return { poses, totalSpanUnits: totalWidth };
}

function toMotionTransform(
  base: MotionTransform,
  patch: McpKeyframeInput,
  baseRotationY: number,
): MotionTransform {
  return {
    foldAngle:
      patch.foldAngle !== undefined
        ? clamp(patch.foldAngle, 0, 180)
        : base.foldAngle,
    letterSpacing: patch.letterSpacing ?? base.letterSpacing,
    opacity:
      patch.opacity !== undefined ? clamp(patch.opacity, 0, 1) : base.opacity,
    positionX: patch.position ? patch.position[0] : base.positionX,
    positionY: patch.position ? patch.position[1] : base.positionY,
    positionZ: patch.position ? patch.position[2] : base.positionZ,
    rotationX: patch.rotation ? patch.rotation[0] : base.rotationX,
    rotationY: patch.rotation
      ? patch.rotation[1] + baseRotationY
      : base.rotationY,
    rotationZ: patch.rotation ? patch.rotation[2] : base.rotationZ,
    scale:
      patch.scale !== undefined ? clamp(patch.scale, 0.1, 3) : base.scale,
    textColor: patch.textColor ?? base.textColor,
  };
}

function buildExplicitKeyframes(
  base: MotionTransform,
  inputs: McpKeyframeInput[],
  baseRotationY: number,
): Keyframe[] {
  return [...inputs]
    .sort((a, b) => a.timeMs - b.timeMs)
    .map((kf) =>
      createKeyframe(
        Math.round(kf.timeMs),
        toMotionTransform(base, kf, baseRotationY),
        kf.easing ?? "ease-in-out",
      ),
    );
}

/** Gera keyframes semânticos para um aparelho conforme o preset de animação. */
function buildPresetDeviceKeyframes(
  object: DeviceObject,
  animation: McpAnimation,
  index: number,
  durationMs: number,
): Keyframe[] {
  const rest: MotionTransform = {
    foldAngle: object.foldAngle,
    opacity: object.opacity,
    positionX: object.positionX,
    positionY: object.positionY,
    positionZ: object.positionZ,
    rotationX: object.rotationX,
    rotationY: object.rotationY,
    rotationZ: object.rotationZ,
    scale: object.scale,
  };

  if (animation === "none") {
    return [];
  }

  const stagger = Math.min(index * 250, Math.floor(durationMs * 0.35));
  const settle = Math.min(stagger + Math.min(1200, Math.floor(durationMs * 0.45)), durationMs);

  if (animation === "duo-open" && object.modelId === "duo") {
    const openEnd = Math.min(stagger + Math.min(1800, Math.floor(durationMs * 0.6)), durationMs);
    return [
      createKeyframe(stagger, { ...rest, foldAngle: 0, opacity: 1 }, "ease-in-out"),
      createKeyframe(openEnd, { ...rest, foldAngle: 180, opacity: 1 }, "ease-in-out"),
      ...(openEnd < durationMs
        ? [createKeyframe(durationMs, { ...rest, foldAngle: 180, opacity: 1 }, "linear")]
        : []),
    ];
  }

  if (animation === "rise") {
    return [
      createKeyframe(
        stagger,
        {
          ...rest,
          opacity: 0,
          positionY: rest.positionY - 0.85,
          scale: Math.max(0.1, Number((rest.scale * 0.94).toFixed(3))),
        },
        "ease-out",
      ),
      createKeyframe(settle, rest, "ease-in-out"),
      ...(settle < durationMs ? [createKeyframe(durationMs, rest, "linear")] : []),
    ];
  }

  // `fade-in` e `orbit` (os aparelhos entram suavemente enquanto a câmera orbita)
  return [
    createKeyframe(
      stagger,
      {
        ...rest,
        opacity: 0,
        scale: Math.max(0.1, Number((rest.scale * 0.92).toFixed(3))),
      },
      "ease-out",
    ),
    createKeyframe(settle, rest, "ease-in-out"),
    ...(settle < durationMs ? [createKeyframe(durationMs, rest, "linear")] : []),
  ];
}

function resolveMotionFrame(
  frame: McpBuildSceneInput["frame"],
): MotionFrame {
  if (!frame) return DEFAULT_MOTION_FRAME;
  if (typeof frame === "string") {
    const preset = MOTION_FRAME_PRESETS.find((item) => item.label === frame);
    return preset ? { height: preset.height, width: preset.width } : DEFAULT_MOTION_FRAME;
  }
  return normalizeMotionFrame(frame) ?? DEFAULT_MOTION_FRAME;
}

function computeDefaultCameraOrbit(
  totalSpanUnits: number,
  frame: MotionFrame,
  mode: "static" | "motion",
): CameraOrbit {
  // Largura em world units + margem confortável para a câmera enquadrar tudo.
  const worldWidth = Math.max(245, totalSpanUnits * OBJECT_POSITION_MULTIPLIER);
  const aspect = mode === "motion" ? frame.width / frame.height : 16 / 9;
  const effectiveAspect = Math.max(0.5, Math.min(2.2, aspect));
  const halfFovRad = ((DEFAULT_CAMERA_FOV / 2) * Math.PI) / 180;
  const distanceForHeight = (540 / 2) / Math.tan(halfFovRad) * 1.45;
  const distanceForWidth =
    ((worldWidth / 2) / (Math.tan(halfFovRad) * effectiveAspect)) * 1.38;

  return {
    azimuth: 0,
    distance: Math.round(Math.max(distanceForHeight, distanceForWidth, 720)),
    elevation: 4,
    fov: DEFAULT_CAMERA_FOV,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
  };
}

export type McpBuildSceneResult = {
  code: string;
  note: string;
  summary: {
    durationMs: number;
    mode: "static" | "motion";
    name: string;
    objectCount: number;
  };
  template: SceneTemplate;
  url: string;
  warnings: string[];
};

/**
 * Ferramenta 2 (`build_scene`): transforma uma especificação declarativa de
 * cena (com layouts e animações semânticas ou overrides manuais) em um
 * `SceneTemplate` normalizado + link `#scene=...` + código de importação.
 */
export async function buildScene(
  rawInput: unknown,
  options?: { baseUrl?: string },
): Promise<McpBuildSceneResult> {
  const input = validateBuildSceneInput(rawInput);
  const warnings: string[] = [];

  const devicesInput = input.devices ?? [];
  const textsInput = input.texts ?? [];
  const stickersInput = input.stickers ?? [];
  const builtinImagesInput = input.builtinImages ?? [];

  const hasExplicitKeyframes =
    devicesInput.some((d) => (d.keyframes?.length ?? 0) > 0) ||
    textsInput.some((t) => (t.keyframes?.length ?? 0) > 0) ||
    stickersInput.some((s) => (s.keyframes?.length ?? 0) > 0) ||
    builtinImagesInput.some((b) => (b.keyframes?.length ?? 0) > 0);

  const animation: McpAnimation = input.animation ?? "none";
  const mode: "static" | "motion" =
    input.mode ?? (animation !== "none" || hasExplicitKeyframes ? "motion" : "static");
  const durationMs = Math.round(input.durationMs ?? DEFAULT_DURATION_MS);
  const motionFrame = resolveMotionFrame(input.frame);

  const layout: McpLayout =
    input.layout ??
    (devicesInput.length >= 3
      ? "trio"
      : devicesInput.length === 2
        ? "side-by-side"
        : devicesInput[0]?.model === "duo"
          ? "duo-hero"
          : "single");

  const { poses, totalSpanUnits } = computeLayoutPoses(devicesInput, layout);
  const sceneObjects: SceneObject[] = [];

  // 1) Aparelhos
  devicesInput.forEach((deviceInput, index) => {
    const modelId: DeviceModelId = deviceInput.model ?? "smartphone";
    const model = DEVICE_MODEL_CATALOG[modelId];
    const layoutPose = poses[index];

    const object = createSceneObject({
      deletable: index > 0,
      modelId,
      name: deviceInput.name?.trim() || `${model.name} ${index + 1}`,
    });

    if (deviceInput.color) {
      object.colors = model.buildColorsFromPrimary(deviceInput.color);
      object.deviceTheme = "custom";
    } else if (deviceInput.theme) {
      if (model.themes[deviceInput.theme]) {
        object.deviceTheme = deviceInput.theme;
        object.colors = { ...model.themes[deviceInput.theme] };
      } else {
        warnings.push(
          `devices[${index}]: unknown theme '${deviceInput.theme}' for '${modelId}', using '${model.defaultTheme}'.`,
        );
      }
    }

    object.positionX = deviceInput.position ? deviceInput.position[0] : layoutPose.positionX;
    object.positionY = deviceInput.position ? deviceInput.position[1] : layoutPose.positionY;
    object.positionZ = deviceInput.position ? deviceInput.position[2] : layoutPose.positionZ;
    object.rotationX = deviceInput.rotation ? deviceInput.rotation[0] : layoutPose.rotationX;
    // Público usa 0° = voltado para a câmera; internamente aparelhos usam +180°.
    object.rotationY =
      (deviceInput.rotation ? deviceInput.rotation[1] : layoutPose.rotationY) +
      DEFAULT_OBJECT_TRANSFORM.rotationY;
    object.rotationZ = deviceInput.rotation ? deviceInput.rotation[2] : layoutPose.rotationZ;
    object.scale = clamp(deviceInput.scale ?? layoutPose.scale, 0.1, 3);
    object.opacity = clamp(deviceInput.opacity ?? layoutPose.opacity, 0, 1);

    if (deviceInput.foldAngle !== undefined) {
      object.foldAngle = clamp(deviceInput.foldAngle, 0, 180);
    }
    if (deviceInput.showShell !== undefined) {
      object.showDeviceShell = deviceInput.showShell;
    }
    if (deviceInput.showKeyboard !== undefined) {
      object.showNotebookKeyboard = deviceInput.showKeyboard;
    }
    if (deviceInput.showBezel !== undefined) {
      object.showTabletBezel = deviceInput.showBezel;
    }
    if (deviceInput.matteFinish !== undefined) {
      object.matteFinish = deviceInput.matteFinish;
    }

    if (mode === "motion") {
      const baseTransform: MotionTransform = {
        foldAngle: object.foldAngle,
        opacity: object.opacity,
        positionX: object.positionX,
        positionY: object.positionY,
        positionZ: object.positionZ,
        rotationX: object.rotationX,
        rotationY: object.rotationY,
        rotationZ: object.rotationZ,
        scale: object.scale,
      };
      object.keyframes = deviceInput.keyframes?.length
        ? buildExplicitKeyframes(
            baseTransform,
            deviceInput.keyframes,
            DEFAULT_OBJECT_TRANSFORM.rotationY,
          )
        : buildPresetDeviceKeyframes(object, animation, index, durationMs);
    }

    sceneObjects.push(object);
  });

  // 2) Textos
  textsInput.forEach((textInput, index) => {
    const font: TextFontId = textInput.font ?? "inter";
    const object = createTextObject({
      content: textInput.content,
      name: textInput.name?.trim() || `Text ${index + 1}`,
      text: {
        align: textInput.align,
        color: textInput.color,
        fontId: font,
        fontSize: textInput.size,
        letterSpacing: textInput.letterSpacing,
        lineHeight: textInput.lineHeight,
        maxWidth: textInput.maxWidth,
        weight:
          textInput.weight !== undefined
            ? getNearestWeight(font, textInput.weight)
            : undefined,
      },
    });

    // Sem posição explícita: posiciona acima dos aparelhos (ou no centro se não há aparelhos).
    object.positionX = textInput.position ? textInput.position[0] : 0;
    object.positionY = textInput.position
      ? textInput.position[1]
      : devicesInput.length > 0
        ? 1.9 - index * 0.65
        : 0;
    object.positionZ = textInput.position ? textInput.position[2] : FLAT_OBJECT_DEFAULT_Z;
    object.rotationX = textInput.rotation ? textInput.rotation[0] : 0;
    object.rotationY = textInput.rotation ? textInput.rotation[1] : 0;
    object.rotationZ = textInput.rotation ? textInput.rotation[2] : 0;
    object.scale = clamp(textInput.scale ?? 1, 0.1, 3);
    object.opacity = clamp(textInput.opacity ?? 1, 0, 1);

    if (mode === "motion" && textInput.keyframes?.length) {
      const baseTransform: MotionTransform = {
        letterSpacing: object.text.letterSpacing,
        opacity: object.opacity,
        positionX: object.positionX,
        positionY: object.positionY,
        positionZ: object.positionZ,
        rotationX: object.rotationX,
        rotationY: object.rotationY,
        rotationZ: object.rotationZ,
        scale: object.scale,
        textColor: object.text.color,
      };
      object.keyframes = buildExplicitKeyframes(baseTransform, textInput.keyframes, 0);
    }

    sceneObjects.push(object);
  });

  // 3) Stickers
  stickersInput.forEach((stickerInput, index) => {
    if (!isStickerId(stickerInput.id)) {
      warnings.push(
        `stickers[${index}]: unknown sticker id '${stickerInput.id}' was ignored.`,
      );
      return;
    }

    const image = getStickerImage(stickerInput.id);
    if (stickerInput.outline !== undefined) image.outline = stickerInput.outline;
    if (stickerInput.shadow !== undefined) image.shadow = stickerInput.shadow;
    if (stickerInput.speed !== undefined) {
      image.speed = normalizeImageSpeed(stickerInput.speed);
    }

    const object = createImageObject({
      image,
      name: stickerInput.name?.trim() || `Sticker ${index + 1}`,
    });

    const autoPos = getImageSpawnPosition(sceneObjects);
    object.positionX = stickerInput.position ? stickerInput.position[0] : autoPos.positionX;
    object.positionY = stickerInput.position ? stickerInput.position[1] : autoPos.positionY;
    object.positionZ = stickerInput.position
      ? stickerInput.position[2]
      : FLAT_OBJECT_DEFAULT_Z;
    object.rotationX = stickerInput.rotation ? stickerInput.rotation[0] : 0;
    object.rotationY = stickerInput.rotation ? stickerInput.rotation[1] : 0;
    object.rotationZ = stickerInput.rotation ? stickerInput.rotation[2] : 0;
    object.scale = clamp(stickerInput.scale ?? 1, 0.1, 3);
    object.opacity = clamp(stickerInput.opacity ?? 1, 0, 1);

    if (mode === "motion" && stickerInput.keyframes?.length) {
      const baseTransform: MotionTransform = {
        opacity: object.opacity,
        positionX: object.positionX,
        positionY: object.positionY,
        positionZ: object.positionZ,
        rotationX: object.rotationX,
        rotationY: object.rotationY,
        rotationZ: object.rotationZ,
        scale: object.scale,
      };
      object.keyframes = buildExplicitKeyframes(baseTransform, stickerInput.keyframes, 0);
    }

    sceneObjects.push(object);
  });

  // 4) Assets embutidos (ex.: mock-studio-logo)
  builtinImagesInput.forEach((assetInput, index) => {
    if (!isBuiltinImageAssetId(assetInput.assetId)) {
      warnings.push(
        `builtinImages[${index}]: unknown builtin asset '${String(assetInput.assetId)}' was ignored.`,
      );
      return;
    }

    const object = createImageObject({
      image: {
        ...getBuiltinAssetImage(assetInput.assetId),
        ...(assetInput.outline !== undefined ? { outline: assetInput.outline } : {}),
        ...(assetInput.shadow !== undefined ? { shadow: assetInput.shadow } : {}),
      },
      name: assetInput.name?.trim() || `Asset ${index + 1}`,
    });

    const autoPos = getImageSpawnPosition(sceneObjects);
    object.positionX = assetInput.position ? assetInput.position[0] : autoPos.positionX;
    object.positionY = assetInput.position ? assetInput.position[1] : autoPos.positionY;
    object.positionZ = assetInput.position
      ? assetInput.position[2]
      : FLAT_OBJECT_DEFAULT_Z;
    object.rotationX = assetInput.rotation ? assetInput.rotation[0] : 0;
    object.rotationY = assetInput.rotation ? assetInput.rotation[1] : 0;
    object.rotationZ = assetInput.rotation ? assetInput.rotation[2] : 0;
    object.scale = clamp(assetInput.scale ?? 1, 0.1, 3);
    object.opacity = clamp(assetInput.opacity ?? 1, 0, 1);

    if (mode === "motion" && assetInput.keyframes?.length) {
      const baseTransform: MotionTransform = {
        opacity: object.opacity,
        positionX: object.positionX,
        positionY: object.positionY,
        positionZ: object.positionZ,
        rotationX: object.rotationX,
        rotationY: object.rotationY,
        rotationZ: object.rotationZ,
        scale: object.scale,
      };
      object.keyframes = buildExplicitKeyframes(baseTransform, assetInput.keyframes, 0);
    }

    sceneObjects.push(object);
  });

  // 5) Câmera (enquadramento automático ou explícito + órbita no preset `orbit`)
  const defaultOrbit = computeDefaultCameraOrbit(totalSpanUnits, motionFrame, mode);
  const cameraOrbit = normalizeOrbit({
    ...defaultOrbit,
    ...(input.camera ?? {}),
  });
  const cameraPose: CameraPose = orbitToLookAt(cameraOrbit);

  if (mode === "motion" && animation === "orbit") {
    const cameraObj = createCameraObject({ name: "Camera" });
    cameraObj.keyframes = [
      createCameraKeyframe(0, {
        ...cameraOrbit,
        azimuth: cameraOrbit.azimuth - 22,
        elevation: cameraOrbit.elevation + 2,
      }),
      createCameraKeyframe(durationMs, {
        ...cameraOrbit,
        azimuth: cameraOrbit.azimuth + 22,
      }),
    ];
    sceneObjects.unshift(cameraObj);
  }

  // 6) Fundo e grade
  const backgroundColor = input.background?.color ?? null;
  const background: CanvasBackground = input.background
    ? normalizeCanvasBackground({
        gradient: input.background.gradient,
        style:
          input.background.style ??
          (input.background.gradient ? "flat" : DEFAULT_CANVAS_BACKGROUND.style),
      })
    : DEFAULT_CANVAS_BACKGROUND;
  const grid: CanvasGrid = input.background?.grid
    ? normalizeCanvasGrid(input.background.grid)
    : DEFAULT_CANVAS_GRID;

  const sceneName = input.name ?? DEFAULT_SCENE_NAME;
  const template = normalizeTemplate(
    createSceneTemplate({
      background,
      backgroundColor,
      camera: cameraPose,
      frame: mode === "motion" ? motionFrame : undefined,
      grid,
      mode,
      name: sceneName,
      objects: sceneObjects,
    }),
  );

  if (!isValidTemplate(template)) {
    throw new Error("Generated scene template failed internal validation.");
  }

  const baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL;
  const code = await createSceneCode(template);
  const url = await createSceneLink(template, baseUrl);

  return {
    code,
    note: SCREENS_UPLOAD_NOTE,
    summary: {
      durationMs: mode === "motion" ? durationMs : 0,
      mode,
      name: sceneName,
      objectCount: template.objects.length,
    },
    template,
    url,
    warnings,
  };
}
