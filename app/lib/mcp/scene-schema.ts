import {
  DEVICE_MODEL_CATALOG,
  DEVICE_MODEL_IDS,
  type DeviceModelId,
} from "../../models/device-catalog";
import type { BuiltinImageAssetId } from "../image-objects";
import { EASING_IDS, type EasingId } from "../scene-motion";
import { TEXT_FONTS, type TextFontId } from "../text-fonts";

// ---------------------------------------------------------------------------
// Esquema público e validação das ferramentas MCP.
//
// Intencionalmente separado do `SceneTemplate` interno: o formato interno pode
// evoluir livremente sem quebrar o contrato exposto aos agentes de IA.
// ---------------------------------------------------------------------------

export const MCP_LAYOUTS = ["single", "side-by-side", "trio", "duo-hero"] as const;
export type McpLayout = (typeof MCP_LAYOUTS)[number];

export const MCP_ANIMATIONS = [
  "none",
  "fade-in",
  "rise",
  "orbit",
  "duo-open",
] as const;
export type McpAnimation = (typeof MCP_ANIMATIONS)[number];

export const MCP_FRAME_PRESETS = ["16:9", "1:1", "4:5", "9:16"] as const;
export type McpFramePreset = (typeof MCP_FRAME_PRESETS)[number];

export const MAX_MCP_OBJECTS = 20;
export const MAX_MCP_KEYFRAMES_PER_OBJECT = 30;
export const MAX_MCP_NAME_LENGTH = 80;
export const MIN_MCP_DURATION_MS = 500;
export const MAX_MCP_DURATION_MS = 60_000;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class McpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpValidationError";
  }
}

export type Vec3 = [number, number, number];

export type McpKeyframeInput = {
  easing?: EasingId;
  foldAngle?: number;
  letterSpacing?: number;
  opacity?: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  textColor?: string;
  timeMs: number;
};

export type McpDeviceInput = {
  /** Cor primária em hex (#RRGGBB); sobrescreve o tema se informada. */
  color?: string;
  foldAngle?: number;
  keyframes?: McpKeyframeInput[];
  matteFinish?: boolean;
  model?: DeviceModelId;
  name?: string;
  opacity?: number;
  /** Coordenadas no espaço do editor (centro em 0). */
  position?: Vec3;
  /** Graus no espaço do Inspector (0 em Y = voltado para a câmera). */
  rotation?: Vec3;
  scale?: number;
  showBezel?: boolean;
  showKeyboard?: boolean;
  showShell?: boolean;
  theme?: string;
};

export type McpTextInput = {
  align?: "left" | "center" | "right";
  color?: string;
  content: string;
  font?: TextFontId;
  keyframes?: McpKeyframeInput[];
  letterSpacing?: number;
  lineHeight?: number;
  maxWidth?: number | null;
  name?: string;
  opacity?: number;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  size?: number;
  weight?: number;
};

export type McpStickerInput = {
  id: string;
  keyframes?: McpKeyframeInput[];
  name?: string;
  opacity?: number;
  outline?: boolean;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  shadow?: boolean;
  speed?: number;
};

export type McpBuiltinImageInput = {
  assetId: BuiltinImageAssetId;
  keyframes?: McpKeyframeInput[];
  name?: string;
  opacity?: number;
  outline?: boolean;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  shadow?: boolean;
};

export type McpBackgroundInput = {
  color?: string;
  gradient?: { angle?: number; color: string } | null;
  grid?: { color?: string | null; opacity?: number };
  style?: "floor" | "flat";
};

export type McpCameraInput = {
  azimuth?: number;
  distance?: number;
  elevation?: number;
  fov?: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
};

export type McpBuildSceneInput = {
  animation?: McpAnimation;
  background?: McpBackgroundInput;
  builtinImages?: McpBuiltinImageInput[];
  camera?: McpCameraInput;
  devices?: McpDeviceInput[];
  durationMs?: number;
  frame?: McpFramePreset | { height: number; width: number };
  layout?: McpLayout;
  mode?: "static" | "motion";
  name?: string;
  stickers?: McpStickerInput[];
  texts?: McpTextInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new McpValidationError(`${path} must be a finite number.`);
  }
  return value;
}

function assertVec3(value: unknown, path: string): Vec3 {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    throw new McpValidationError(`${path} must be an array of 3 finite numbers [x, y, z].`);
  }
  return [value[0], value[1], value[2]];
}

