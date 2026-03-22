"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Leva } from "leva";
import type { ScaleOverrides, SpawnOverrides } from "./components/MockupCanvas/MockupCanvas";
import InspectorPanel from "./components/InspectorPanel/InspectorPanel";
import LayersPanel from "./components/LayersPanel/LayersPanel";
import MockupCanvas from "./components/MockupCanvas/MockupCanvas";
import { APP_COPY, type Locale, type UiTheme } from "./lib/i18n";
import { readFileAsDataUrl } from "./lib/mockup-image";
import {
  changeSceneObjectModel,
  createSceneObject,
  resetSceneObject,
  type SceneObject,
} from "./lib/scene-objects";
import { DEVICE_MODELS } from "./models/device-models";

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
  const isInitialized = useRef(false);
  const [uploadError, setUploadError] = useState("");
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>(() => [
    createSceneObject({
      deletable: false,
      id: "base-object",
      name: "Object 1",
    }),
  ]);
  const [canvasBgColor, setCanvasBgColor] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [resetCameraVersion] = useState(0);
  const [scaleOverrides] = useState<ScaleOverrides>({});
  const [spawnOverrides] = useState<SpawnOverrides>({});
  const copy = APP_COPY[locale];
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

    setSceneObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.id);
  }

  function handleRemoveObject(id: string) {
    setSceneObjects((current) => current.filter((object) => object.id !== id));
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

  function handleColorChange(hex: string) {
    if (!selectedObject) {
      return;
    }

    const model = DEVICE_MODELS[selectedObject.modelId];
    if (selectedObject.colors[model.primaryColorKey ?? ""] === hex) {
      return;
    }
    updateSceneObject(selectedObject.id, {
      colors: model.buildColorsFromPrimary(hex),
      deviceTheme: "",
    });
  }

  function handleDebugColorChange(part: string, hex: string) {
    if (!selectedObject) {
      return;
    }

    if (selectedObject.debugPartColors[part] === hex) {
      return;
    }

    updateSceneObject(selectedObject.id, {
      debugPartColors: {
        ...selectedObject.debugPartColors,
        [part]: hex,
      },
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
    <main className="app-shell min-h-screen relative flex">
      <Leva collapsed />
      <LayersPanel
        copy={copy}
        locale={locale}
        objects={sceneObjects}
        onAddObject={handleAddObject}
        onLocaleChange={setLocale}
        onRenameObject={(id, name) => updateSceneObject(id, { name })}
        onRemoveObject={handleRemoveObject}
        onSelectObject={setSelectedObjectId}
        onUiThemeChange={setUiTheme}
        selectedObjectId={selectedObject?.id ?? ""}
        uiTheme={uiTheme}
      />

      <MockupCanvas
        canvasBgColor={canvasBgColor}
        copy={copy}
        objects={sceneObjects}
        onBgColorChange={setCanvasBgColor}
        resetCameraVersion={resetCameraVersion}
        scaleOverrides={scaleOverrides}
        spawnOverrides={spawnOverrides}
        uiTheme={uiTheme}
      />

      <InspectorPanel
        copy={copy}
        object={selectedObject}
        onColorChange={handleColorChange}
        onDebugColorChange={handleDebugColorChange}
        onImageUpload={handleImageUpload}
        onModelChange={handleModelChange}
        onResetObject={handleResetObject}
        onThemeChange={handleThemeChange}
        onToggleDebugMode={() =>
          selectedObject &&
          updateSceneObject(selectedObject.id, {
            debugMode: !selectedObject.debugMode,
          })
        }
        onToggleDeviceShell={() =>
          selectedObject &&
          updateSceneObject(selectedObject.id, {
            showDeviceShell: !selectedObject.showDeviceShell,
          })
        }
        onToggleMatteColors={() =>
          selectedObject &&
          updateSceneObject(selectedObject.id, {
            matteColors: !selectedObject.matteColors,
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
  );
}
