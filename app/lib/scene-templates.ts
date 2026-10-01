"use client";

import { DEVICE_MODELS, type DeviceModelId } from "../models/device-models";
import {
  DEFAULT_SCREEN_FIT,
  getPlaceholderImageUrl,
  type SceneObject,
} from "./scene-objects";
import {
  EASING_IDS,
  type CubicBezier,
  type EasingId,
  type MotionTransform,
} from "./scene-motion";
import { normalizeMotionFrame, type MotionFrame } from "./motion-frame";

// ---------------------------------------------------------------------------
// Templates de cena — composição reutilizável salva no localStorage.
//
// O template guarda a estrutura (dispositivos, transforms, cores, toggles,
// fundo e enquadramento da câmera), mas NÃO as imagens enviadas: ao aplicar,
// cada tela volta ao placeholder. Isso mantém o peso em ~2KB por template,
// bem longe da cota do localStorage, já que uma única imagem em base64
// costuma passar de 1MB.
//
// Estático e Movimento são ambientes separados, cada um com a sua lista: o
// template guarda o `mode` em que foi salvo e a UI só lista os do modo atual.
// Só os de Movimento carregam keyframes (~150 bytes cada) e o tamanho do
// quadro do vídeo.
//
// Por que o schema continua na versão 1: `mode` e `keyframes` são campos
// opcionais — template sem `mode` é Estático, objeto sem `keyframes` não tem
// animação. Subir a versão faria uma cópia antiga do app (o PWA pode servir
// uma do cache) ler zero templates e, ao salvar, sobrescrever a lista
// inteira. Com campos opcionais ela apenas ignora o que não conhece.
// ---------------------------------------------------------------------------

const TEMPLATES_STORAGE_KEY = "mock-photo-templates";
const TEMPLATE_SCHEMA_VERSION = 1;

export type TemplateMode = "static" | "motion";

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

// Keyframe salvo sem id: ids são recriados a cada aplicação, porque a seleção
// da timeline os procura na cena toda e aplicar o mesmo template duas vezes
// não pode repeti-los.
export type TemplateKeyframe = {
  bezier?: CubicBezier;
  easing: EasingId;
  timeMs: number;
  transform: MotionTransform;
};

// Campos do SceneObject preservados no template. Ficam de fora `id` (recriado
// a cada aplicação), `imageUrl` (volta ao placeholder), `deletable` (derivado
// da posição na lista) e o estado de debug (ferramenta de desenvolvimento).
export type TemplateObject = {
  colors: Record<string, string>;
  deviceTheme: string;
  isVisible: boolean;
  /** Só em templates de Movimento. */
  keyframes?: TemplateKeyframe[];
  matteColors: boolean;
  modelId: DeviceModelId;
  name: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  /** Templates de antes da opacidade não a têm: valem 100%. */
  opacity?: number;
  showDeviceShell: boolean;
  showNotebookKeyboard: boolean;
  showTabletBezel: boolean;
};

export type SceneTemplate = {
  backgroundColor: string | null;
  camera: CameraPose | null;
  createdAt: number;
  /** Só em templates de Movimento; sem ele, o quadro padrão (1920 × 1080). */
  frame?: MotionFrame;
  id: string;
  mode: TemplateMode;
  name: string;
  objects: TemplateObject[];
};

type StoredTemplates = {
  templates: SceneTemplate[];
  version: number;
};

function toTemplateObject(
  object: SceneObject,
  mode: TemplateMode,
): TemplateObject {
  return {
    ...(mode === "motion"
      ? {
          keyframes: object.keyframes.map(
            ({ bezier, easing, timeMs, transform }) => ({
              ...(bezier ? { bezier: [...bezier] as CubicBezier } : {}),
              easing,
              timeMs,
              transform: { ...transform },
            }),
          ),
        }
      : {}),
    colors: { ...object.colors },
    deviceTheme: object.deviceTheme,
    isVisible: object.isVisible,
    matteColors: object.matteColors,
    modelId: object.modelId,
    name: object.name,
    positionX: object.positionX,
    positionY: object.positionY,
    positionZ: object.positionZ,
    rotationX: object.rotationX,
    rotationY: object.rotationY,
    rotationZ: object.rotationZ,
    scale: object.scale,
    opacity: object.opacity,
    showDeviceShell: object.showDeviceShell,
    showNotebookKeyboard: object.showNotebookKeyboard,
    showTabletBezel: object.showTabletBezel,
  };
}