function assertHex(value: unknown, path: string): string {
  if (typeof value !== "string" || !HEX_COLOR.test(value)) {
    throw new McpValidationError(`${path} must be a 6-digit hex color like #121212.`);
  }
  return value;
}

function assertOptionalBool(value: unknown, path: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new McpValidationError(`${path} must be a boolean.`);
  }
  return value;
}

function assertOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new McpValidationError(`${path} must be a string.`);
  }
  return value;
}

function assertOptionalName(value: unknown, path: string): string | undefined {
  const raw = assertOptionalString(value, path);
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length > MAX_MCP_NAME_LENGTH) {
    throw new McpValidationError(
      `${path} exceeds the maximum of ${MAX_MCP_NAME_LENGTH} characters.`,
    );
  }
  return trimmed;
}

function validateKeyframes(raw: unknown, path: string): McpKeyframeInput[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new McpValidationError(`${path} must be an array of keyframes.`);
  }
  if (raw.length > MAX_MCP_KEYFRAMES_PER_OBJECT) {
    throw new McpValidationError(
      `${path} exceeds the maximum of ${MAX_MCP_KEYFRAMES_PER_OBJECT} keyframes per object.`,
    );
  }

  return raw.map((item, idx) => {
    const itemPath = `${path}[${idx}]`;
    if (!isRecord(item)) {
      throw new McpValidationError(`${itemPath} must be an object.`);
    }
    const timeMs = assertFiniteNumber(item.timeMs, `${itemPath}.timeMs`);
    if (timeMs < 0 || timeMs > MAX_MCP_DURATION_MS) {
      throw new McpValidationError(
        `${itemPath}.timeMs must be between 0 and ${MAX_MCP_DURATION_MS}.`,
      );
    }

    let easing: EasingId | undefined;
    if (item.easing !== undefined) {
      if (
        typeof item.easing !== "string" ||
        !(EASING_IDS as readonly string[]).includes(item.easing)
      ) {
        throw new McpValidationError(
          `${itemPath}.easing '${String(item.easing)}' is not valid. Valid easings: ${EASING_IDS.join(", ")}.`,
        );
      }
      easing = item.easing as EasingId;
    }

    return {
      easing,
      foldAngle:
        item.foldAngle !== undefined
          ? assertFiniteNumber(item.foldAngle, `${itemPath}.foldAngle`)
          : undefined,
      letterSpacing:
        item.letterSpacing !== undefined
          ? assertFiniteNumber(item.letterSpacing, `${itemPath}.letterSpacing`)
          : undefined,
      opacity:
        item.opacity !== undefined
          ? assertFiniteNumber(item.opacity, `${itemPath}.opacity`)
          : undefined,
      position:
        item.position !== undefined
          ? assertVec3(item.position, `${itemPath}.position`)
          : undefined,
      rotation:
        item.rotation !== undefined
          ? assertVec3(item.rotation, `${itemPath}.rotation`)
          : undefined,
      scale:
        item.scale !== undefined
          ? assertFiniteNumber(item.scale, `${itemPath}.scale`)
          : undefined,
      textColor:
        item.textColor !== undefined
          ? assertHex(item.textColor, `${itemPath}.textColor`)
          : undefined,
      timeMs,
    };
  });
}

