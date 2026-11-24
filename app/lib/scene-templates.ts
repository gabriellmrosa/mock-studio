"use client";

import {
  fromTemplateScreen,
  normalizeTemplateScreen,
  toTemplateScreen,
  type TemplateScreen,
} from "./screen-memory";
import {
  DEVICE_MODELS,
  MODELS_WITH_FINISH,
  type DeviceModelId,
} from "../models/device-models";
import {
  getPlaceholderImageUrl,
  isAudioObject,
  isBackgroundObject,
  isCameraObject,
  isImageObject,
  isTextObject,
  type SceneObject,
} from "./scene-objects";
import {
  getBuiltinAssetImage,
  getStickerImage,
  isBuiltinImageAssetId,
  normalizeImageAspect,
  normalizeImageSpeed,
} from "./image-objects";
import { isStickerId } from "./stickers";
import {
  createAudioObject,
  normalizeAudioSettings,
  toAudioSettings,
} from "./audio-objects";
import type { AudioSettings } from "./scene-objects";
import { createCameraObject, withCameraObject } from "./camera-objects";
import { createBackgroundObject, withBackgroundObject } from "./background-objects";
import { normalizeAnimatedScreenFit } from "./screen-fit-motion";
import { isOrbit, normalizeOrbit } from "./camera-orbit";
import { normalizeSceneText, type SceneText } from "./text-objects";
import {
  EASING_IDS,
  type CubicBezier,
  type EasingId,
  type MotionTransform,
} from "./scene-motion";
import {
  isDefaultCanvasGrid,
  normalizeCanvasGrid,
  type CanvasGrid,
} from "./canvas-grid";
import {
  normalizeBackgroundPose,
  normalizeCanvasBackground,
  toStoredCanvasBackground,
  type CanvasBackground,
} from "./canvas-background";
import { normalizeMotionFrame, type MotionFrame } from "./motion-frame";
import { DEFAULT_FOLD_ANGLE } from "./scene-presets";

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

// Campos do aparelho preservados no template. Ficam de fora `id` (recriado
// a cada aplicação), `imageUrl` (volta ao placeholder), `deletable` (derivado
// da posição na lista) e o estado de debug (ferramenta de desenvolvimento).
// Sem `kind`, o objeto é um aparelho — assim os templates de antes do texto
// continuam abrindo, e uma cópia antiga do app só não conhece o que é novo.
export type TemplateDeviceObject = {
  kind?: "device";
  colors: Record<string, string>;
  deviceTheme: string;
  isVisible: boolean;
  /** Só em templates de Movimento. */
  keyframes?: TemplateKeyframe[];
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
  /** Só no dobrável; sem ela, aberto. */
  foldAngle?: number;
  /** Só nos modelos com a opção (`MODELS_WITH_FINISH`); sem ele, fosco. */
  matteFinish?: boolean;
  showDeviceShell: boolean;
  showNotebookKeyboard: boolean;
  showTabletBezel: boolean;
  /**
   * O que se lembra de cada tela sem o arquivo dela (ver `screen-memory.ts`):
   * a fonte, os nomes, o enquadramento, o corte e o tempo do clipe. Ausente em
   * templates de antes, e numa tela que nunca recebeu arquivo.
   */
  screen?: TemplateScreen;
  outerScreen?: TemplateScreen;
};

/** Um texto da cena: leve (bytes), então entra no template, ao contrário das imagens. */
export type TemplateTextObject = {
  kind: "text";
  isVisible: boolean;
  /** Só em templates de Movimento. */
  keyframes?: TemplateKeyframe[];
  name: string;
  opacity?: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  text: SceneText;
};

/**
 * Uma imagem solta da cena. O arquivo nunca entra (como as imagens das telas):
 * o que fica é a proporção, para o objeto voltar como o espaço vazio do tamanho
 * certo, no lugar em que estava, esperando o arquivo de novo.
 */
export type TemplateImageObject = {
  kind: "image";
  /** Largura sobre altura da imagem que estava aqui. */
  aspect: number;
  /** Contorno de adesivo; sem ele (templates de antes), vale o padrão do tipo. */
  outline?: boolean;
  /**
   * O sticker do acervo, quando é um: do app, não do usuário, então entra no
   * template (é só o id) e volta com a arte.
   */
  sticker?: string;
  /** Asset embutido do próprio app (ex.: logo do Mock Studio). */
  asset?: string;
  /** A sombra; sem ela (templates de antes), a que o contorno tinha. */
  shadow?: boolean;
  /** Velocidade de uma animação; sem ela, 1. */
  speed?: number;
  isVisible: boolean;
  /** Só em templates de Movimento. */
  keyframes?: TemplateKeyframe[];
  name: string;
  opacity?: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
};

