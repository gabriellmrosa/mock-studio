"use client";

import {
  ChangeEvent,
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type {
  CameraApi,
  ScaleOverrides,
  SpawnOverrides,
} from "./components/MockupCanvas/MockupCanvas";
import AlertDialog from "./components/AlertDialog/AlertDialog";
import AnalyticsConsent from "./components/AnalyticsConsent/AnalyticsConsent";
import InspectorPanel from "./components/InspectorPanel/InspectorPanel";
import LayersPanel from "./components/LayersPanel/LayersPanel";
import MotionTimeline from "./components/MotionTimeline/MotionTimeline";
import MockupCanvas from "./components/MockupCanvas/MockupCanvas";
import type { ObjectAlignment } from "./components/MockupCanvas/object-alignment";
import Snackbar, {
  type SnackbarNotification,
} from "./components/Snackbar/Snackbar";
import StickerPicker from "./components/StickerPicker/StickerPicker";
import { APP_VERSION } from "./lib/app-version";
import { buildNextDeviceColors } from "./lib/device-colors";
import {
  createImageObject,
  duplicateImageObject,
  getImageSpawnPosition,
  getStickerImage,
  normalizeImageSpeed,
  IMAGE_OBJECT_ACCEPT,
  readImageFile,
  resetImageObject,
  type SceneImage,
} from "./lib/image-objects";
import {
  createTextObject,
  duplicateTextObject,
  normalizeSceneText,
  resetTextObject,
  type SceneText,
} from "./lib/text-objects";
import { APP_COPY, type Locale, type UiTheme } from "./lib/i18n";
import {
  probeImageFile,
  probeVideoFile,
  readFileAsDataUrl,
} from "./lib/mockup-image";
import { DEFAULT_MOTION_FRAME, type MotionFrame } from "./lib/motion-frame";
import {
  findKeyframeAt,
  getSceneMotionDuration,
  insertKeyframe,
  removeKeyframe,
  updateKeyframe,
  type Keyframe,
} from "./lib/scene-motion";
import {
  changeSceneObjectModel,
  DEFAULT_SCREEN_FIT,
  createSceneObject,
  getActiveOuterScreenVideo,
  getActiveScreenVideo,
  getPlaceholderImageUrl,
  duplicateSceneObject,
  getSequentialSpawnTransform,
  isDeviceObject,
  isCameraObject,
  isImageObject,
  isTextObject,
  resetSceneObject,
  type DeviceObject,
  type PosePatch,
  type SceneObject,
  type ScreenId,
} from "./lib/scene-objects";
import {
  OBJECT_POSITION_MULTIPLIER,
  OBJECT_POSITION_MULTIPLIER_Z,
} from "./lib/scene-presets";
import {
  applySceneTemplate,
  createSceneTemplate,
  getNextTemplateName,
  getTemplateSnapshot,
  getTemplatesForMode,
  loadTemplates,
  persistTemplates,
  removeTemplate,
  renameTemplate,
  upsertTemplate,
  type CameraPose,
  type SceneTemplate,
  type TemplateMode,
} from "./lib/scene-templates";
import {
  consumeSceneLinkFromUrl,
  createSceneCode,
  createSceneLink,
  decodeSceneLink,
  extractSceneLink,
} from "./lib/scene-link";
import {
  DEFAULT_CANVAS_GRID,
  normalizeCanvasGrid,
  type CanvasGrid,
} from "./lib/canvas-grid";
import { createCameraKeyframe, createCameraObject } from "./lib/camera-objects";
import { isSameOrbit, normalizeOrbit, type CameraOrbit } from "./lib/camera-orbit";
import { DEVICE_MODELS } from "./models/device-models";

/** Cena de um modo guardada enquanto o outro está ativo. */
type ModeScene = {
  backgroundColor: string | null;
  grid: CanvasGrid;
  /**
   * A câmera de quando se saiu do modo. Cada modo volta como estava: sem ela,
   * a câmera do outro modo (com outro quadro, outra cena) ficaria no lugar.
   */
  camera: CameraPose | null;
  objects: SceneObject[];
  savedSnapshot: string;
  selectedObjectId: string;
};

/** Ações que descartam o trabalho atual e por isso passam pelo aviso. */
type PendingAction =
  | { kind: "mode"; mode: TemplateMode }
  | { kind: "template"; templateId: string };

const MIN_DESKTOP_WIDTH = 1200;
const MIN_DESKTOP_HEIGHT = 520;

function detectBrowserLocale(): Locale {
  const preferredLocales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const browserLocale of preferredLocales) {
    const normalizedLocale = browserLocale.toLowerCase();

    if (normalizedLocale.startsWith("pt-br") || normalizedLocale.startsWith("pt")) {
      return "pt-BR";
    }

    if (normalizedLocale.startsWith("en-us") || normalizedLocale.startsWith("en")) {
      return "en-US";
    }
  }

  return "en-US";
}

/**
 * O tema claro está desligado por enquanto: o app tem só o escuro, para todos,
 * qualquer que seja a preferência do navegador ou o que ficou guardado. Os
 * tokens do claro continuam em `globals.css` (`[data-theme="light"]`) para
 * quando ele voltar; o `<html>` já nasce com `data-theme="dark"`.
 */
const UI_THEME: UiTheme = "dark";

/**
 * Texto, imagem e sticker novos nascem à frente dos aparelhos (em unidades de
 * posição). Imagem e sticker nascem também deslocados na diagonal
 * (`getImageSpawnPosition`).
 */
const NEW_FLAT_OBJECT_POSITION_Z = 0.25;

