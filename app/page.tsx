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
import InspectorPanel from "./components/InspectorPanel/InspectorPanel";
import LayersPanel from "./components/LayersPanel/LayersPanel";
import MotionTimeline from "./components/MotionTimeline/MotionTimeline";
import MockupCanvas from "./components/MockupCanvas/MockupCanvas";
import Snackbar, {
  type SnackbarNotification,
} from "./components/Snackbar/Snackbar";
import { APP_VERSION } from "./lib/app-version";
import { buildNextDeviceColors } from "./lib/device-colors";
import { APP_COPY, type Locale, type UiTheme } from "./lib/i18n";
import { readFileAsDataUrl } from "./lib/mockup-image";
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
  createSceneObject,
  duplicateSceneObject,
  getSequentialSpawnTransform,
  resetSceneObject,
  type SceneObject,
} from "./lib/scene-objects";
import {
  applySceneTemplate,
  createSceneTemplate,
  getNextTemplateName,
  loadTemplates,
  persistTemplates,
  removeTemplate,
  renameTemplate,
  upsertTemplate,
  type CameraPose,
  type SceneTemplate,
} from "./lib/scene-templates";
import { DEVICE_MODELS } from "./models/device-models";

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
  const [motionTab, setMotionTab] = useState<"static" | "motion">("static");
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
  const [templates, setTemplates] = useState<SceneTemplate[]>([]);
  // Enquanto não for null, o canvas fica bloqueado aplicando o template.
  const [pendingCameraPose, setPendingCameraPose] = useState<CameraPose | null>(
    null,
  );
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

  function updateSceneObject(id: string, patch: Partial<SceneObject>) {
    setSceneObjects((current) =>
      current.map((object) =>
        object.id === id ? { ...object, ...patch } : object,
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
      updateSceneObject(selectedObject.id, { imageUrl: nextImage });
      setUploadError("");
    } catch (error) {
      console.error(error);
      setUploadError(copy.uploadImageError);
    } finally {
      event.target.value = "";
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

  function handleSaveTemplate() {
    const template = createSceneTemplate({
      backgroundColor: canvasBgColor,
      camera: cameraApiRef.current?.getPose() ?? null,
      name: getNextTemplateName(templates),
      objects: sceneObjects,
    });

    if (persistAndSetTemplates(upsertTemplate(templates, template))) {
      notify("success", copy.templateSavedMessage);
    }
  }

  function handleApplyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);

    if (!template) {
      return;
    }

    const nextObjects = applySceneTemplate(template);

    setSceneObjects(nextObjects);
    setSelectedObjectId(nextObjects[0]?.id ?? "");
    setCanvasBgColor(template.backgroundColor);
    // A câmera é o último passo: fica pendente até a cena assentar.
    setPendingCameraPose(template.camera);

    if (!template.camera) {
      notify("success", copy.templateAppliedMessage);
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

  // Barra de espaço dá play/stop no modo movimento, como em editor de vídeo.
  // Vale mesmo com um botão em foco — senão, depois de clicar no ◆+, o espaço
  // criaria outro keyframe em vez de tocar. Só campos de texto ficam de fora.
  const onPlaybackShortcut = useEffectEvent(handleToggleMotionPlayback);

  useEffect(() => {
    if (motionTab !== "motion") {
      return;
    }

    function isSpaceOutsideTextField(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      return (
        event.code === "Space" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !target?.closest("input, textarea, select, [contenteditable='true']")
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
  }, [motionTab]);

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

  const handleTemplateApplied = useCallback(() => {
    setPendingCameraPose(null);
    notify("success", copy.templateAppliedMessage);
  }, [copy.templateAppliedMessage]);

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
          templates={templates}
          uiTheme={uiTheme}
        />
      )}

      <MockupCanvas
        bgColor={canvasBgColor}
        copy={copy}
        isUiHidden={isUiHidden}
        objects={sceneObjects}
        onBgColorChange={setCanvasBgColor}
        onCameraApiReady={(api) => {
          cameraApiRef.current = api;
        }}
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
        pendingCameraPose={pendingCameraPose}
        isMotionMode={motionTab === "motion"}
        onMotionModeChange={(isMotionMode) =>
          setMotionTab(isMotionMode ? "motion" : "static")
        }
        motionPlayheadMs={motionPlayheadMs}
        motionStartedAt={motionStartedAt}
        timeline={
          <MotionTimeline
            copy={copy}
            isPlaying={isMotionPlaying}
            objects={sceneObjects.filter((object) => object.isVisible)}
            onChangeKeyframes={handleChangeKeyframes}
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
        onModelChange={handleModelChange}
        onResetObject={handleResetObject}
        onThemeColorChange={handleThemeColorChange}
        onThemeChange={handleThemeChange}
        onToggleCustomColors={() =>
          selectedObject && updateSceneObject(selectedObject.id, {
            customColorsEnabled: !selectedObject?.customColorsEnabled,
          })
        }
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
        motionTab={motionTab}
        selectedKeyframeId={selectedKeyframeId}
        uiTheme={uiTheme}
        uploadError={uploadError}
      />
      )}
      </main>
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