/**
 * A câmera: só entra num template de Vídeo, e só com keyframes — sem eles não
 * há o que guardar (a pose do momento já vai em `camera`). A cena sempre tem a
 * sua; um template sem ela ganha uma na hora de aplicar.
 */
export type TemplateCameraObject = {
  kind: "camera";
  keyframes?: TemplateKeyframe[];
  name: string;
};

/** O Fundo: como a câmera, só num template de Vídeo e só com keyframes. */
export type TemplateBackgroundObject = {
  kind: "background";
  keyframes?: TemplateKeyframe[];
  name: string;
};

/**
 * A música (só no Vídeo): o arquivo não entra, como os vídeos das telas. O que
 * fica é o nome, para pedi-lo de volta, e o lugar, os cortes, o volume e os
 * fades, que valem para o arquivo que chegar.
 */
export type TemplateAudioObject = {
  kind: "audio";
  audio: AudioSettings;
  isVisible: boolean;
  /** Nunca vem preenchido (a música não anima); existe pela leitura comum. */
  keyframes?: TemplateKeyframe[];
  name: string;
};

export type TemplateObject =
  | TemplateDeviceObject
  | TemplateTextObject
  | TemplateImageObject
  | TemplateCameraObject
  | TemplateBackgroundObject
  | TemplateAudioObject;

export function isTemplateAudio(
  object: TemplateObject,
): object is TemplateAudioObject {
  return object.kind === "audio";
}

export function isTemplateCamera(
  object: TemplateObject,
): object is TemplateCameraObject {
  return object.kind === "camera";
}

export function isTemplateBackground(
  object: TemplateObject,
): object is TemplateBackgroundObject {
  return object.kind === "background";
}

export function isTemplateImage(
  object: TemplateObject,
): object is TemplateImageObject {
  return object.kind === "image";
}

export function isTemplateText(
  object: TemplateObject,
): object is TemplateTextObject {
  return object.kind === "text";
}

export type SceneTemplate = {
  /** O estilo do fundo; sem ele (templates de antes, ou o chão), o chão. */
  background?: CanvasBackground;
  backgroundColor: string | null;
  camera: CameraPose | null;
  createdAt: number;
  /** Só em templates de Movimento; sem ele, o quadro padrão (1920 × 1080). */
  frame?: MotionFrame;
  /** As linhas do chão; sem ela (templates de antes), as automáticas. */
  grid?: CanvasGrid;
  id: string;
  mode: TemplateMode;
  name: string;
  objects: TemplateObject[];
};

type StoredTemplates = {
  templates: SceneTemplate[];
  version: number;
};

function toTemplateKeyframes(
  object: SceneObject,
  mode: TemplateMode,
): { keyframes?: TemplateKeyframe[] } {
  return mode === "motion"
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
    : {};
}

/**
 * Os objetos de um template: todos, menos a câmera e o Fundo quando não têm o
 * que guardar (no Foto, ou sem keyframes — o fundo da cena já vai à parte).
 */
function toTemplateObjects(
  objects: SceneObject[],
  mode: TemplateMode,
): TemplateObject[] {
  return objects
    .filter(
      (object) =>
        !(isCameraObject(object) || isBackgroundObject(object)) ||
        (mode === "motion" && object.keyframes.length > 0),
    )
    // A música só existe no Vídeo; sem arquivo nem o que pedir de volta, não
    // há o que guardar.
    .filter(
      (object) =>
        !isAudioObject(object) ||
        (mode === "motion" && (object.audio ?? object.pendingAudio)),
    )
    .map((object) => toTemplateObject(object, mode));
}