export default function Home() {
  const [locale, setLocale] = useState<Locale>("pt-BR");
  const uiTheme = UI_THEME;
  const [notification, setNotification] = useState<SnackbarNotification | null>(
    null,
  );
  const isInitialized = useRef(false);
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [stickerPickerMode, setStickerPickerMode] = useState<"add" | "swap" | null>(null);
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>(() => [
    createSceneObject({
      deletable: false,
      id: "base-object",
      name: "Object 1",
    }),
    // A câmera da cena: sempre na lista, o nome na tela vem do idioma.
    createCameraObject({ id: "camera", name: "Camera" }),
  ]);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [motionTab, setMotionTab] = useState<TemplateMode>("static");
  const [selectedKeyframeId, setSelectedKeyframeId] = useState("");
  // Instante em que o preview começou; null = parado.
  const [motionStartedAt, setMotionStartedAt] = useState<number | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [scaleOverrides] = useState<ScaleOverrides>({});
  const [spawnOverrides] = useState<SpawnOverrides>({});
  // Cor de fundo do canvas: mora aqui (e não no MockupCanvas) para poder ser
  // capturada e restaurada junto com os templates.
  const [canvasBgColor, setCanvasBgColor] = useState<string | null>(null);
  const [canvasGrid, setCanvasGrid] = useState<CanvasGrid>(DEFAULT_CANVAS_GRID);
  // Tamanho do vídeo no Movimento. Não entra na troca de cenas: só o
  // Movimento o usa, então ele simplesmente fica aqui enquanto o Estático
  // está na tela.
  const [motionFrame, setMotionFrame] =
    useState<MotionFrame>(DEFAULT_MOTION_FRAME);
  const [templates, setTemplates] = useState<SceneTemplate[]>([]);
  // O que o modo atual tinha da última vez que ficou "limpo": ao entrar nele,
  // ao salvar ou ao aplicar um template. Diferente disso = alteração não salva.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    getTemplateSnapshot(sceneObjects, "static", null),
  );
  // Cada modo tem a sua cena. A do modo ativo vive nos estados acima; a do
  // outro fica guardada aqui até voltarmos para ele.
  const [parkedScenes, setParkedScenes] = useState<
    Partial<Record<TemplateMode, ModeScene>>
  >({});
  // Ação que o usuário pediu e que espera o aviso de alterações não salvas.
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  // Câmera a restaurar assim que a cena assentar: a de um template (o canvas
  // fica bloqueado e avisa ao terminar) ou a de um modo ao voltar para ele.
  const [pendingCamera, setPendingCamera] = useState<{
    /** Aviso ao assentar, no lugar do de template aplicado (ex.: o do link). */
    message?: string;
    pose: CameraPose;
    source: "mode" | "template";
  } | null>(null);
  // O template de onde veio a cena de cada modo (Foto e Vídeo têm cenas
  // separadas): salvar pela barra lateral pergunta se sobrepõe ele ou cria um
  // novo. Some quando o template é apagado.
  const [sourceTemplateIds, setSourceTemplateIds] = useState<
    Record<TemplateMode, string | null>
  >({ motion: null, static: null });
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
  const cameraApiRef = useRef<CameraApi | null>(null);
  // A vista de agora (o que a câmera mostra), lida do canvas quando ela para
  // depois de um gesto: no Foto é o que os campos da câmera mostram, e no Vídeo
  // o que "+ keyframe" captura. Não é estado da cena.
  const [liveCamera, setLiveCamera] = useState<{
    distanceRange: [number, number] | null;
    orbit: CameraOrbit | null;
  }>({ distanceRange: null, orbit: null });
  const copy = APP_COPY[locale];
  const minViewportLabel = `${MIN_DESKTOP_WIDTH} x ${MIN_DESKTOP_HEIGHT} px`;
  const selectedObject =
    sceneObjects.find((object) => object.id === selectedObjectId) ??
    sceneObjects[0] ??
    null;
  // O que o Inspector e os handlers de aparelho enxergam: um texto selecionado
  // não tem tela, modelo nem cores de aparelho.
  const selectedDevice =
    selectedObject && isDeviceObject(selectedObject) ? selectedObject : null;
  // A câmera se chama no idioma da interface (o nome guardado é só interno), e
  // na timeline ela vem primeiro, como na lista.
  const displayObjects = sceneObjects
    .map((object) =>
      isCameraObject(object) ? { ...object, name: copy.cameraObjectName } : object,
    )
    .sort((a, b) => Number(isCameraObject(b)) - Number(isCameraObject(a)));
  const displaySelectedObject =
    selectedObject && isCameraObject(selectedObject)
      ? { ...selectedObject, name: copy.cameraObjectName }
      : selectedObject;

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("mock-photo-locale");

    setLocale(
      storedLocale === "pt-BR" || storedLocale === "en-US"
        ? storedLocale
        : detectBrowserLocale(),
    );

    setTemplates(loadTemplates());

    isInitialized.current = true;
  }, []);

  useEffect(() => {
    if (!isInitialized.current) return;
    window.localStorage.setItem("mock-photo-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!selectedObjectId && sceneObjects[0]) {
      setSelectedObjectId(sceneObjects[0].id);
      return;
    }

    if (
      selectedObjectId &&
      !sceneObjects.some((object) => object.id === selectedObjectId)
    ) {
      setSelectedObjectId(sceneObjects[0]?.id ?? "");
    }
  }, [sceneObjects, selectedObjectId]);

  /**
   * O que todo objeto tem, aparelho ou texto: pose, keyframes e nome. O resto —
   * tela, cores, modelo — é de aparelho e passa por `updateSceneObject`.
   */
  function updateShared(
    id: string,
    patch: PosePatch & {
      keyframes?: SceneObject["keyframes"];
      name?: string;
    },
  ) {
    setSceneObjects((current) =>
      current.map((object) =>
        object.id === id ? { ...object, ...patch } : object,
      ),
    );
  }

  /**
   * `patch` pode ser uma função do objeto atual. Use-a para mexer em campos
   * aninhados (enquadramento, dados do vídeo): montar o objeto novo a partir
   * do `selectedObject` do render faz duas mudanças seguidas se atropelarem —
   * a cor de fundo, que o ColorRow grava com atraso, desfazia o zoom.
   */
  function updateSceneObject(
    id: string,
    patch:
      | Partial<DeviceObject>
      | ((object: DeviceObject) => Partial<DeviceObject>),
  ) {
    setSceneObjects((current) =>
      current.map((object) =>
        object.id === id && isDeviceObject(object)
          ? {
              ...object,
              ...(typeof patch === "function" ? patch(object) : patch),
            }
          : object,
      ),
    );
  }

  /** `screen`: a tela do aparelho ou, no dobrável, a de fora. */
  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    screen: "main" | "outer" = "main",
  ) {
    const file = event.target.files?.[0];
    if (!file || !selectedDevice) {
      return;
    }

    try {
      await probeImageFile(file);
      const nextImage = await readFileAsDataUrl(file);
      // Imagem nova, enquadramento novo: o anterior foi feito para outra.
      updateSceneObject(
        selectedDevice.id,
        screen === "outer"
          ? {
              outerImageFit: { ...DEFAULT_SCREEN_FIT },
              outerImageName: file.name,
              outerImageUrl: nextImage,
            }
          : {
              imageFit: { ...DEFAULT_SCREEN_FIT },
              imageName: file.name,
              imageUrl: nextImage,
            },
      );
      setUploadError("");
    } catch (error) {
      console.error(error);
      setUploadError(copy.uploadImageError);
    } finally {
      event.target.value = "";
    }
  }

  /** `screen`: a tela do aparelho ou, no dobrável, a de fora. */
  async function handleVideoUpload(
    event: ChangeEvent<HTMLInputElement>,
    screen: ScreenId = "main",
  ) {
    const file = event.target.files?.[0];
    const target = selectedDevice;

    event.target.value = "";

    if (!file || !target) {
      return;
    }

    try {
      const { durationMs, url } = await probeVideoFile(file);

      const screenVideo = {
        durationMs,
        fit: { ...DEFAULT_SCREEN_FIT },
        name: file.name,
        startMs: 0,
        trimEndMs: 0,
        trimStartMs: 0,
        url,
      };

      updateSceneObject(
        target.id,
        screen === "outer"
          ? { outerScreenSource: "video", outerScreenVideo: screenVideo }
          : { screenSource: "video", screenVideo },
      );
      setUploadError("");
    } catch (error) {
      console.error(error);
      setUploadError(copy.uploadVideoError);
    }
  }

  function handleAddObject() {
    // O número conta os aparelhos: o texto, a imagem e a câmera não entram.
    const devices = sceneObjects.filter(isDeviceObject).length;
    const nextObject = createSceneObject({
      name: `Object ${devices + 1}`,
    });

    setSceneObjects((current) => {
      const spawnTransform = getSequentialSpawnTransform(
        current,
        nextObject.modelId,
      );

      return [
        ...current,
        {
          ...nextObject,
          ...spawnTransform,
        },
      ];
    });
    setSelectedObjectId(nextObject.id);
  }

  /** Um texto novo, na frente dos aparelhos para não nascer dentro de um. */
  function handleAddText() {
    const texts = sceneObjects.filter(isTextObject).length;
    const nextText = createTextObject({
      content: copy.textDefaultContent,
      name: `${copy.textObjectName} ${texts + 1}`,
    });

    setSceneObjects((current) => [
      ...current,
      { ...nextText, positionZ: NEW_FLAT_OBJECT_POSITION_Z },
    ]);
    setSelectedObjectId(nextText.id);
  }

  /**
   * "+ Imagem" abre direto o seletor de arquivos do computador. O objeto só
   * nasce com o arquivo escolhido: quem desiste do seletor não fica com um
   * objeto vazio na cena. O espaço vazio (o círculo branco) existe só para o que
   * volta de um template ou de um link, onde o arquivo nunca vem junto.
   */
  function handleAddImage() {
    addImageInputRef.current?.click();
  }

  async function handleAddImageFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const image = await readImageFile(file);
      const images = sceneObjects.filter(isImageObject).length;
      const nextImage = createImageObject({
        image,
        name: `${copy.imageObjectName} ${images + 1}`,
      });

      setSceneObjects((current) => [
        ...current,
        {
          ...nextImage,
          ...getImageSpawnPosition(current),
          positionZ: NEW_FLAT_OBJECT_POSITION_Z,
        },
      ]);
      setSelectedObjectId(nextImage.id);
    } catch (error) {
      // Sem objeto selecionado não há onde mostrar o aviso do Inspector.
      console.error(error);
      notify("error", copy.uploadImageError);
    }
  }

  /**
   * "+ Sticker" abre a grade para criar um objeto; "Trocar sticker" abre a mesma
   * para mudar o do objeto selecionado. `null` é fechada.
   */
  function handlePickSticker(stickerId: string) {
    const mode = stickerPickerMode;

    setStickerPickerMode(null);

    if (mode === "swap" && selectedObject) {
      // Trocar a arte mantém o que o usuário ajustou (o contorno).
      setSceneObjects((current) =>
        current.map((object) =>
          object.id === selectedObject.id && isImageObject(object)
            ? {
                ...object,
                image: {
                  ...getStickerImage(stickerId),
                  outline: object.image.outline,
                  shadow: object.image.shadow,
                },
              }
            : object,
        ),
      );

      return;
    }

    const stickers = sceneObjects.filter(
      (object) => isImageObject(object) && object.image.stickerId,
    ).length;
    const nextSticker = createImageObject({
      image: getStickerImage(stickerId),
      name: `${copy.stickerObjectName} ${stickers + 1}`,
    });

    setSceneObjects((current) => [
      ...current,
      {
        ...nextSticker,
        ...getImageSpawnPosition(current),
        positionZ: NEW_FLAT_OBJECT_POSITION_Z,
      },
    ]);
    setSelectedObjectId(nextSticker.id);
  }

  /** O arquivo da imagem solta (ou o espaço vazio de volta); a proporção segue o que ele traz. */
  function updateObjectImage(id: string, patch: Partial<SceneImage>) {
    setSceneObjects((current) =>
      current.map((object) =>
        object.id === id && isImageObject(object)
          ? { ...object, image: { ...object.image, ...patch } }
          : object,
      ),
    );
  }

  async function handleObjectImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const id = selectedObject?.id;

    event.target.value = "";

    if (!file || !id) {
      return;
    }

    try {
      // A largura do objeto na cena é fixa: um arquivo de outra proporção
      // muda a altura, e o objeto não "cresce" (ver IMAGE_BASE_WIDTH).
      updateObjectImage(id, await readImageFile(file));
      setUploadError("");
    } catch (error) {
      console.error(error);
      setUploadError(copy.uploadImageError);
    }
  }

  /** Tira o arquivo e deixa o espaço vazio, na mesma proporção. */
  function handleRemoveObjectImage() {
    if (selectedObject) {
      updateObjectImage(selectedObject.id, {
        animation: null,
        isVector: false,
        name: null,
        url: null,
      });
    }
  }

  /** O que o texto diz ou como se vê; dentro dos limites, sempre. */
  function handleUpdateText(patch: Partial<SceneText>) {
    const id = selectedObject?.id;

    if (!id) {
      return;
    }

    // No Vídeo, cor e espaço entre letras são pose: vão para o keyframe
    // editado, como a posição, e o texto muda entre eles. O resto continua
    // sendo do texto, em qualquer modo. A atualização parte do estado atual,
    // não do render: o seletor de cor (memoizado) chama esta função de um
    // render antigo, e montar o keyframe daqui desfaria a edição anterior.
    if (motionTab === "motion" && selectedObject && isTextObject(selectedObject)) {
      const { color, letterSpacing, ...rest } = patch;
      const keyframeId = selectedKeyframe?.id;

      if (selectedKeyframe && keyframeId && (color !== undefined || letterSpacing !== undefined)) {
        setSceneObjects((current) =>
          current.map((object) => {
            const keyframe = isTextObject(object)
              ? object.keyframes.find((item) => item.id === keyframeId)
              : undefined;

            if (object.id !== id || !isTextObject(object) || !keyframe) {
              return object;
            }

            const clean = normalizeSceneText({
              ...object.text,
              ...(color !== undefined ? { color } : {}),
              ...(letterSpacing !== undefined ? { letterSpacing } : {}),
            });

            return {
              ...object,
              keyframes: updateKeyframe(object.keyframes, keyframeId, {
                transform: {
                  ...keyframe.transform,
                  ...(color !== undefined ? { textColor: clean.color } : {}),
                  ...(letterSpacing !== undefined
                    ? { letterSpacing: clean.letterSpacing }
                    : {}),
                },
              }),
            };
          }),
        );
        // Editar tem que ser o que se vê, como na pose.
        setPlayheadMs(selectedKeyframe.timeMs);
      }

      patch = rest;

      if (Object.keys(patch).length === 0) {
        return;
      }
    }

    setSceneObjects((current) =>
      current.map((object) =>
        object.id === id && isTextObject(object)
          ? { ...object, text: normalizeSceneText({ ...object.text, ...patch }) }
          : object,
      ),
    );
  }

  function handleRemoveObject(id: string) {
    setSceneObjects((current) => current.filter((object) => object.id !== id));
  }

  function getDuplicateName(name: string) {
    return `${name} copy`;
  }

  function handleDuplicateObject(id: string) {
    setSceneObjects((current) => {
      const source = current.find((object) => object.id === id);

      if (!source) {
        return current;
      }

      if (isTextObject(source)) {
        const copied = duplicateTextObject({
          name: getDuplicateName(source.name),
          source,
        });

        setSelectedObjectId(copied.id);
        return [...current, copied];
      }

      if (isImageObject(source)) {
        const copied = duplicateImageObject({
          name: getDuplicateName(source.name),
          source,
        });

        setSelectedObjectId(copied.id);
        return [...current, copied];
      }

      // A câmera é única por cena: não se duplica.
      if (isCameraObject(source)) {
        return current;
      }

      const duplicated = duplicateSceneObject({
        name: getDuplicateName(source.name),
        objects: current,
        source,
      });

      setSelectedObjectId(duplicated.id);
      return [...current, duplicated];
    });
  }

  function handleToggleObjectVisibility(id: string) {
    setSceneObjects((current) =>
      current.map((object) =>
        object.id === id
          ? { ...object, isVisible: !object.isVisible }
          : object,
      ),
    );
  }

  function handleThemeChange(themeId: string) {
    if (!selectedDevice) {
      return;
    }

    const model = DEVICE_MODELS[selectedDevice.modelId];
    updateSceneObject(selectedDevice.id, {
      colors: model.themes[themeId],
      deviceTheme: themeId,
    });
  }

  function handleThemeColorChange(part: string, hex: string) {
    if (!selectedDevice) {
      return;
    }

    const selectedId = selectedDevice.id;
    const model = DEVICE_MODELS[selectedDevice.modelId];

    startTransition(() => {
      setSceneObjects((current) =>
        current.map((object) => {
          if (object.id !== selectedId || !isDeviceObject(object)) {
            return object;
          }

          const nextColors = buildNextDeviceColors({
            currentColors: object.colors,
            hex,
            model,
            part,
          });

          if (nextColors === object.colors) {
            return object;
          }

          return {
            ...object,
            colors: nextColors,
            deviceTheme: "",
          };
        }),
      );
    });
  }

  function handleModelChange(modelId: DeviceObject["modelId"]) {
    if (!selectedDevice) {
      return;
    }

    setSceneObjects((current) =>
      current.map((object) =>
        object.id === selectedDevice.id && isDeviceObject(object)
          ? changeSceneObjectModel(object, modelId)
          : object,
      ),
    );
    setUploadError("");
  }

  function handleResetObject() {
    if (!selectedObject) {
      return;
    }

    // A câmera é a vista: reset é enquadrar a cena de novo, com a lente padrão.
    if (isCameraObject(selectedObject)) {
      cameraApiRef.current?.resetView();
      refreshLiveCamera();

      return;
    }

    const id = selectedObject.id;

    setSceneObjects((current) =>
      current.map((object) => {
        if (object.id !== id) {
          return object;
        }

        if (isDeviceObject(object)) {
          return resetSceneObject(object);
        }

        if (isCameraObject(object)) {
          return object;
        }

        return isImageObject(object)
          ? resetImageObject(object)
          : resetTextObject(object);
      }),
    );
  }

  function notify(tone: "error" | "success", message: string) {
    setNotification({ id: Date.now(), message, tone });
  }

  function persistAndSetTemplates(nextTemplates: SceneTemplate[]) {
    if (!persistTemplates(nextTemplates)) {
      notify("error", copy.templateSaveError);
      return false;
    }

    setTemplates(nextTemplates);
    return true;
  }

  // Estático e Movimento são ambientes separados: cada um salva e lista só os
  // próprios templates, e só os de Movimento guardam keyframes.
  const modeTemplates = getTemplatesForMode(templates, motionTab);

  const currentSnapshot = getTemplateSnapshot(
    sceneObjects,
    motionTab,
    canvasBgColor,
    motionFrame,
    canvasGrid,
  );
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot;

  function handleSaveTemplate() {
    const template = createSceneTemplate({
      backgroundColor: canvasBgColor,
      camera: cameraApiRef.current?.getPose() ?? null,
      frame: motionFrame,
      grid: canvasGrid,
      mode: motionTab,
      name: getNextTemplateName(modeTemplates),
      objects: sceneObjects,
    });

    if (!persistAndSetTemplates(upsertTemplate(templates, template))) {
      return false;
    }

    setSavedSnapshot(currentSnapshot);
    setSourceTemplate(motionTab, template.id);
    notify("success", copy.templateSavedMessage);
    return true;
  }

  function setSourceTemplate(mode: TemplateMode, id: string | null) {
    setSourceTemplateIds((current) => ({ ...current, [mode]: id }));
  }

  // O template de onde veio a cena deste modo, se ainda existe.
  const sourceTemplate =
    modeTemplates.find((template) => template.id === sourceTemplateIds[motionTab]) ??
    null;

  /**
   * O "Salvar template" da barra lateral: se a cena veio de um template,
   * pergunta se sobrepõe ele ou salva um novo. O "Salvar como template" do
   * Exportar e o "Salvar e sair" da troca de modo salvam sempre um novo, para
   * não interromper o fluxo deles com outro diálogo (decisão do usuário).
   */
  function handleRequestSaveTemplate() {
    if (sourceTemplate) {
      setIsOverwriteOpen(true);
      return;
    }

    handleSaveTemplate();
  }

  /** Sobrepõe o template de origem: o conteúdo é o de agora; nome e lugar ficam. */
  function handleOverwriteTemplate() {
    setIsOverwriteOpen(false);

    if (!sourceTemplate) {
      return;
    }

    const template = {
      ...createSceneTemplate({
        backgroundColor: canvasBgColor,
        camera: cameraApiRef.current?.getPose() ?? null,
        frame: motionFrame,
        grid: canvasGrid,
        id: sourceTemplate.id,
        mode: motionTab,
        name: sourceTemplate.name,
        objects: sceneObjects,
      }),
      createdAt: sourceTemplate.createdAt,
    };

    if (!persistAndSetTemplates(upsertTemplate(templates, template))) {
      return;
    }

    setSavedSnapshot(currentSnapshot);
    notify(
      "success",
      copy.templateOverwrittenMessage.replace("{name}", sourceTemplate.name),
    );
  }

  /**
   * Estático e Movimento são ambientes separados, cada um com a sua cena:
   * sair guarda a cena atual e entrar restaura a do outro modo. Na primeira
   * entrada no Movimento não há o que restaurar, e ele parte de uma cópia do
   * Estático — para animar o que já foi montado. Daí em diante são
   * independentes.
   *
   * `savedSnapshot` vem por parâmetro porque, em "salvar e sair", o estado
   * ainda não foi atualizado quando a cena é guardada.
   */
  function switchMode(mode: TemplateMode, snapshotToPark = savedSnapshot) {
    const target = parkedScenes[mode];

    setParkedScenes((current) => ({
      ...current,
      [motionTab]: {
        backgroundColor: canvasBgColor,
        grid: canvasGrid,
        camera: cameraApiRef.current?.getPose() ?? null,
        objects: sceneObjects,
        savedSnapshot: snapshotToPark,
        selectedObjectId,
      },
    }));

    if (target) {
      setSceneObjects(target.objects);
      setSelectedObjectId(target.selectedObjectId);
      setCanvasBgColor(target.backgroundColor);
      setCanvasGrid(target.grid);
      setSavedSnapshot(target.savedSnapshot);
      setPendingCamera(
        target.camera ? { pose: target.camera, source: "mode" } : null,
      );
    } else {
      // Mesmos ids de propósito: só uma cena é montada por vez, e manter os
      // ids evita recarregar os modelos e re-enquadrar a câmera na troca.
      setSavedSnapshot(
        getTemplateSnapshot(
          sceneObjects,
          mode,
          canvasBgColor,
          motionFrame,
          canvasGrid,
        ),
      );
    }

    setMotionTab(mode);
    setMotionStartedAt(null);
    setSelectedKeyframeId("");
  }

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);

    if (template) {
      applyTemplateScene(template);
    }
  }

  /**
   * Monta a cena de um template no modo atual. `message` troca o aviso de
   * template aplicado, que sai quando a cena assenta.
   */
  function applyTemplateScene(
    template: SceneTemplate,
    message = copy.templateAppliedMessage,
  ) {
    const nextObjects = applySceneTemplate(template);
    const nextFrame = template.frame ?? DEFAULT_MOTION_FRAME;

    setSourceTemplate(template.mode, template.id);

    setSceneObjects(nextObjects);
    setSelectedObjectId(nextObjects[0]?.id ?? "");
    // Os keyframes antigos deixaram de existir: nada de seleção pendurada nem
    // playback correndo sobre a cena anterior.
    setSelectedKeyframeId("");
    setMotionStartedAt(null);
    setPlayheadMs(0);
    setCanvasBgColor(template.backgroundColor);
    const nextGrid = normalizeCanvasGrid(template.grid);

    setCanvasGrid(nextGrid);

    if (template.mode === "motion") {
      setMotionFrame(nextFrame);
    }

    setSavedSnapshot(
      getTemplateSnapshot(
        nextObjects,
        template.mode,
        template.backgroundColor,
        nextFrame,
        nextGrid,
      ),
    );
    // A câmera é o último passo: fica pendente até a cena assentar.
    setPendingCamera(
      template.camera
        ? { message, pose: template.camera, source: "template" }
        : null,
    );

    if (!template.camera) {
      notify("success", message);
    }
  }

  /**
   * Abre a cena de um link de projeto: guarda como template deste navegador
   * — os templates do outro ficaram lá —, entra no modo dela e a monta. Só
   * acontece ao carregar a página, com a cena padrão na tela, então não há
   * trabalho a perder.
   *
   * É um evento à parte, chamado depois de decodificar o link: assim ele lê
   * o estado do render mais recente — o idioma salvo já aplicado —, e não o
   * do primeiro.
   */
  const openLinkedTemplate = useEffectEvent((template: SceneTemplate | null) => {
    if (!template) {
      notify("error", copy.projectLinkInvalid);
      return;
    }

    const saved = { ...template, name: copy.projectLinkTemplateName };

    persistAndSetTemplates(upsertTemplate(loadTemplates(), saved));

    if (saved.mode !== motionTab) {
      switchMode(saved.mode);
    }

    applyTemplateScene(saved, copy.projectLinkOpened);
  });

  useEffect(() => {
    const encoded = consumeSceneLinkFromUrl();

    if (encoded) {
      void decodeSceneLink(encoded).then(openLinkedTemplate);
    }
  }, []);

  /** O link desta cena, como está agora, para abrir em outro navegador. */
  function handleCreateProjectLink() {
    const template = createSceneTemplate({
      backgroundColor: canvasBgColor,
      camera: cameraApiRef.current?.getPose() ?? null,
      frame: motionFrame,
      grid: canvasGrid,
      mode: motionTab,
      name: copy.projectLinkTemplateName,
      objects: sceneObjects,
    });

    return createSceneLink(template, window.location.href);
  }

  function runAction(action: PendingAction, snapshotToPark?: string) {
    setPendingAction(null);

    if (action.kind === "mode") {
      switchMode(action.mode, snapshotToPark);
    } else {
      applyTemplate(action.templateId);
    }
  }

  // Trocar de modo ou abrir um template tira o trabalho atual da tela; se ele
  // não está em nenhum template, pergunta antes.
  function requestAction(action: PendingAction) {
    if (hasUnsavedChanges) {
      setPendingAction(action);
      return;
    }

    runAction(action);
  }

  function handleModeChange(mode: TemplateMode) {
    if (mode !== motionTab) {
      requestAction({ kind: "mode", mode });
    }
  }

  function handleApplyTemplate(id: string) {
    requestAction({ kind: "template", templateId: id });
  }

  // Estável: o AlertDialog reassina o Esc quando o callback muda.
  const handleCancelPendingAction = useCallback(
    () => setPendingAction(null),
    [],
  );
  const closeOverwriteDialog = useCallback(
    () => setIsOverwriteOpen(false),
    [],
  );

  function handleSaveAndContinue() {
    if (pendingAction && handleSaveTemplate()) {
      runAction(pendingAction, currentSnapshot);
    }
  }


  // --- Motion -------------------------------------------------------------
  // O modo Estático mexe no transform do objeto; o Movimento mexe nos
  // keyframes. Nenhum dos dois escreve no outro. Keyframes nascem, morrem e se
  // movem na timeline; o Inspector só edita a pose do keyframe selecionado.
  const selectedKeyframe =
    selectedObject?.keyframes.find(
      (keyframe) => keyframe.id === selectedKeyframeId,
    ) ?? null;

  const isMotionPlaying = motionStartedAt !== null;

  const sceneMotionDuration = getSceneMotionDuration(sceneObjects);

  // Em modo movimento a cena mostra o instante do playhead; fora dele, a pose
  // estática. Selecionar um keyframe move o playhead para o tempo dele, então
  // "ver um keyframe" e "parar num instante" são a mesma coisa.
  const motionPlayheadMs =
    !isMotionPlaying && motionTab === "motion" ? playheadMs : null;

  function findObject(objectId: string) {
    return sceneObjects.find((object) => object.id === objectId) ?? null;
  }

  /** Seleciona o keyframe e o objeto dele, e leva o playhead até o instante. */
  function selectKeyframe(objectId: string, keyframe: Keyframe) {
    setSelectedObjectId(objectId);
    setSelectedKeyframeId(keyframe.id);
    setPlayheadMs(keyframe.timeMs);
  }

  function handleSelectKeyframe(objectId: string, keyframeId: string) {
    const keyframe = findObject(objectId)?.keyframes.find(
      (item) => item.id === keyframeId,
    );

    if (keyframe) {
      selectKeyframe(objectId, keyframe);
    }
  }

  // Clicar no vazio da timeline é escolher um instante, não um keyframe: a
  // seleção sai, como no Premiere. Sem isso o Inspector mostraria um keyframe
  // enquanto a cena mostra outro instante.
  function handleScrub(timeMs: number) {
    setPlayheadMs(timeMs);
    setSelectedKeyframeId("");
  }

  function handleToggleKeyframeAtPlayhead(objectId: string) {
    const target = findObject(objectId);

    if (!target) return;

    const existing = findKeyframeAt(target.keyframes, playheadMs);

    if (existing) {
      handleRemoveKeyframe(objectId, existing.id);
      return;
    }

    // O keyframe da câmera captura a vista de agora (a interpolada, ou a que o
    // usuário orbitou depois), e não um valor guardado no objeto.
    if (isCameraObject(target)) {
      const orbit = cameraApiRef.current?.getOrbit();

      if (!orbit) return;

      const created = createCameraKeyframe(playheadMs, orbit);

      updateShared(objectId, {
        keyframes: [...target.keyframes, created].sort(
          (a, b) => a.timeMs - b.timeMs,
        ),
      });
      selectKeyframe(objectId, created);

      return;
    }

    const { id, keyframes } = insertKeyframe(target, playheadMs);
    const created = keyframes.find((keyframe) => keyframe.id === id);

    updateShared(objectId, { keyframes });

    if (created) {
      selectKeyframe(objectId, created);
    }
  }

  function handleRemoveKeyframe(objectId: string, keyframeId: string) {
    const target = findObject(objectId);

    if (!target) return;

    updateShared(objectId, {
      keyframes: removeKeyframe(target.keyframes, keyframeId),
    });

    if (keyframeId === selectedKeyframeId) {
      setSelectedKeyframeId("");
    }
  }

  // Arrastos da timeline e troca de transição. Se o keyframe selecionado se
  // moveu, o playhead vai junto para a cena seguir mostrando a pose dele.
  function handleChangeKeyframes(objectId: string, keyframes: Keyframe[]) {
    updateShared(objectId, { keyframes });

    const moved = keyframes.find(
      (keyframe) => keyframe.id === selectedKeyframeId,
    );

    if (moved) {
      setPlayheadMs(moved.timeMs);
    }
  }

  // O playback começa do playhead (ou do zero, se ele já estiver no fim) e,
  // ao parar, deixa o playhead onde a reprodução estava.
  function handleToggleMotionPlayback() {
    if (motionStartedAt !== null) {
      setPlayheadMs(
        Math.min(sceneMotionDuration, Date.now() - motionStartedAt),
      );
      setMotionStartedAt(null);
      return;
    }

    const from = playheadMs >= sceneMotionDuration ? 0 : playheadMs;

    setSelectedKeyframeId("");
    setMotionStartedAt(Date.now() - from);
  }

  // A barra de espaço é reservada ao play do Movimento, como em editor de
  // vídeo: ela não aciona botões nem itens de lista em nenhum modo (Enter
  // continua acionando). Sem isso, depois de clicar no ◆+ o espaço criaria
  // outro keyframe em vez de tocar. Ficam de fora campos de texto e o diálogo.
  const onPlaybackShortcut = useEffectEvent(() => {
    if (motionTab === "motion") {
      handleToggleMotionPlayback();
    }
  });

  useEffect(() => {
    function isSpaceOutsideTextField(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      return (
        event.code === "Space" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        // Com um diálogo aberto o espaço é dos botões dele.
        !target?.closest(
          "input, textarea, select, [contenteditable='true'], [role='alertdialog']",
        )
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isSpaceOutsideTextField(event)) return;

      event.preventDefault();

      if (!event.repeat) {
        onPlaybackShortcut();
      }
    }

    // O botão em foco é acionado no keyup do espaço; barrar aqui evita que o
    // atalho também clique nele.
    function handleKeyUp(event: KeyboardEvent) {
      if (isSpaceOutsideTextField(event)) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // O preview para sozinho no fim da cena — vale o objeto que termina por
  // último.
  useEffect(() => {
    if (motionStartedAt === null) {
      return;
    }

    const duration = getSceneMotionDuration(sceneObjects);
    const remaining = Math.max(0, duration - (Date.now() - motionStartedAt));

    const timeoutId = window.setTimeout(() => {
      setPlayheadMs(duration);
      setMotionStartedAt(null);
    }, remaining + 80);

    return () => window.clearTimeout(timeoutId);
  }, [motionStartedAt, sceneObjects]);

  // Em Movimento os controles editam o keyframe selecionado; em Estático, a
  // pose do objeto. Cada modo escreve só no seu lado.
  /**
   * Alinha o objeto ao quadro do canvas num eixo, na mesma distância da
   * câmera. Grava na pose em edição: a do objeto no Estático, a do keyframe
   * selecionado no Movimento.
   */
  function handleAlignObject(alignment: ObjectAlignment) {
    if (!selectedObject) return;

    const offset = cameraApiRef.current?.getAlignmentOffset(
      selectedObject.id,
      alignment,
    );
    const pose =
      motionTab === "motion" ? selectedKeyframe?.transform : selectedObject;

    if (!offset || !pose) return;

    const [dx, dy, dz] = offset;
    // Duas casas, como os campos mostram: menos de 1/100 de unidade não se vê.
    const round = (value: number) => Math.round(value * 100) / 100;

    updateTransform({
      positionX: round(pose.positionX + dx / OBJECT_POSITION_MULTIPLIER),
      positionY: round(pose.positionY + dy / OBJECT_POSITION_MULTIPLIER),
      positionZ: round(pose.positionZ + dz / OBJECT_POSITION_MULTIPLIER_Z),
    });
  }

  /**
   * Um campo da câmera mudou. No Foto leva a câmera ao valor (a vista é a
   * câmera) e lê de volta o que a trava deixou; no Vídeo escreve no keyframe
   * selecionado e põe o playhead nele, que é então o que o canvas mostra.
   */
  function handleUpdateCameraOrbit(patch: Partial<CameraOrbit>) {
    if (!selectedObject || !isCameraObject(selectedObject)) return;

    if (motionTab === "static") {
      const current = cameraApiRef.current?.getOrbit();

      if (!current) return;

      cameraApiRef.current?.setOrbit(normalizeOrbit({ ...current, ...patch }));
      refreshLiveCamera();

      return;
    }

    if (!selectedKeyframe?.transform.orbit) return;

    updateShared(selectedObject.id, {
      keyframes: updateKeyframe(selectedObject.keyframes, selectedKeyframe.id, {
        transform: {
          ...selectedKeyframe.transform,
          orbit: normalizeOrbit({ ...selectedKeyframe.transform.orbit, ...patch }),
        },
      }),
    });
    setPlayheadMs(selectedKeyframe.timeMs);
  }

  /**
   * A vista mudou por ação do usuário (gesto, setas, zoom, "Enquadrar cena",
   * "Enquadrar objeto"). No Vídeo, com um keyframe da câmera selecionado e o
   * playhead nele, ela vira a órbita desse keyframe — como os campos da câmera
   * já fazem. Sem keyframe selecionado a vista fica livre, e o "+" a captura.
   * Sem isso, enquadrar num keyframe sumia ao mover o playhead.
   */
  function handleCameraViewEdited() {
    if (motionTab !== "motion" || isMotionPlaying) return;
    if (!selectedObject || !isCameraObject(selectedObject)) return;
    if (!selectedKeyframe?.transform.orbit) return;
    if (playheadMs !== selectedKeyframe.timeMs) return;

    const view = cameraApiRef.current?.getOrbit();

    if (!view) return;

    const orbit = normalizeOrbit(view);

    if (isSameOrbit(orbit, selectedKeyframe.transform.orbit)) return;

    const keyframeId = selectedKeyframe.id;

    // A partir do estado atual: o canvas chama isto depois do render em que a
    // câmera parou, e a lista pode ter mudado no meio.
    setSceneObjects((current) =>
      current.map((object) =>
        object.id === selectedObject.id
          ? {
              ...object,
              keyframes: object.keyframes.map((keyframe) =>
                keyframe.id === keyframeId
                  ? { ...keyframe, transform: { ...keyframe.transform, orbit } }
                  : keyframe,
              ),
            }
          : object,
      ),
    );
  }

  function updateTransform(patch: PosePatch) {
    if (!selectedObject) return;

    if (motionTab === "static") {
      updateShared(selectedObject.id, patch);
      return;
    }

    if (!selectedKeyframe) return;

    updateShared(selectedObject.id, {
      keyframes: updateKeyframe(selectedObject.keyframes, selectedKeyframe.id, {
        transform: { ...selectedKeyframe.transform, ...patch },
      }),
    });

    // Editar tem que ser o que se vê: o playhead volta ao keyframe editado.
    setPlayheadMs(selectedKeyframe.timeMs);
  }

  /**
   * O código de um template salvo, para o modal de compartilhar: o que está
   * guardado, não a cena aberta. `null` (com o aviso na tela) se não deu.
   */
  async function handleCreateTemplateCode(id: string) {
    const template = templates.find((item) => item.id === id);

    if (!template) {
      return null;
    }

    return createCodeOrNotify(template);
  }

  async function createCodeOrNotify(template: SceneTemplate) {
    try {
      return await createSceneCode(template);
    } catch {
      notify("error", copy.templateCodeCreateError);
      return null;
    }
  }

  /**
   * Guarda como template o código que alguém compartilhou, colado à mão. Não
   * abre a cena nem muda de modo: só entra na lista (a do modo dela), com o
   * nome que veio. Devolve `false` se o código não vale, para o modal avisar.
   */
  async function handleImportTemplate(text: string) {
    const encoded = extractSceneLink(text);
    const template = encoded ? await decodeSceneLink(encoded) : null;

    if (!template) {
      return false;
    }

    if (!persistAndSetTemplates(upsertTemplate(templates, template))) {
      // O erro de gravação já foi mostrado; o código em si estava certo.
      return true;
    }

    notify(
      "success",
      template.mode === motionTab
        ? copy.templateImported
        : `${copy.templateImportedIn} ${
            template.mode === "motion"
              ? copy.canvasModeVideo
              : copy.canvasModePhoto
          }.`,
    );

    return true;
  }

  function handleFitObject(id: string) {
    cameraApiRef.current?.fitObject(id);
  }

  // Devolve a câmera ao enquadramento guardado naquele template, sem mexer nos
  // objetos — é só a câmera, não uma reaplicação.
  function handleRestoreTemplateView(id: string) {
    const template = templates.find((item) => item.id === id);

    if (template?.camera) {
      cameraApiRef.current?.setPose(template.camera);
    }
  }

  // A câmera pendente assentou. Só um template merece aviso; voltar a um modo
  // é só voltar.
  const isRestoringTemplate = pendingCamera?.source === "template";
  // Estável: vai para um efeito do canvas, que rodaria de novo a cada render.
  const refreshLiveCamera = useCallback(() => {
    const api = cameraApiRef.current;

    setLiveCamera({
      distanceRange: api?.getDistanceRange() ?? null,
      orbit: api?.getOrbit() ?? null,
    });
  }, []);
  // Selecionar a câmera (ou trocar de modo com ela selecionada) lê a vista de
  // agora: os campos dela nascem com o que se vê.
  const isCameraSelected = selectedObject ? isCameraObject(selectedObject) : false;

  useEffect(() => {
    if (isCameraSelected) {
      refreshLiveCamera();
    }
  }, [isCameraSelected, motionTab, refreshLiveCamera]);

  const handleCameraApiReady = useCallback(
    (api: CameraApi | null) => {
      cameraApiRef.current = api;
      refreshLiveCamera();
    },
    [refreshLiveCamera],
  );

  const appliedMessage = pendingCamera?.message;
  const handleTemplateApplied = useCallback(() => {
    setPendingCamera(null);

    if (isRestoringTemplate) {
      notify("success", appliedMessage ?? copy.templateAppliedMessage);
    }
  }, [appliedMessage, copy.templateAppliedMessage, isRestoringTemplate]);

  function handleRenameTemplate(id: string, name: string) {
    persistAndSetTemplates(renameTemplate(templates, id, name));
  }

  function handleRemoveTemplate(id: string) {
    persistAndSetTemplates(removeTemplate(templates, id));
  }

  return (
    <>
      <main className="app-shell app-desktop-shell min-h-screen relative flex">
      {!isUiHidden && (
        <LayersPanel
          appMeta={APP_VERSION}
          copy={copy}
          locale={locale}
          objects={displayObjects}
          onAddObject={handleAddObject}
          onAddImage={handleAddImage}
          onAddSticker={() => setStickerPickerMode("add")}
          onAddText={handleAddText}
          onDuplicateObject={handleDuplicateObject}
          onLocaleChange={setLocale}
          onRenameObject={(id, name) => updateShared(id, { name })}
          onRemoveObject={handleRemoveObject}
          onSelectObject={setSelectedObjectId}
          onToggleObjectVisibility={handleToggleObjectVisibility}
          onApplyTemplate={handleApplyTemplate}
          onFitObject={handleFitObject}
          onCreateTemplateCode={handleCreateTemplateCode}
          onImportTemplate={handleImportTemplate}
          onRestoreTemplateView={handleRestoreTemplateView}
          onRemoveTemplate={handleRemoveTemplate}
          onRenameTemplate={handleRenameTemplate}
          onSaveTemplate={handleRequestSaveTemplate}
          selectedObjectId={selectedObject?.id ?? ""}
          templates={modeTemplates}
          templatesEmptyHint={
            motionTab === "motion"
              ? copy.templatesEmptyHintMotion
              : copy.templatesEmptyHint
          }
        />
      )}

      <MockupCanvas
        bgColor={canvasBgColor}
        copy={copy}
        isUiHidden={isUiHidden}
        objects={sceneObjects}
        grid={canvasGrid}
        onBgColorChange={setCanvasBgColor}
        onGridChange={(patch) =>
          // A partir do estado atual: o seletor de cor (memoizado) chama de um
          // render antigo.
          setCanvasGrid((current) => normalizeCanvasGrid({ ...current, ...patch }))
        }
        onCameraApiReady={handleCameraApiReady}
        onCameraRest={refreshLiveCamera}
        onCameraViewEdited={handleCameraViewEdited}
        onNotify={(tone, message) =>
          setNotification({
            id: Date.now(),
            message,
            tone,
          })
        }
        onCreateProjectLink={handleCreateProjectLink}
        onSaveTemplate={handleSaveTemplate}
        onSelectObject={setSelectedObjectId}
        onTemplateApplied={handleTemplateApplied}
        onToggleUiHidden={() => setIsUiHidden((current) => !current)}
        isApplyingTemplate={isRestoringTemplate}
        pendingCameraPose={pendingCamera?.pose ?? null}
        isMotionMode={motionTab === "motion"}
        onMotionModeChange={(isMotionMode) =>
          handleModeChange(isMotionMode ? "motion" : "static")
        }
        locale={locale}
        motionFrame={motionTab === "motion" ? motionFrame : null}
        onStopMotion={() => setMotionStartedAt(null)}
        motionPlayheadMs={motionPlayheadMs}
        motionStartedAt={motionStartedAt}
        timeline={
          <MotionTimeline
            copy={copy}
            frame={motionFrame}
            isPlaying={isMotionPlaying}
            locale={locale}
            objects={displayObjects.filter((object) => object.isVisible)}
            onChangeFrame={setMotionFrame}
            onChangeKeyframes={handleChangeKeyframes}
            onChangeVideo={(objectId, screen, patch) =>
              updateSceneObject(objectId, (object) => {
                const video =
                  screen === "outer" ? object.outerScreenVideo : object.screenVideo;

                if (!video) {
                  return {};
                }

                return screen === "outer"
                  ? { outerScreenVideo: { ...video, ...patch } }
                  : { screenVideo: { ...video, ...patch } };
              })
            }
            onRemoveKeyframe={handleRemoveKeyframe}
            onScrub={handleScrub}
            onSelectKeyframe={handleSelectKeyframe}
            onSelectObject={setSelectedObjectId}
            onToggleKeyframeAtPlayhead={handleToggleKeyframeAtPlayhead}
            onTogglePlayback={handleToggleMotionPlayback}
            playbackStartedAt={motionStartedAt}
            playheadMs={playheadMs}
            sceneDurationMs={sceneMotionDuration}
            selectedKeyframeId={selectedKeyframeId}
            selectedObjectId={selectedObject?.id ?? ""}
          />
        }
        scaleOverrides={scaleOverrides}
        spawnOverrides={spawnOverrides}
        uiTheme={uiTheme}
      />

      {!isUiHidden && (
      <InspectorPanel
        copy={copy}
        object={displaySelectedObject}
        cameraOrbit={
          selectedObject && isCameraObject(selectedObject)
            ? motionTab === "motion"
              ? (selectedKeyframe?.transform.orbit ?? null)
              : liveCamera.orbit
            : null
        }
        cameraDistanceRange={liveCamera.distanceRange}
        onUpdateCameraOrbit={handleUpdateCameraOrbit}
        onImageUpload={handleImageUpload}
        onVideoUpload={handleVideoUpload}
        onRemoveImage={() =>
          selectedDevice &&
          // De volta ao placeholder do modelo — e as sub-opções da tela somem
          // com ele, já que não há mais o que ajustar.
          updateSceneObject(selectedDevice.id, (object) => ({
            imageFit: { ...DEFAULT_SCREEN_FIT },
            imageName: null,
            imageUrl: getPlaceholderImageUrl(object.modelId),
          }))
        }
        onRemoveVideo={() =>
          selectedDevice &&
          updateSceneObject(selectedDevice.id, { screenVideo: null })
        }
        onUpdateScreenFit={(patch) => {
          if (!selectedDevice) return;

          // Grava no enquadramento da fonte que está na tela.
          updateSceneObject(selectedDevice.id, (object) => {
            const video = getActiveScreenVideo(object);

            return video
              ? { screenVideo: { ...video, fit: { ...video.fit, ...patch } } }
              : { imageFit: { ...object.imageFit, ...patch } };
          });
        }}
        onScreenSourceChange={(screenSource) => {
          if (!selectedDevice) return;

          setUploadError("");
          updateSceneObject(selectedDevice.id, { screenSource });
        }}
        onModelChange={handleModelChange}
        onResetObject={handleResetObject}
        onRemoveObjectImage={handleRemoveObjectImage}
        onChangeSticker={() => setStickerPickerMode("swap")}
        onUpdateImageSpeed={(speed) =>
          selectedObject &&
          updateObjectImage(selectedObject.id, { speed: normalizeImageSpeed(speed) })
        }
        onUpdateImageShadow={(shadow) =>
          selectedObject && updateObjectImage(selectedObject.id, { shadow })
        }
        onUpdateImageOutline={(outline) =>
          selectedObject &&
          updateObjectImage(selectedObject.id, { outline })
        }
        onUpdateText={handleUpdateText}
        onUploadObjectImage={handleObjectImageUpload}
        onAlignObject={handleAlignObject}
        onThemeColorChange={handleThemeColorChange}
        onThemeChange={handleThemeChange}
        onToggleDeviceShell={() =>
          selectedDevice && updateSceneObject(selectedDevice.id, {
            showDeviceShell: !selectedDevice?.showDeviceShell,
          })
        }
        onToggleNotebookKeyboard={() =>
          selectedDevice && updateSceneObject(selectedDevice.id, {
            showNotebookKeyboard: !selectedDevice?.showNotebookKeyboard,
          })
        }
        onToggleMatteFinish={() =>
          selectedDevice && updateSceneObject(selectedDevice.id, {
            matteFinish: !selectedDevice?.matteFinish,
          })
        }
        onToggleTabletBezel={() =>
          selectedDevice && updateSceneObject(selectedDevice.id, {
            showTabletBezel: !selectedDevice?.showTabletBezel,
          })
        }
        onUpdatePosition={(positionPatch) => updateTransform(positionPatch)}
        onUpdateRotation={(rotationPatch) => updateTransform(rotationPatch)}
        onUpdateScale={(scale) => updateTransform({ scale })}
        onUpdateOpacity={(opacity) => updateTransform({ opacity })}
        onUpdateFoldAngle={(foldAngle) => updateTransform({ foldAngle })}
        onOuterImageUpload={(event) => handleImageUpload(event, "outer")}
        onOuterVideoUpload={(event) => handleVideoUpload(event, "outer")}
        onRemoveOuterVideo={() =>
          selectedDevice &&
          updateSceneObject(selectedDevice.id, { outerScreenVideo: null })
        }
        onOuterScreenSourceChange={(outerScreenSource) => {
          if (!selectedDevice) return;

          setUploadError("");
          updateSceneObject(selectedDevice.id, { outerScreenSource });
        }}
        onRemoveOuterImage={() =>
          selectedDevice &&
          updateSceneObject(selectedDevice.id, {
            outerImageFit: { ...DEFAULT_SCREEN_FIT },
            outerImageName: null,
            outerImageUrl: null,
          })
        }
        onUpdateOuterScreenFit={(patch) =>
          selectedDevice &&
          // Grava no enquadramento da fonte que está na tela de fora.
          updateSceneObject(selectedDevice.id, (object) => {
            const video = getActiveOuterScreenVideo(object);

            return video
              ? { outerScreenVideo: { ...video, fit: { ...video.fit, ...patch } } }
              : { outerImageFit: { ...object.outerImageFit, ...patch } };
          })
        }
        motionTab={motionTab}
        selectedKeyframeId={selectedKeyframeId}
        uiTheme={uiTheme}
        uploadError={uploadError}
      />
      )}
      </main>
      {/* O seletor de arquivos do "+ Imagem": fora do menu, que fecha ao escolher. */}
      <input
        ref={addImageInputRef}
        accept={IMAGE_OBJECT_ACCEPT}
        aria-hidden
        hidden
        tabIndex={-1}
        type="file"
        onChange={handleAddImageFile}
      />
      {/* Montada só aberta: a busca e a categoria de uma vez não ficam para a
          próxima. */}
      {stickerPickerMode !== null ? (
        <StickerPicker
          copy={copy}
          isOpen
          onCancel={() => setStickerPickerMode(null)}
          onPick={handlePickSticker}
        />
      ) : null}
      <AlertDialog
        isOpen={pendingAction !== null}
        title={
          pendingAction?.kind === "template"
            ? copy.templateOpenTitle
            : copy.modeSwitchTitle
        }
        description={
          motionTab === "motion"
            ? copy.modeSwitchBodyMotion
            : copy.modeSwitchBodyStatic
        }
        cancelLabel={copy.modeSwitchCancel}
        onCancel={handleCancelPendingAction}
        actions={[
          {
            label:
              pendingAction?.kind === "template"
                ? copy.templateOpenDiscard
                : copy.modeSwitchDiscard,
            onClick: () => pendingAction && runAction(pendingAction),
          },
          {
            label:
              pendingAction?.kind === "template"
                ? copy.templateOpenSave
                : copy.modeSwitchSave,
            onClick: handleSaveAndContinue,
            variant: "primary",
          },
        ]}
      />
      <AlertDialog
        isOpen={isOverwriteOpen && sourceTemplate !== null}
        title={copy.templateOverwriteTitle}
        description={copy.templateOverwriteDescription.replace(
          "{name}",
          sourceTemplate?.name ?? "",
        )}
        cancelLabel={copy.dialogCancel}
        onCancel={closeOverwriteDialog}
        actions={[
          {
            label: copy.templateSaveAsNew,
            onClick: () => {
              setIsOverwriteOpen(false);
              handleSaveTemplate();
            },
          },
          {
            label: copy.templateOverwrite.replace(
              "{name}",
              sourceTemplate?.name ?? "",
            ),
            onClick: handleOverwriteTemplate,
            variant: "primary",
          },
        ]}
      />
      <AnalyticsConsent copy={copy} />
      <Snackbar
        dismissLabel={copy.dismissSnackbar}
        notification={notification}
        onDismiss={() => setNotification(null)}
      />

      <section
        className="desktop-only-blocker"
        aria-labelledby="desktop-only-title"
      >
        <div className="desktop-only-card panel-card">
          <p className="desktop-only-eyebrow">{copy.appTitle}</p>
          <h1 id="desktop-only-title" className="desktop-only-title">
            {copy.desktopOnlyTitle}
          </h1>
          <p className="desktop-only-body">
            {copy.desktopOnlyBody.replace("{size}", minViewportLabel)}
          </p>
          <p className="desktop-only-hint">{copy.desktopOnlyHint}</p>
        </div>
      </section>
    </>
  );
}