export function createSceneTemplate({
  backgroundColor = null,
  camera = null,
  frame = null,
  id,
  mode = "static",
  name,
  objects,
}: {
  backgroundColor?: string | null;
  camera?: CameraPose | null;
  frame?: MotionFrame | null;
  id?: string;
  mode?: TemplateMode;
  name: string;
  objects: SceneObject[];
}): SceneTemplate {
  return {
    backgroundColor,
    camera,
    createdAt: Date.now(),
    ...(mode === "motion" && frame ? { frame: { ...frame } } : {}),
    id: id ?? crypto.randomUUID(),
    mode,
    name,
    objects: objects.map((object) => toTemplateObject(object, mode)),
  };
}

// Reconstrói os objetos da cena a partir do template. O primeiro objeto herda
// `deletable: false` para preservar o invariante de sempre haver uma camada.
// Templates estáticos reconstroem os objetos sem keyframes.
export function applySceneTemplate(template: SceneTemplate): SceneObject[] {
  return template.objects.map((object, index) => {
    const model = DEVICE_MODELS[object.modelId];

    return {
      colors: { ...object.colors },
      debugMode: false,
      debugPartColors: { ...model.initialDebugColors },
      deletable: index > 0,
      keyframes: (object.keyframes ?? []).map((keyframe) => ({
        ...keyframe,
        ...(keyframe.bezier
          ? { bezier: [...keyframe.bezier] as CubicBezier }
          : {}),
        id: crypto.randomUUID(),
        transform: {
          ...keyframe.transform,
          // Keyframes salvos antes da opacidade não a têm: 100%.
          opacity: keyframe.transform.opacity ?? 1,
        },
      })),
      deviceTheme: object.deviceTheme,
      id: crypto.randomUUID(),
      imageFit: { ...DEFAULT_SCREEN_FIT },
      imageName: null,
      imageUrl: getPlaceholderImageUrl(object.modelId),
      isVisible: object.isVisible,
      matteColors: object.matteColors,
      modelId: object.modelId,
      screenSource: "image",
      screenVideo: null,
      name: object.name,
      positionX: object.positionX,
      positionY: object.positionY,
      positionZ: object.positionZ,
      rotationX: object.rotationX,
      rotationY: object.rotationY,
      rotationZ: object.rotationZ,
      scale: object.scale,
      opacity: object.opacity ?? 1,
      showDeviceShell: object.showDeviceShell,
      showNotebookKeyboard: object.showNotebookKeyboard,
      showTabletBezel: object.showTabletBezel,
    };
  });
}

/**
 * Impressão digital do que um template deste modo guardaria da cena. Serve
 * para saber se há alterações não salvas: câmera e imagens ficam de fora de
 * propósito — a câmera mexe o tempo todo e as imagens nunca entram no template.
 */
export function getTemplateSnapshot(
  objects: SceneObject[],
  mode: TemplateMode,
  backgroundColor: string | null,
  frame: MotionFrame | null = null,
) {
  return JSON.stringify({
    backgroundColor,
    ...(mode === "motion" && frame ? { frame } : {}),
    objects: objects.map((object) => toTemplateObject(object, mode)),
  });
}

export function getTemplatesForMode(
  templates: SceneTemplate[],
  mode: TemplateMode,
) {
  return templates.filter((template) => template.mode === mode);
}

/** Recebe só a lista do modo atual: cada ambiente numera os seus. */
export function getNextTemplateName(templates: SceneTemplate[]) {
  return `Template ${templates.length + 1}`;
}

// ---------------------------------------------------------------------------
// Persistência — leitura defensiva: qualquer dado corrompido, de outra versão
// ou apontando para um modelo inexistente é descartado em vez de quebrar a UI.
// ---------------------------------------------------------------------------
function isValidTemplateObject(value: unknown): value is TemplateObject {
  if (!value || typeof value !== "object") {
    return false;
  }

  const object = value as Partial<TemplateObject>;

  return (
    typeof object.modelId === "string" &&
    object.modelId in DEVICE_MODELS &&
    typeof object.name === "string" &&
    typeof object.positionX === "number" &&
    typeof object.positionY === "number" &&
    typeof object.positionZ === "number" &&
    typeof object.rotationX === "number" &&
    typeof object.rotationY === "number" &&
    typeof object.rotationZ === "number" &&
    typeof object.scale === "number"
  );
}