function toTemplateObject(
  object: SceneObject,
  mode: TemplateMode,
): TemplateObject {
  if (isCameraObject(object)) {
    return {
      ...toTemplateKeyframes(object, mode),
      kind: "camera",
      name: object.name,
    };
  }

  if (isBackgroundObject(object)) {
    return {
      ...toTemplateKeyframes(object, mode),
      kind: "background",
      name: object.name,
    };
  }

  if (isAudioObject(object)) {
    // O filtro de `toTemplateObjects` garante um dos dois.
    const audio = object.audio
      ? toAudioSettings(object.audio)
      : (object.pendingAudio as AudioSettings);

    return {
      kind: "audio",
      audio: { ...audio },
      isVisible: object.isVisible,
      name: object.name,
    };
  }

  if (isImageObject(object)) {
    return {
      ...toTemplateKeyframes(object, mode),
      kind: "image",
      aspect: object.image.aspect,
      isVisible: object.isVisible,
      // Só o que o arquivo não decide sozinho: sticker ou asset do app.
      ...(object.image.stickerId ? { sticker: object.image.stickerId } : {}),
      ...(object.image.assetId ? { asset: object.image.assetId } : {}),
      outline: object.image.outline,
      shadow: object.image.shadow,
      // A velocidade é um ajuste do usuário, vale para o sticker animado e para
      // um GIF que volta como espaço vazio; parada, 1 não precisa ser dita.
      ...(object.image.speed !== 1 ? { speed: object.image.speed } : {}),
      name: object.name,
      opacity: object.opacity,
      positionX: object.positionX,
      positionY: object.positionY,
      positionZ: object.positionZ,
      rotationX: object.rotationX,
      rotationY: object.rotationY,
      rotationZ: object.rotationZ,
      scale: object.scale,
    };
  }

  if (isTextObject(object)) {
    return {
      ...toTemplateKeyframes(object, mode),
      kind: "text",
      isVisible: object.isVisible,
      name: object.name,
      opacity: object.opacity,
      positionX: object.positionX,
      positionY: object.positionY,
      positionZ: object.positionZ,
      rotationX: object.rotationX,
      rotationY: object.rotationY,
      rotationZ: object.rotationZ,
      scale: object.scale,
      text: { ...object.text },
    };
  }

  return {
    ...toTemplateKeyframes(object, mode),
    colors: { ...object.colors },
    deviceTheme: object.deviceTheme,
    isVisible: object.isVisible,
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
    // Só quem tem a opção guarda a abertura e o acabamento: os templates dos
    // outros modelos ficam como sempre foram.
    ...(object.modelId === "duo" ? { foldAngle: object.foldAngle } : {}),
    ...(MODELS_WITH_FINISH.includes(object.modelId)
      ? { matteFinish: object.matteFinish }
      : {}),
    showDeviceShell: object.showDeviceShell,
    showNotebookKeyboard: object.showNotebookKeyboard,
    showTabletBezel: object.showTabletBezel,
    ...withScreen(
      "screen",
      toTemplateScreen({
        imageFit: object.imageFit,
        imageName: object.imageName,
        pending: object.pendingScreen ?? null,
        source: object.screenSource,
        video: object.screenVideo,
      }),
    ),
    ...withScreen(
      "outerScreen",
      toTemplateScreen({
        imageFit: object.outerImageFit,
        imageName: object.outerImageName,
        pending: object.pendingOuterScreen ?? null,
        source: object.outerScreenSource,
        video: object.outerScreenVideo,
      }),
    ),
  };
}

/** Só põe a tela no template quando há o que lembrar dela. */
function withScreen(key: "screen" | "outerScreen", screen: TemplateScreen | undefined) {
  return screen ? { [key]: screen } : {};
}

export function createSceneTemplate({
  background = null,
  backgroundColor = null,
  camera = null,
  frame = null,
  grid = null,
  id,
  mode = "static",
  name,
  objects,
}: {
  background?: CanvasBackground | null;
  backgroundColor?: string | null;
  camera?: CameraPose | null;
  frame?: MotionFrame | null;
  grid?: CanvasGrid | null;
  id?: string;
  mode?: TemplateMode;
  name: string;
  objects: SceneObject[];
}): SceneTemplate {
  const storedBackground = background ? toStoredCanvasBackground(background) : null;

  return {
    // Como a grade: só o que difere do chão de sempre.
    ...(storedBackground ? { background: storedBackground } : {}),
    backgroundColor,
    camera,
    createdAt: Date.now(),
    ...(mode === "motion" && frame ? { frame: { ...frame } } : {}),
    // Só o que difere do padrão: o template de uma cena comum fica como era.
    ...(grid && !isDefaultCanvasGrid(grid) ? { grid: { ...grid } } : {}),
    id: id ?? crypto.randomUUID(),
    mode,
    name,
    objects: toTemplateObjects(objects, mode),
  };
}

