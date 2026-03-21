"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import InspectorPanel from "./components/InspectorPanel/InspectorPanel";
import LayersPanel from "./components/LayersPanel/LayersPanel";
import MockupCanvas, { type ExportPreset } from "./components/MockupCanvas/MockupCanvas";
import { type ThemeName } from "./components/Smartphone";
import { APP_COPY, type Locale, type UiTheme } from "./lib/i18n";
import { readFileAsDataUrl } from "./lib/mockup-image";
import {
  changeSceneObjectModel,
  createSceneObject,
  getPlaceholderImageUrl,
  isPlaceholderImageUrl,
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
  const [cameraInverted, setCameraInverted] = useState(true);
  const isInitialized = useRef(false);
  const [uploadError, setUploadError] = useState("");
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>(() => [
    createSceneObject({
      deletable: false,
      id: "base-object",
      locale: "pt-BR",
      name: "Object 1",
    }),
  ]);
  const [canvasBgColor, setCanvasBgColor] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [, setExportHandler] =
    useState<((preset: ExportPreset) => Promise<void>) | null>(null);
  const [resetCameraVersion] = useState(0);
  const copy = APP_COPY[locale];
  const selectedObject =
    sceneObjects.find((object) => object.id === selectedObjectId) ??
    sceneObjects[0] ??
    null;

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("mock-photo-locale");
    const storedUiTheme = window.localStorage.getItem("mock-photo-ui-theme");
    const storedCameraInverted = window.localStorage.getItem("mock-photo-camera-inverted");

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

    if (storedCameraInverted !== null) {
      setCameraInverted(storedCameraInverted === "true");
    }

    isInitialized.current = true;
  }, []);

  useEffect(() => {
    const localizedPlaceholder = getPlaceholderImageUrl(locale);

    setSceneObjects((current) =>
      current.map((object) =>
        isPlaceholderImageUrl(object.imageUrl)
          ? { ...object, imageUrl: localizedPlaceholder }
          : object,
      ),
    );
  }, [locale]);

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
    if (!isInitialized.current) return;
    window.localStorage.setItem("mock-photo-camera-inverted", String(cameraInverted));
  }, [cameraInverted]);

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
      locale,
      name: `Object ${sceneObjects.length + 1}`,
    });

    setSceneObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.id);
  }

  function handleRemoveObject(id: string) {
    setSceneObjects((current) => current.filter((object) => object.id !== id));
  }

  function handleThemeChange(themeId: ThemeName) {
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

    updateSceneObject(selectedObject.id, {
      colors: { ...selectedObject.colors, body: hex },
      deviceTheme: "" as ThemeName,
    });
  }

  function handleDebugColorChange(part: string, hex: string) {
    if (!selectedObject) {
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
          ? changeSceneObjectModel(object, locale, modelId)
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
      <LayersPanel
        cameraInverted={cameraInverted}
        copy={copy}
        locale={locale}
        objects={sceneObjects}
        onAddObject={handleAddObject}
        onCameraInvertedChange={setCameraInverted}
        onLocaleChange={setLocale}
        onRenameObject={(id, name) => updateSceneObject(id, { name })}
        onRemoveObject={handleRemoveObject}
        onSelectObject={setSelectedObjectId}
        onUiThemeChange={setUiTheme}
        selectedObjectId={selectedObject?.id ?? ""}
        uiTheme={uiTheme}
      />

      <MockupCanvas
        cameraInverted={cameraInverted}
        canvasBgColor={canvasBgColor}
        objects={sceneObjects}
        onBgColorChange={setCanvasBgColor}
        onExportReady={(handler) => setExportHandler(() => handler)}
        resetCameraVersion={resetCameraVersion}
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
        onUpdatePosition={(positionPatch) =>
          selectedObject && updateSceneObject(selectedObject.id, positionPatch)
        }
        onUpdateRotation={(rotationPatch) =>
          selectedObject && updateSceneObject(selectedObject.id, rotationPatch)
        }
        uiTheme={uiTheme}
        uploadError={uploadError}
      />
    </main>
  );
}
