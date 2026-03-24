"use client";

import { ChangeEvent, startTransition, useEffect, useRef, useState } from "react";
import type { ScaleOverrides, SpawnOverrides } from "./components/MockupCanvas/MockupCanvas";
import InspectorPanel from "./components/InspectorPanel/InspectorPanel";
import LayersPanel from "./components/LayersPanel/LayersPanel";
import MockupCanvas from "./components/MockupCanvas/MockupCanvas";
import Snackbar, {
  type SnackbarNotification,
} from "./components/Snackbar/Snackbar";
import { APP_VERSION } from "./lib/app-version";
import { APP_COPY, type Locale, type UiTheme } from "./lib/i18n";
import { readFileAsDataUrl } from "./lib/mockup-image";
import {
  changeSceneObjectModel,
  createSceneObject,
  getOffsetSpawnTransform,
  resetSceneObject,
  type SceneObject,
} from "./lib/scene-objects";
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
  const [scaleOverrides] = useState<ScaleOverrides>({});
  const [spawnOverrides] = useState<SpawnOverrides>({});
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
      const spawnTransform = getOffsetSpawnTransform(current, nextObject.modelId);

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

    const model = DEVICE_MODELS[selectedObject.modelId];
    if (selectedObject.colors[part] === hex) {
      return;
    }

    const primaryColorKey = model.primaryColorKey;
    const isPrimaryColorUpdate = Boolean(primaryColorKey && part === primaryColorKey);

    const nextColors = isPrimaryColorUpdate
      ? {
          ...model.buildColorsFromPrimary(hex),
          ...Object.fromEntries(
            model.customizableColorKeys.map((key) => [
              key,
              key === part
                ? hex
                : (selectedObject.colors[key] ??
                  model.buildColorsFromPrimary(hex)[key]),
            ]),
          ),
        }
      : {
          ...selectedObject.colors,
          [part]: hex,
        };

    startTransition(() => {
      updateSceneObject(selectedObject.id, {
        colors: nextColors,
        deviceTheme: "",
      });
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

  return (
    <>
      <main className="app-shell app-desktop-shell min-h-screen relative flex">
      <LayersPanel
        appMeta={APP_VERSION}
        copy={copy}
        locale={locale}
        objects={sceneObjects}
        onAddObject={handleAddObject}
        onLocaleChange={setLocale}
        onRenameObject={(id, name) => updateSceneObject(id, { name })}
        onRemoveObject={handleRemoveObject}
        onSelectObject={setSelectedObjectId}
        onToggleObjectVisibility={handleToggleObjectVisibility}
        onUiThemeChange={setUiTheme}
        selectedObjectId={selectedObject?.id ?? ""}
        uiTheme={uiTheme}
      />

      <MockupCanvas
        copy={copy}
        objects={sceneObjects}
        onNotify={(tone, message) =>
          setNotification({
            id: Date.now(),
            message,
            tone,
          })
        }
        onSelectObject={setSelectedObjectId}
        scaleOverrides={scaleOverrides}
        spawnOverrides={spawnOverrides}
        uiTheme={uiTheme}
      />

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
        onToggleMatteColors={() =>
          selectedObject && updateSceneObject(selectedObject.id, {
            matteColors: !selectedObject?.matteColors,
          })
        }
        onUpdatePosition={(positionPatch) =>
          selectedObject && updateSceneObject(selectedObject.id, positionPatch)
        }
        onUpdateRotation={(rotationPatch) =>
          selectedObject && updateSceneObject(selectedObject.id, rotationPatch)
        }
        onUpdateScale={(scale) =>
          selectedObject && updateSceneObject(selectedObject.id, { scale })
        }
        uiTheme={uiTheme}
        uploadError={uploadError}
      />
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