// Reconstrói os objetos da cena a partir do template. O primeiro objeto herda
// `deletable: false` para preservar o invariante de sempre haver uma camada.
// Templates estáticos reconstroem os objetos sem keyframes.
function fromTemplateKeyframes(keyframes: TemplateKeyframe[] | undefined) {
  return (keyframes ?? []).map((keyframe) => ({
    ...keyframe,
    ...(keyframe.bezier ? { bezier: [...keyframe.bezier] as CubicBezier } : {}),
    id: crypto.randomUUID(),
    transform: {
      ...withoutBackground(keyframe.transform),
      // O fundo de um keyframe do Fundo e o enquadramento das telas vêm de
      // fora: só voltam se forem legíveis (e dentro dos limites).
      ...withBackgroundPose(keyframe.transform.background),
      ...withScreenFitField("screenFit", keyframe.transform.screenFit),
      ...withScreenFitField("outerScreenFit", keyframe.transform.outerScreenFit),
      // Keyframes salvos antes da opacidade não a têm: 100%.
      opacity: keyframe.transform.opacity ?? 1,
      // A órbita da câmera vem de fora: volta pelos limites.
      ...(keyframe.transform.orbit
        ? { orbit: normalizeOrbit(keyframe.transform.orbit) }
        : {}),
    },
  }));
}

/** O transform sem o fundo e o enquadramento das telas, que voltam à parte (validados). */
function withoutBackground(transform: MotionTransform): MotionTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { background, outerScreenFit, screenFit, ...rest } = transform;

  return rest;
}

function withScreenFitField(key: "outerScreenFit" | "screenFit", value: unknown) {
  const fit = normalizeAnimatedScreenFit(value);

  return fit ? { [key]: fit } : {};
}

function withBackgroundPose(value: unknown) {
  const background = normalizeBackgroundPose(value);

  return background ? { background } : {};
}