// Obrigatórias num keyframe salvo. A opacidade veio depois e é opcional:
// sem ela, o keyframe vale 100%.
const TRANSFORM_KEYS: Array<keyof MotionTransform> = [
  "positionX",
  "positionY",
  "positionZ",
  "rotationX",
  "rotationY",
  "rotationZ",
  "scale",
];

function isValidKeyframe(value: unknown): value is TemplateKeyframe {
  if (!value || typeof value !== "object") {
    return false;
  }

  const keyframe = value as Partial<TemplateKeyframe>;
  const transform = keyframe.transform as Record<string, unknown> | undefined;

  return (
    typeof keyframe.timeMs === "number" &&
    keyframe.timeMs >= 0 &&
    EASING_IDS.includes(keyframe.easing as EasingId) &&
    (keyframe.bezier === undefined ||
      (Array.isArray(keyframe.bezier) &&
        keyframe.bezier.length === 4 &&
        keyframe.bezier.every((value) => typeof value === "number"))) &&
    !!transform &&
    TRANSFORM_KEYS.every((key) => typeof transform[key] === "number") &&
    (transform.opacity === undefined || typeof transform.opacity === "number")
  );
}

/**
 * Completa o que os campos opcionais deixam de fora. Keyframes corrompidos
 * derrubam só a animação daquele objeto, não o template inteiro.
 */
function normalizeTemplate(template: SceneTemplate): SceneTemplate {
  const mode: TemplateMode = template.mode === "motion" ? "motion" : "static";
  const { frame: storedFrame, ...fields } = template;
  const frame = mode === "motion" ? normalizeMotionFrame(storedFrame) : null;

  return {
    ...fields,
    ...(frame ? { frame } : {}),
    mode,
    objects: template.objects.map((object) => {
      const { keyframes, ...rest } = object;

      if (mode !== "motion") {
        return rest;
      }

      return {
        ...rest,
        keyframes:
          Array.isArray(keyframes) && keyframes.every(isValidKeyframe)
            ? [...keyframes].sort((a, b) => a.timeMs - b.timeMs)
            : [],
      };
    }),
  };
}

function isValidTemplate(value: unknown): value is SceneTemplate {
  if (!value || typeof value !== "object") {
    return false;
  }

  const template = value as Partial<SceneTemplate>;

  return (
    typeof template.id === "string" &&
    typeof template.name === "string" &&
    Array.isArray(template.objects) &&
    template.objects.length > 0 &&
    template.objects.every(isValidTemplateObject)
  );
}

export function loadTemplates(): SceneTemplate[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<StoredTemplates>;
    if (parsed?.version !== TEMPLATE_SCHEMA_VERSION) {
      return [];
    }

    return Array.isArray(parsed.templates)
      ? parsed.templates.filter(isValidTemplate).map(normalizeTemplate)
      : [];
  } catch {
    return [];
  }
}

// Retorna false quando a escrita falha (cota estourada, modo privado etc.)
// para o chamador avisar o usuário em vez de falhar em silêncio.
export function persistTemplates(templates: SceneTemplate[]) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const payload: StoredTemplates = {
      templates,
      version: TEMPLATE_SCHEMA_VERSION,
    };

    window.localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function upsertTemplate(
  templates: SceneTemplate[],
  template: SceneTemplate,
): SceneTemplate[] {
  const exists = templates.some((item) => item.id === template.id);

  return exists
    ? templates.map((item) => (item.id === template.id ? template : item))
    : [...templates, template];
}

export function removeTemplate(templates: SceneTemplate[], id: string) {
  return templates.filter((template) => template.id !== id);
}

export function renameTemplate(
  templates: SceneTemplate[],
  id: string,
  name: string,
): SceneTemplate[] {
  const normalizedName = name.trim();

  if (!normalizedName) {
    return templates;
  }

  return templates.map((template) =>
    template.id === id ? { ...template, name: normalizedName } : template,
  );
}