/** Valida a entrada bruta de `build_scene` e devolve um objeto tipado e seguro. */
export function validateBuildSceneInput(raw: unknown): McpBuildSceneInput {
  if (!isRecord(raw)) {
    throw new McpValidationError("Scene input must be a JSON object.");
  }

  const name = assertOptionalName(raw.name, "name");

  let mode: "static" | "motion" | undefined;
  if (raw.mode !== undefined) {
    if (raw.mode !== "static" && raw.mode !== "motion") {
      throw new McpValidationError("mode must be 'static' or 'motion'.");
    }
    mode = raw.mode;
  }

  let layout: McpLayout | undefined;
  if (raw.layout !== undefined) {
    if (
      typeof raw.layout !== "string" ||
      !(MCP_LAYOUTS as readonly string[]).includes(raw.layout)
    ) {
      throw new McpValidationError(
        `layout '${String(raw.layout)}' is not valid. Valid layouts: ${MCP_LAYOUTS.join(", ")}.`,
      );
    }
    layout = raw.layout as McpLayout;
  }

  let animation: McpAnimation | undefined;
  if (raw.animation !== undefined) {
    if (
      typeof raw.animation !== "string" ||
      !(MCP_ANIMATIONS as readonly string[]).includes(raw.animation)
    ) {
      throw new McpValidationError(
        `animation '${String(raw.animation)}' is not valid. Valid animations: ${MCP_ANIMATIONS.join(", ")}.`,
      );
    }
    animation = raw.animation as McpAnimation;
  }

  let durationMs: number | undefined;
  if (raw.durationMs !== undefined) {
    durationMs = assertFiniteNumber(raw.durationMs, "durationMs");
    if (durationMs < MIN_MCP_DURATION_MS || durationMs > MAX_MCP_DURATION_MS) {
      throw new McpValidationError(
        `durationMs must be between ${MIN_MCP_DURATION_MS} and ${MAX_MCP_DURATION_MS}.`,
      );
    }
  }

  let frame: McpBuildSceneInput["frame"];
  if (raw.frame !== undefined) {
    if (typeof raw.frame === "string") {
      if (!(MCP_FRAME_PRESETS as readonly string[]).includes(raw.frame)) {
        throw new McpValidationError(
          `frame '${raw.frame}' is not valid. Valid presets: ${MCP_FRAME_PRESETS.join(", ")}, or { width, height }.`,
        );
      }
      frame = raw.frame as McpFramePreset;
    } else if (isRecord(raw.frame)) {
      frame = {
        height: assertFiniteNumber(raw.frame.height, "frame.height"),
        width: assertFiniteNumber(raw.frame.width, "frame.width"),
      };
    } else {
      throw new McpValidationError(
        `frame must be a preset (${MCP_FRAME_PRESETS.join(", ")}) or { width, height }.`,
      );
    }
  }

  let background: McpBackgroundInput | undefined;
  if (raw.background !== undefined) {
    if (!isRecord(raw.background)) {
      throw new McpValidationError("background must be an object.");
    }
    const style = raw.background.style;
    if (style !== undefined && style !== "floor" && style !== "flat") {
      throw new McpValidationError("background.style must be 'floor' or 'flat'.");
    }
    let gradient: McpBackgroundInput["gradient"];
    if (raw.background.gradient === null) {
      gradient = null;
    } else if (raw.background.gradient !== undefined) {
      if (!isRecord(raw.background.gradient)) {
        throw new McpValidationError("background.gradient must be an object or null.");
      }
      gradient = {
        angle:
          raw.background.gradient.angle !== undefined
            ? assertFiniteNumber(raw.background.gradient.angle, "background.gradient.angle")
            : undefined,
        color: assertHex(raw.background.gradient.color, "background.gradient.color"),
      };
    }
    let grid: McpBackgroundInput["grid"];
    if (raw.background.grid !== undefined) {
      if (!isRecord(raw.background.grid)) {
        throw new McpValidationError("background.grid must be an object.");
      }
      grid = {
        color:
          raw.background.grid.color === null || raw.background.grid.color === undefined
            ? (raw.background.grid.color as null | undefined)
            : assertHex(raw.background.grid.color, "background.grid.color"),
        opacity:
          raw.background.grid.opacity !== undefined
            ? assertFiniteNumber(raw.background.grid.opacity, "background.grid.opacity")
            : undefined,
      };
    }
    background = {
      color:
        raw.background.color !== undefined
          ? assertHex(raw.background.color, "background.color")
          : undefined,
      gradient,
      grid,
      style,
    };
  }

  let camera: McpCameraInput | undefined;
  if (raw.camera !== undefined) {
    if (!isRecord(raw.camera)) {
      throw new McpValidationError("camera must be an object.");
    }
    camera = {
      azimuth:
        raw.camera.azimuth !== undefined
          ? assertFiniteNumber(raw.camera.azimuth, "camera.azimuth")
          : undefined,
      distance:
        raw.camera.distance !== undefined
          ? assertFiniteNumber(raw.camera.distance, "camera.distance")
          : undefined,
      elevation:
        raw.camera.elevation !== undefined
          ? assertFiniteNumber(raw.camera.elevation, "camera.elevation")
          : undefined,
      fov:
        raw.camera.fov !== undefined
          ? assertFiniteNumber(raw.camera.fov, "camera.fov")
          : undefined,
      targetX:
        raw.camera.targetX !== undefined
          ? assertFiniteNumber(raw.camera.targetX, "camera.targetX")
          : undefined,
      targetY:
        raw.camera.targetY !== undefined
          ? assertFiniteNumber(raw.camera.targetY, "camera.targetY")
          : undefined,
      targetZ:
        raw.camera.targetZ !== undefined
          ? assertFiniteNumber(raw.camera.targetZ, "camera.targetZ")
          : undefined,
    };
  }

  let devices: McpDeviceInput[] | undefined;
  if (raw.devices !== undefined) {
    if (!Array.isArray(raw.devices)) {
      throw new McpValidationError("devices must be an array.");
    }
    devices = raw.devices.map((item, idx) => {
      const p = `devices[${idx}]`;
      if (!isRecord(item)) {
        throw new McpValidationError(`${p} must be an object.`);
      }
      let model: DeviceModelId | undefined;
      if (item.model !== undefined) {
        if (
          typeof item.model !== "string" ||
          !Object.hasOwn(DEVICE_MODEL_CATALOG, item.model)
        ) {
          throw new McpValidationError(
            `${p}.model '${String(item.model)}' is not valid. Valid models: ${DEVICE_MODEL_IDS.join(", ")}.`,
          );
        }
        model = item.model as DeviceModelId;
      }
      return {
        color:
          item.color !== undefined ? assertHex(item.color, `${p}.color`) : undefined,
        foldAngle:
          item.foldAngle !== undefined
            ? assertFiniteNumber(item.foldAngle, `${p}.foldAngle`)
            : undefined,
        keyframes: validateKeyframes(item.keyframes, `${p}.keyframes`),
        matteFinish: assertOptionalBool(item.matteFinish, `${p}.matteFinish`),
        model,
        name: assertOptionalName(item.name, `${p}.name`),
        opacity:
          item.opacity !== undefined
            ? assertFiniteNumber(item.opacity, `${p}.opacity`)
            : undefined,
        position:
          item.position !== undefined
            ? assertVec3(item.position, `${p}.position`)
            : undefined,
        rotation:
          item.rotation !== undefined
            ? assertVec3(item.rotation, `${p}.rotation`)
            : undefined,
        scale:
          item.scale !== undefined
            ? assertFiniteNumber(item.scale, `${p}.scale`)
            : undefined,
        showBezel: assertOptionalBool(item.showBezel, `${p}.showBezel`),
        showKeyboard: assertOptionalBool(item.showKeyboard, `${p}.showKeyboard`),
        showShell: assertOptionalBool(item.showShell, `${p}.showShell`),
        theme: assertOptionalString(item.theme, `${p}.theme`),
      };
    });
  }

  let texts: McpTextInput[] | undefined;
  if (raw.texts !== undefined) {
    if (!Array.isArray(raw.texts)) {
      throw new McpValidationError("texts must be an array.");
    }
    texts = raw.texts.map((item, idx) => {
      const p = `texts[${idx}]`;
      if (!isRecord(item)) {
        throw new McpValidationError(`${p} must be an object.`);
      }
      if (typeof item.content !== "string" || item.content.trim().length === 0) {
        throw new McpValidationError(`${p}.content must be a non-empty string.`);
      }
      let font: TextFontId | undefined;
      if (item.font !== undefined) {
        if (typeof item.font !== "string" || !Object.hasOwn(TEXT_FONTS, item.font)) {
          throw new McpValidationError(
            `${p}.font '${String(item.font)}' is not valid. Valid fonts: ${Object.keys(TEXT_FONTS).join(", ")}.`,
          );
        }
        font = item.font as TextFontId;
      }
      let align: McpTextInput["align"];
      if (item.align !== undefined) {
        if (item.align !== "left" && item.align !== "center" && item.align !== "right") {
          throw new McpValidationError(`${p}.align must be 'left', 'center', or 'right'.`);
        }
        align = item.align;
      }
      return {
        align,
        color:
          item.color !== undefined ? assertHex(item.color, `${p}.color`) : undefined,
        content: item.content,
        font,
        keyframes: validateKeyframes(item.keyframes, `${p}.keyframes`),
        letterSpacing:
          item.letterSpacing !== undefined
            ? assertFiniteNumber(item.letterSpacing, `${p}.letterSpacing`)
            : undefined,
        lineHeight:
          item.lineHeight !== undefined
            ? assertFiniteNumber(item.lineHeight, `${p}.lineHeight`)
            : undefined,
        maxWidth:
          item.maxWidth === null || item.maxWidth === undefined
            ? (item.maxWidth as null | undefined)
            : assertFiniteNumber(item.maxWidth, `${p}.maxWidth`),
        name: assertOptionalName(item.name, `${p}.name`),
        opacity:
          item.opacity !== undefined
            ? assertFiniteNumber(item.opacity, `${p}.opacity`)
            : undefined,
        position:
          item.position !== undefined
            ? assertVec3(item.position, `${p}.position`)
            : undefined,
        rotation:
          item.rotation !== undefined
            ? assertVec3(item.rotation, `${p}.rotation`)
            : undefined,
        scale:
          item.scale !== undefined
            ? assertFiniteNumber(item.scale, `${p}.scale`)
            : undefined,
        size:
          item.size !== undefined
            ? assertFiniteNumber(item.size, `${p}.size`)
            : undefined,
        weight:
          item.weight !== undefined
            ? assertFiniteNumber(item.weight, `${p}.weight`)
            : undefined,
      };
    });
  }

  let stickers: McpStickerInput[] | undefined;
  if (raw.stickers !== undefined) {
    if (!Array.isArray(raw.stickers)) {
      throw new McpValidationError("stickers must be an array.");
    }
    stickers = raw.stickers.map((item, idx) => {
      const p = `stickers[${idx}]`;
      if (!isRecord(item)) {
        throw new McpValidationError(`${p} must be an object.`);
      }
      if (typeof item.id !== "string" || item.id.trim().length === 0) {
        throw new McpValidationError(`${p}.id must be a non-empty string.`);
      }
      return {
        id: item.id.trim(),
        keyframes: validateKeyframes(item.keyframes, `${p}.keyframes`),
        name: assertOptionalName(item.name, `${p}.name`),
        opacity:
          item.opacity !== undefined
            ? assertFiniteNumber(item.opacity, `${p}.opacity`)
            : undefined,
        outline: assertOptionalBool(item.outline, `${p}.outline`),
        position:
          item.position !== undefined
            ? assertVec3(item.position, `${p}.position`)
            : undefined,
        rotation:
          item.rotation !== undefined
            ? assertVec3(item.rotation, `${p}.rotation`)
            : undefined,
        scale:
          item.scale !== undefined
            ? assertFiniteNumber(item.scale, `${p}.scale`)
            : undefined,
        shadow: assertOptionalBool(item.shadow, `${p}.shadow`),
        speed:
          item.speed !== undefined
            ? assertFiniteNumber(item.speed, `${p}.speed`)
            : undefined,
      };
    });
  }

  let builtinImages: McpBuiltinImageInput[] | undefined;
  if (raw.builtinImages !== undefined) {
    if (!Array.isArray(raw.builtinImages)) {
      throw new McpValidationError("builtinImages must be an array.");
    }
    builtinImages = raw.builtinImages.map((item, idx) => {
      const p = `builtinImages[${idx}]`;
      if (!isRecord(item)) {
        throw new McpValidationError(`${p} must be an object.`);
      }
      if (typeof item.assetId !== "string" || item.assetId.trim().length === 0) {
        throw new McpValidationError(`${p}.assetId must be a non-empty string.`);
      }
      return {
        assetId: item.assetId.trim() as BuiltinImageAssetId,
        keyframes: validateKeyframes(item.keyframes, `${p}.keyframes`),
        name: assertOptionalName(item.name, `${p}.name`),
        opacity:
          item.opacity !== undefined
            ? assertFiniteNumber(item.opacity, `${p}.opacity`)
            : undefined,
        outline: assertOptionalBool(item.outline, `${p}.outline`),
        position:
          item.position !== undefined
            ? assertVec3(item.position, `${p}.position`)
            : undefined,
        rotation:
          item.rotation !== undefined
            ? assertVec3(item.rotation, `${p}.rotation`)
            : undefined,
        scale:
          item.scale !== undefined
            ? assertFiniteNumber(item.scale, `${p}.scale`)
            : undefined,
        shadow: assertOptionalBool(item.shadow, `${p}.shadow`),
      };
    });
  }

  const totalObjects =
    (devices?.length ?? 0) +
    (texts?.length ?? 0) +
    (stickers?.length ?? 0) +
    (builtinImages?.length ?? 0);

  if (totalObjects === 0) {
    throw new McpValidationError(
      "Scene must include at least one object (devices, texts, stickers, or builtinImages).",
    );
  }
  if (totalObjects > MAX_MCP_OBJECTS) {
    throw new McpValidationError(
      `Scene has ${totalObjects} objects, exceeding the limit of ${MAX_MCP_OBJECTS}.`,
    );
  }

  return {
    animation,
    background,
    builtinImages,
    camera,
    devices,
    durationMs,
    frame,
    layout,
    mode,
    name: name || undefined,
    stickers,
    texts,
  };
}