export function applySceneTemplate(template: SceneTemplate): SceneObject[] {
  const objects = template.objects.map((object, index): SceneObject => {
    if (isTemplateCamera(object)) {
      return {
        ...createCameraObject({ name: object.name }),
        keyframes: fromTemplateKeyframes(object.keyframes),
      };
    }

    if (isTemplateBackground(object)) {
      return {
        ...createBackgroundObject({ name: object.name }),
        keyframes: fromTemplateKeyframes(object.keyframes),
      };
    }

    if (isTemplateAudio(object)) {
      // A música volta esperando o arquivo: sem clipe na timeline até ele
      // chegar, como o vídeo das telas.
      return {
        ...createAudioObject({ audio: null, name: object.name }),
        isVisible: object.isVisible,
        pendingAudio: normalizeAudioSettings(object.audio),
      };
    }

    if (isTemplateImage(object)) {
      const outline =
        typeof object.outline === "boolean"
          ? object.outline
          : isStickerId(object.sticker);

      return {
        kind: "image",
        deletable: index > 0,
        id: crypto.randomUUID(),
        // Um sticker volta com a arte (id desconhecido, de uma versão de fora,
        // cai no espaço vazio); uma imagem enviada, como espaço vazio na
        // proporção que tinha.
        image: {
          ...(isStickerId(object.sticker)
            ? getStickerImage(object.sticker)
            : isBuiltinImageAssetId(object.asset)
              ? getBuiltinAssetImage(object.asset)
              : {
                  animation: null,
                  aspect: normalizeImageAspect(object.aspect),
                  assetId: null,
                  isVector: false,
                  name: null,
                  speed: 1,
                  stickerId: null,
                  url: null,
                }),
          speed: normalizeImageSpeed(object.speed),
          outline,
          // Antes da sombra própria, ela ia com o contorno: sem o campo, a
          // imagem volta como estava.
          shadow: typeof object.shadow === "boolean" ? object.shadow : outline,
        },
        isVisible: object.isVisible,
        keyframes: fromTemplateKeyframes(object.keyframes),
        name: object.name,
        opacity: object.opacity ?? 1,
        positionX: object.positionX,
        positionY: object.positionY,
        positionZ: object.positionZ,
        rotationX: object.rotationX,
        rotationY: object.rotationY,
        rotationZ: object.rotationZ,
        scale: object.scale,
      };
    }

    if (isTemplateText(object)) {
      return {
        kind: "text",
        deletable: index > 0,
        id: crypto.randomUUID(),
        isVisible: object.isVisible,
        keyframes: fromTemplateKeyframes(object.keyframes),
        name: object.name,
        opacity: object.opacity ?? 1,
        positionX: object.positionX,
        positionY: object.positionY,
        positionZ: object.positionZ,
        rotationX: object.rotationX,
        rotationY: object.rotationY,
        rotationZ: object.rotationZ,
        scale: object.scale,
        // O texto vem de fora (template, link): passa pelos limites de novo.
        text: normalizeSceneText(object.text),
      };
    }

    const model = DEVICE_MODELS[object.modelId];
    // A tela volta com as configurações e o nome do arquivo que falta; o
    // arquivo em si não vem no template.
    const main = fromTemplateScreen(normalizeTemplateScreen(object.screen));
    const outer = fromTemplateScreen(normalizeTemplateScreen(object.outerScreen));

    return {
      kind: "device",
      colors: { ...object.colors },
      debugMode: false,
      debugPartColors: { ...model.initialDebugColors },
      deletable: index > 0,
      keyframes: fromTemplateKeyframes(object.keyframes),
      deviceTheme: object.deviceTheme,
      id: crypto.randomUUID(),
      imageFit: main.imageFit,
      imageName: null,
      imageUrl: getPlaceholderImageUrl(object.modelId),
      outerImageFit: outer.imageFit,
      outerImageName: null,
      outerImageUrl: null,
      outerScreenSource: outer.source,
      outerScreenVideo: null,
      pendingOuterScreen: outer.pending,
      pendingScreen: main.pending,
      isVisible: object.isVisible,
      modelId: object.modelId,
      screenSource: main.source,
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
      foldAngle: object.foldAngle ?? DEFAULT_FOLD_ANGLE,
      showDeviceShell: object.showDeviceShell,
      showNotebookKeyboard: object.showNotebookKeyboard,
      showTabletBezel: object.showTabletBezel,
      matteFinish: object.matteFinish ?? true,
    };
  });

  // A cena sempre tem a sua câmera; o nome na lista vem do idioma, não daqui.
  return withBackgroundObject(withCameraObject(objects, "Camera"), "Background");
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
  grid: CanvasGrid | null = null,
  background: CanvasBackground | null = null,
) {
  const storedBackground = background ? toStoredCanvasBackground(background) : null;

  return JSON.stringify({
    ...(storedBackground ? { background: storedBackground } : {}),
    backgroundColor,
    ...(mode === "motion" && frame ? { frame } : {}),
    ...(grid && !isDefaultCanvasGrid(grid) ? { grid } : {}),
    objects: toTemplateObjects(objects, mode),
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

  const object = value as Record<string, unknown>;

  // A câmera e o Fundo não têm pose nem modelo: só o nome e os keyframes
  // (validados à parte, um a um).
  if (object.kind === "camera" || object.kind === "background") {
    return typeof object.name === "string";
  }

  // A música: o nome do objeto e o que se lembra dela (lido de novo, nos
  // limites, ao aplicar).
  if (object.kind === "audio") {
    return (
      typeof object.name === "string" &&
      normalizeAudioSettings(object.audio) !== null
    );
  }

  // Um texto não tem modelo: o que vale é o `text` ser um objeto. O conteúdo
  // em si é completado e limitado depois, por `normalizeSceneText`.
  const hasKind =
    object.kind === "text"
      ? typeof object.text === "object" && object.text !== null
      : object.kind === "image"
        ? typeof object.aspect === "number"
        : typeof object.modelId === "string" && object.modelId in DEVICE_MODELS;

  return (
    hasKind &&
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
    (transform.opacity === undefined || typeof transform.opacity === "number") &&
    (transform.foldAngle === undefined ||
      typeof transform.foldAngle === "number") &&
    (transform.letterSpacing === undefined ||
      typeof transform.letterSpacing === "number") &&
    (transform.textColor === undefined ||
      (typeof transform.textColor === "string" &&
        /^#[0-9a-f]{6}$/i.test(transform.textColor))) &&
    (transform.orbit === undefined || isOrbit(transform.orbit))
  );
}

/**
 * Completa o que os campos opcionais deixam de fora. Keyframes corrompidos
 * derrubam só a animação daquele objeto, não o template inteiro.
 */
export function normalizeTemplate(template: SceneTemplate): SceneTemplate {
  const mode: TemplateMode = template.mode === "motion" ? "motion" : "static";
  const {
    background: storedBackground,
    frame: storedFrame,
    grid: storedGrid,
    ...fields
  } = template;
  const frame = mode === "motion" ? normalizeMotionFrame(storedFrame) : null;
  const grid = storedGrid ? normalizeCanvasGrid(storedGrid) : null;
  const background = storedBackground
    ? toStoredCanvasBackground(normalizeCanvasBackground(storedBackground))
    : null;

  return {
    ...fields,
    ...(background ? { background } : {}),
    ...(frame ? { frame } : {}),
    ...(grid && !isDefaultCanvasGrid(grid) ? { grid } : {}),
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

export function isValidTemplate(value: unknown): value is SceneTemplate {
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
