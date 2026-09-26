"use client";

import { DEVICE_MODELS, type DeviceModelId } from "../models/device-models";
import {
  getPlaceholderImageUrl,
  type SceneObject,
} from "./scene-objects";

// ---------------------------------------------------------------------------
// Templates de cena — composição reutilizável salva no localStorage.
//
// O template guarda a estrutura (dispositivos, transforms, cores, toggles,
// fundo e enquadramento da câmera), mas NÃO as imagens enviadas: ao aplicar,
// cada tela volta ao placeholder. Isso mantém o peso em ~2KB por template,
// bem longe da cota do localStorage, já que uma única imagem em base64
// costuma passar de 1MB.
// ---------------------------------------------------------------------------

const TEMPLATES_STORAGE_KEY = "mock-photo-templates";
const TEMPLATE_SCHEMA_VERSION = 1;

export type CameraPose = {
  position: [number, number, number];
  target: [number, number, number];
};

// Campos do SceneObject preservados no template. Ficam de fora `id` (recriado
// a cada aplicação), `imageUrl` (volta ao placeholder), `deletable` (derivado
// da posição na lista) e o estado de debug (ferramenta de desenvolvimento).
export type TemplateObject = {
  colors: Record<string, string>;
  customColorsEnabled: boolean;
  deviceTheme: string;
  isVisible: boolean;
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
  showDeviceShell: boolean;
  showNotebookKeyboard: boolean;
  showTabletBezel: boolean;
};

export type SceneTemplate = {
  backgroundColor: string | null;
  camera: CameraPose | null;
  createdAt: number;
  id: string;
  name: string;
  objects: TemplateObject[];
};

type StoredTemplates = {
  templates: SceneTemplate[];
  version: number;
};

function toTemplateObject(object: SceneObject): TemplateObject {
  return {
    colors: { ...object.colors },
    customColorsEnabled: object.customColorsEnabled,
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
    showDeviceShell: object.showDeviceShell,
    showNotebookKeyboard: object.showNotebookKeyboard,
    showTabletBezel: object.showTabletBezel,
  };
}

export function createSceneTemplate({
  backgroundColor = null,
  camera = null,
  id,
  name,
  objects,
}: {
  backgroundColor?: string | null;
  camera?: CameraPose | null;
  id?: string;
  name: string;
  objects: SceneObject[];
}): SceneTemplate {
  return {
    backgroundColor,
    camera,
    createdAt: Date.now(),
    id: id ?? crypto.randomUUID(),
    name,
    objects: objects.map(toTemplateObject),
  };
}

// Reconstrói os objetos da cena a partir do template. O primeiro objeto herda
// `deletable: false` para preservar o invariante de sempre haver uma camada.
// Keyframes de motion não entram no template nesta versão: incluí-los exigiria
// subir o schema, e a checagem de versão descartaria os templates já salvos.
export function applySceneTemplate(template: SceneTemplate): SceneObject[] {
  return template.objects.map((object, index) => {
    const model = DEVICE_MODELS[object.modelId];

    return {
      colors: { ...object.colors },
      customColorsEnabled: object.customColorsEnabled,
      debugMode: false,
      debugPartColors: { ...model.initialDebugColors },
      deletable: index > 0,
      keyframes: [],
      motionDelayMs: 0,
      deviceTheme: object.deviceTheme,
      id: crypto.randomUUID(),
      imageUrl: getPlaceholderImageUrl(object.modelId),
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
      showDeviceShell: object.showDeviceShell,
      showNotebookKeyboard: object.showNotebookKeyboard,
      showTabletBezel: object.showTabletBezel,
    };
  });
}

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
      ? parsed.templates.filter(isValidTemplate)
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
