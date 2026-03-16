"use client";

import { ChangeEvent, useEffect, useState } from "react";
import InspectorPanel from "./components/InspectorPanel";
import LayersPanel from "./components/LayersPanel";
import MockupCanvas, { type ExportPreset } from "./components/MockupCanvas";
import { type ThemeName } from "./components/Smartphone";
import { APP_COPY, type Locale, type UiTheme } from "./lib/i18n";
import { readFileAsDataUrl } from "./lib/mockup-image";
import {
  changeSceneObjectModel,
  createSceneObject,
  resetSceneObject,
  type SceneObject,
} from "./lib/scene-objects";
import { DEVICE_MODELS } from "./models/device-models";

const EXPORT_PRESETS: ExportPreset[] = [
  { height: 1080, label: "mockup-1080p", width: 1920 },
  { height: 1440, label: "mockup-1440p", width: 2560 },
];

export default function Home() {
  const [locale, setLocale] = useState<Locale>("pt-BR");
  const [uiTheme, setUiTheme] = useState<UiTheme>("dark");
  const [uploadError, setUploadError] = useState("");
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>(() => [
    createSceneObject({ deletable: false, name: "Object 1" }),
  ]);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [exportHandler, setExportHandler] =
    useState<((preset: ExportPreset) => Promise<void>) | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [resetCameraVersion, setResetCameraVersion] = useState(0);
  const copy = APP_COPY[locale];
  const selectedObject =
    sceneObjects.find((object) => object.id === selectedObjectId) ??
    sceneObjects[0] ??
    null;

  useEffect(() => {
    const storedLocale = window.localStorage.getItem("mock-photo-locale");
    const storedUiTheme = window.localStorage.getItem("mock-photo-ui-theme");

    if (storedLocale === "pt-BR" || storedLocale === "en-US") {
      setLocale(storedLocale);
    }

    if (storedUiTheme === "dark" || storedUiTheme === "light") {
      setUiTheme(storedUiTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("mock-photo-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
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

  function handleResetCamera() {
    setResetCameraVersion((current) => current + 1);
  }

  async function exportImage(preset: ExportPreset) {
    if (!exportHandler || isExporting) {
      return;
    }

    try {
      setIsExporting(true);
      await exportHandler(preset);
    } catch (error) {
      console.error(error);
      setUploadError(copy.exportImageError);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="app-shell min-h-screen relative flex">
      <LayersPanel
        copy={copy}
        locale={locale}
        objects={sceneObjects}
        onAddObject={handleAddObject}
        onLocaleChange={setLocale}
        onRemoveObject={handleRemoveObject}
        onSelectObject={setSelectedObjectId}
        onUiThemeChange={setUiTheme}
        selectedObjectId={selectedObject?.id ?? ""}
        uiTheme={uiTheme}
      />

      <MockupCanvas
        objects={sceneObjects}
        onExportReady={(handler) => setExportHandler(() => handler)}
        resetCameraVersion={resetCameraVersion}
        uiTheme={uiTheme}
      />

      <InspectorPanel
        copy={copy}
        exportPresets={EXPORT_PRESETS}
        isExporting={isExporting}
        object={selectedObject}
        onColorChange={handleColorChange}
        onDebugColorChange={handleDebugColorChange}
        onExport={exportImage}
        onImageUpload={handleImageUpload}
        onModelChange={handleModelChange}
        onResetCamera={handleResetCamera}
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
        onUpdateName={(name) =>
          selectedObject && updateSceneObject(selectedObject.id, { name })
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
