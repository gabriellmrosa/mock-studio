"use client";

import { ChangeEvent, useEffect, useState } from "react";
import EditorSidebar from "./components/EditorSidebar";
import MockupCanvas, { type ExportPreset } from "./components/MockupCanvas";
import { type PhoneColors, type ThemeName } from "./components/Smartphone";
import { readFileAsDataUrl } from "./lib/mockup-image";
import {
  DEFAULT_DEVICE_MODEL,
  DEVICE_MODELS,
  type DeviceModelId,
} from "./models/device-models";

const EXPORT_PRESETS: ExportPreset[] = [
  { height: 1080, label: "mockup-1080p", width: 1920 },
  { height: 1440, label: "mockup-1440p", width: 2560 },
];

export default function Home() {
  const [selectedModelId, setSelectedModelId] =
    useState<DeviceModelId>(DEFAULT_DEVICE_MODEL.id);
  const model = DEVICE_MODELS[selectedModelId];
  const [uploadedImage, setUploadedImage] =
    useState<string>("/placeholder.png");
  const [uploadError, setUploadError] = useState<string>("");
  const [activeTheme, setActiveTheme] = useState<ThemeName>(model.defaultTheme);
  const [colors, setColors] = useState<PhoneColors>(
    model.themes[model.defaultTheme],
  );
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(180);
  const [rotationZ, setRotationZ] = useState(0);
  const [showDeviceShell, setShowDeviceShell] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [debugPartColors, setDebugPartColors] =
    useState<Record<string, string>>(model.initialDebugColors);
  const [exportHandler, setExportHandler] =
    useState<((preset: ExportPreset) => Promise<void>) | null>(null);
  const [resetCameraHandler, setResetCameraHandler] =
    useState<(() => void) | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setActiveTheme(model.defaultTheme);
    setColors(model.themes[model.defaultTheme]);
    setDebugPartColors(model.initialDebugColors);
  }, [model]);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const nextImage = await readFileAsDataUrl(file);
      setUploadedImage(nextImage);
      setUploadError("");
    } catch (error) {
      console.error(error);
      setUploadError("Nao foi possivel preparar essa imagem.");
    } finally {
      event.target.value = "";
    }
  }

  function applyTheme(themeId: ThemeName) {
    setActiveTheme(themeId);
    setColors(model.themes[themeId]);
  }

  function updateColor(part: keyof PhoneColors, hex: string) {
    setActiveTheme("" as ThemeName);
    setColors((prev) => ({ ...prev, [part]: hex }));
  }

  function updateDebugColor(part: string, hex: string) {
    setDebugPartColors((prev) => ({ ...prev, [part]: hex }));
  }

  function resetMockup() {
    setRotationX(0);
    setRotationY(180);
    setRotationZ(0);
    resetCameraHandler?.();
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
      setUploadError("Nao foi possivel exportar o PNG.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white relative flex">
      <MockupCanvas
        colors={colors}
        debugMode={debugMode}
        debugPartColors={debugPartColors}
        imageUrl={uploadedImage}
        model={model}
        onExportReady={(handler) => setExportHandler(() => handler)}
        onResetCameraReady={(handler) => setResetCameraHandler(() => handler)}
        showDeviceShell={showDeviceShell}
        transform={{
          position: [0, 0, 0],
          rotation: [
            (rotationX * Math.PI) / 180,
            (rotationY * Math.PI) / 180,
            (rotationZ * Math.PI) / 180,
          ],
        }}
      />

      <EditorSidebar
        activeTheme={activeTheme}
        colors={colors}
        debugMode={debugMode}
        debugPartColors={debugPartColors}
        exportPresets={EXPORT_PRESETS}
        isExporting={isExporting}
        model={model}
        onColorChange={updateColor}
        onDebugColorChange={updateDebugColor}
        onExport={exportImage}
        onImageUpload={handleImageUpload}
        onModelChange={setSelectedModelId}
        onReset={resetMockup}
        onThemeChange={applyTheme}
        onToggleDeviceShell={() => setShowDeviceShell((current) => !current)}
        onToggleDebugMode={() => setDebugMode((current) => !current)}
        rotationX={rotationX}
        rotationY={rotationY}
        rotationZ={rotationZ}
        selectedModelId={selectedModelId}
        setRotationX={setRotationX}
        setRotationY={setRotationY}
        setRotationZ={setRotationZ}
        showDeviceShell={showDeviceShell}
        uploadError={uploadError}
      />
    </main>
  );
}
