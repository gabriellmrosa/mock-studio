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
import InspectorPanel from "./components/InspectorPanel/InspectorPanel";
import LayersPanel from "./components/LayersPanel/LayersPanel";
import MotionTimeline from "./components/MotionTimeline/MotionTimeline";
import MockupCanvas from "./components/MockupCanvas/MockupCanvas";
import type { ObjectAlignment } from "./components/MockupCanvas/object-alignment";
import Snackbar, {
  type SnackbarNotification,
} from "./components/Snackbar/Snackbar";
import { APP_VERSION } from "./lib/app-version";
import { buildNextDeviceColors } from "./lib/device-colors";
import { APP_COPY, type Locale, type UiTheme } from "./lib/i18n";
import { probeVideoFile, readFileAsDataUrl } from "./lib/mockup-image";
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
  getActiveScreenVideo,
  getPlaceholderImageUrl,
  duplicateSceneObject,
  getSequentialSpawnTransform,
  resetSceneObject,
  type SceneObject,
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
import { DEVICE_MODELS } from "./models/device-models";

/** Cena de um modo guardada enquanto o outro está ativo. */
type ModeScene = {
  backgroundColor: string | null;
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

const MIN_DESKTOP_WIDTH = 1280;
const MIN_DESKTOP_HEIGHT = 800;

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

function detectBrowserTheme(): UiTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("pt-BR");
  const [uiTheme, setUiTheme] = useState<UiTheme>("dark");
  const [notification, setNotification] = useState<SnackbarNotification | null>(
    null,
  );
  const isInitialized = useRef(false);
  const [uploadError, setUploadError] = useState("");
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>(() => [
    createSceneObject({
      deletable: false,
      id: "base-object",
      name: "Object 1",
    }),
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
    pose: CameraPose;
    source: "mode" | "template";
  } | null>(null);
  const cameraApiRef = useRef<CameraApi | null>(null);
  const copy = APP_COPY[locale];
  const minViewportLabel = `${MIN_DESKTOP_WIDTH} x ${MIN_DESKTOP_HEIGHT} px`;
  const selectedObject =
    sceneObjects.find((object) => object.id === selectedObjectId) ??
    sceneObjects[0] ??
    null;

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("mock-photo-locale");
    const storedUiTheme = window.localStorage.getItem("mock-photo-ui-theme");

    setLocale(
      storedLocale === "pt-BR" || storedLocale === "en-US"
        ? storedLocale
        : detectBrowserLocale(),
    );

    setUiTheme(
      storedUiTheme === "dark" || storedUiTheme === "light"
        ? storedUiTheme
        : detectBrowserTheme(),
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
    if (!isInitialized.current) return;
    window.localStorage.setItem("mock-photo-ui-theme", uiTheme);
    document.documentElement.dataset.theme = uiTheme;
  }, [uiTheme]);

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
   * `patch` pode ser uma função do objeto atual. Use-a para mexer em campos
   * aninhados (enquadramento, dados do vídeo): montar o objeto novo a partir
   * do `selectedObject` do render faz duas mudanças seguidas se atropelarem —
   * a cor de fundo, que o ColorRow grava com atraso, desfazia o zoom.
   */
  function updateSceneObject(
    id: string,
    patch: Partial<SceneObject> | ((object: SceneObject) => Partial<SceneObject>),
  ) {
    setSceneObjects((current) =>
      current.map((object) =>
        object.id === id
          ? {
              ...object,
              ...(typeof patch === "function" ? patch(object) : patch),
            }
          : object,
      ),
    );
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedObject) {
      return;
    }

    try {
      const nextImage = await readFileAsDataUrl(file);
      // Imagem nova, enquadramento novo: o anterior foi feito para outra.
      updateSceneObject(selectedObject.id, {
        imageFit: { ...DEFAULT_SCREEN_FIT },
        imageName: file.name,
        imageUrl: nextImage,
      });
      setUploadError("");
    } catch (error) {
      console.error(error);
      setUploadError(copy.uploadImageError);
    } finally {
      event.target.value = "";
    }
  }

  async function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const target = selectedObject;

    event.target.value = "";

    if (!file || !target) {
      return;
    }

    try {
      const { durationMs, url } = await probeVideoFile(file);

      updateSceneObject(target.id, {
        screenSource: "video",
        screenVideo: {
          durationMs,
          fit: { ...DEFAULT_SCREEN_FIT },
          name: file.name,
          startMs: 0,
          trimEndMs: 0,
          trimStartMs: 0,
          url,
        },
      });
      setUploadError("");
    } catch (error) {
      console.error(error);
      setUploadError(copy.uploadVideoError);
    }
  }

  function handleAddObject() {
    const nextObject = createSceneObject({
      name: `Object ${sceneObjects.length + 1}`,
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
    if (!selectedObject) {
      return;
    }

    const model = DEVICE_MODELS[selectedObject.modelId];
    updateSceneObject(selectedObject.id, {
      colors: model.themes[themeId],
      deviceTheme: themeId,
    });
  }

  function handleThemeColorChange(part: string, hex: string) {
    if (!selectedObject) {
      return;
    }

    const selectedId = selectedObject.id;
    const model = DEVICE_MODELS[selectedObject.modelId];

    startTransition(() => {
      setSceneObjects((current) =>
        current.map((object) => {
          if (object.id !== selectedId) {
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

  function handleModelChange(modelId: SceneObject["modelId"]) {
    if (!selectedObject) {
      return;
    }

    setSceneObjects((current) =>
      current.map((object) =>
        object.id === selectedObject.id
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

    setSceneObjects((current) =>
      current.map((object) =>
        object.id === selectedObject.id ? resetSceneObject(object) : object,
      ),
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
  );
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot;

  function handleSaveTemplate() {
    const template = createSceneTemplate({
      backgroundColor: canvasBgColor,
      camera: cameraApiRef.current?.getPose() ?? null,
      frame: motionFrame,
      mode: motionTab,
      name: getNextTemplateName(modeTemplates),
      objects: sceneObjects,
    });

    if (!persistAndSetTemplates(upsertTemplate(templates, template))) {
      return false;
    }

    setSavedSnapshot(currentSnapshot);
    notify("success", copy.templateSavedMessage);
    return true;
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
      setSavedSnapshot(target.savedSnapshot);
      setPendingCamera(
        target.camera ? { pose: target.camera, source: "mode" } : null,
      );
    } else {
      // Mesmos ids de propósito: só uma cena é montada por vez, e manter os
      // ids evita recarregar os modelos e re-enquadrar a câmera na troca.
      setSavedSnapshot(
        getTemplateSnapshot(sceneObjects, mode, canvasBgColor, motionFrame),
      );
    }

    setMotionTab(mode);
    setMotionStartedAt(null);
    setSelectedKeyframeId("");
  }

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);

    if (!template) {
      return;
    }

    const nextObjects = applySceneTemplate(template);
    const nextFrame = template.frame ?? DEFAULT_MOTION_FRAME;

    setSceneObjects(nextObjects);
    setSelectedObjectId(nextObjects[0]?.id ?? "");
    // Os keyframes antigos deixaram de existir: nada de seleção pendurada nem
    // playback correndo sobre a cena anterior.
    setSelectedKeyframeId("");
    setMotionStartedAt(null);
    setPlayheadMs(0);
    setCanvasBgColor(template.backgroundColor);

    if (template.mode === "motion") {
      setMotionFrame(nextFrame);
    }

    setSavedSnapshot(
      getTemplateSnapshot(
        nextObjects,
        template.mode,
        template.backgroundColor,
        nextFrame,
      ),
    );
    // A câmera é o último passo: fica pendente até a cena assentar.
    setPendingCamera(
      template.camera ? { pose: template.camera, source: "template" } : null,
    );

    if (!template.camera) {
      notify("success", copy.templateAppliedMessage);
    }
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

    const { id, keyframes } = insertKeyframe(target, playheadMs);
    const created = keyframes.find((keyframe) => keyframe.id === id);

    updateSceneObject(objectId, { keyframes });

    if (created) {
      selectKeyframe(objectId, created);
    }
  }

  function handleRemoveKeyframe(objectId: string, keyframeId: string) {
    const target = findObject(objectId);

    if (!target) return;

    updateSceneObject(objectId, {
      keyframes: removeKeyframe(target.keyframes, keyframeId),
    });

    if (keyframeId === selectedKeyframeId) {
      setSelectedKeyframeId("");
    }
  }

  // Arrastos da timeline e troca de transição. Se o keyframe selecionado se
  // moveu, o playhead vai junto para a cena seguir mostrando a pose dele.
  function handleChangeKeyframes(objectId: string, keyframes: Keyframe[]) {
    updateSceneObject(objectId, { keyframes });

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

  function updateTransform(patch: Partial<SceneObject>) {
    if (!selectedObject) return;

    if (motionTab === "static") {
      updateSceneObject(selectedObject.id, patch);
      return;
    }

    if (!selectedKeyframe) return;

    updateSceneObject(selectedObject.id, {
      keyframes: updateKeyframe(selectedObject.keyframes, selectedKeyframe.id, {
        transform: { ...selectedKeyframe.transform, ...patch },
      }),
    });

    // Editar tem que ser o que se vê: o playhead volta ao keyframe editado.
    setPlayheadMs(selectedKeyframe.timeMs);
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
  const handleCameraApiReady = useCallback((api: CameraApi | null) => {
    cameraApiRef.current = api;
  }, []);

  const handleTemplateApplied = useCallback(() => {
    setPendingCamera(null);

    if (isRestoringTemplate) {
      notify("success", copy.templateAppliedMessage);
    }
  }, [copy.templateAppliedMessage, isRestoringTemplate]);

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
          objects={sceneObjects}
          onAddObject={handleAddObject}
          onDuplicateObject={handleDuplicateObject}
          onLocaleChange={setLocale}
          onRenameObject={(id, name) => updateSceneObject(id, { name })}
          onRemoveObject={handleRemoveObject}
          onSelectObject={setSelectedObjectId}
          onToggleObjectVisibility={handleToggleObjectVisibility}
          onUiThemeChange={setUiTheme}
          onApplyTemplate={handleApplyTemplate}
          onFitObject={handleFitObject}
          onRestoreTemplateView={handleRestoreTemplateView}
          onRemoveTemplate={handleRemoveTemplate}
          onRenameTemplate={handleRenameTemplate}
          onSaveTemplate={handleSaveTemplate}
          selectedObjectId={selectedObject?.id ?? ""}
          templates={modeTemplates}
          templatesEmptyHint={
            motionTab === "motion"
              ? copy.templatesEmptyHintMotion
              : copy.templatesEmptyHint
          }
          uiTheme={uiTheme}
        />
      )}

      <MockupCanvas
        bgColor={canvasBgColor}
        copy={copy}
        isUiHidden={isUiHidden}
        objects={sceneObjects}
        onBgColorChange={setCanvasBgColor}
        onCameraApiReady={handleCameraApiReady}
        onNotify={(tone, message) =>
          setNotification({
            id: Date.now(),
            message,
            tone,
          })
        }
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
            objects={sceneObjects.filter((object) => object.isVisible)}
            onChangeFrame={setMotionFrame}
            onChangeKeyframes={handleChangeKeyframes}
            onChangeVideo={(objectId, patch) =>
              updateSceneObject(objectId, (object) =>
                object.screenVideo
                  ? { screenVideo: { ...object.screenVideo, ...patch } }
                  : {},
              )
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
        object={selectedObject}
        onImageUpload={handleImageUpload}
        onVideoUpload={handleVideoUpload}
        onRemoveImage={() =>
          selectedObject &&
          // De volta ao placeholder do modelo — e as sub-opções da tela somem
          // com ele, já que não há mais o que ajustar.
          updateSceneObject(selectedObject.id, (object) => ({
            imageFit: { ...DEFAULT_SCREEN_FIT },
            imageName: null,
            imageUrl: getPlaceholderImageUrl(object.modelId),
          }))
        }
        onRemoveVideo={() =>
          selectedObject &&
          updateSceneObject(selectedObject.id, { screenVideo: null })
        }
        onUpdateScreenFit={(patch) => {
          if (!selectedObject) return;

          // Grava no enquadramento da fonte que está na tela.
          updateSceneObject(selectedObject.id, (object) => {
            const video = getActiveScreenVideo(object);

            return video
              ? { screenVideo: { ...video, fit: { ...video.fit, ...patch } } }
              : { imageFit: { ...object.imageFit, ...patch } };
          });
        }}
        onScreenSourceChange={(screenSource) => {
          if (!selectedObject) return;

          setUploadError("");
          updateSceneObject(selectedObject.id, { screenSource });
        }}
        onModelChange={handleModelChange}
        onResetObject={handleResetObject}
        onAlignObject={handleAlignObject}
        onThemeColorChange={handleThemeColorChange}
        onThemeChange={handleThemeChange}
        onToggleDeviceShell={() =>
          selectedObject && updateSceneObject(selectedObject.id, {
            showDeviceShell: !selectedObject?.showDeviceShell,
          })
        }
        onToggleNotebookKeyboard={() =>
          selectedObject && updateSceneObject(selectedObject.id, {
            showNotebookKeyboard: !selectedObject?.showNotebookKeyboard,
          })
        }
        onToggleTabletBezel={() =>
          selectedObject && updateSceneObject(selectedObject.id, {
            showTabletBezel: !selectedObject?.showTabletBezel,
          })
        }
        onToggleMatteColors={() =>
          selectedObject && updateSceneObject(selectedObject.id, {
            matteColors: !selectedObject?.matteColors,
          })
        }
        onUpdatePosition={(positionPatch) => updateTransform(positionPatch)}
        onUpdateRotation={(rotationPatch) => updateTransform(rotationPatch)}
        onUpdateScale={(scale) => updateTransform({ scale })}
        onUpdateOpacity={(opacity) => updateTransform({ opacity })}
        motionTab={motionTab}
        selectedKeyframeId={selectedKeyframeId}
        uiTheme={uiTheme}
        uploadError={uploadError}
      />
      )}
      </main>
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
