"use client";

import { ChangeEvent, useState } from "react";
import Control from "./components/Control";
import MockupCanvas, { type ExportPreset } from "./components/MockupCanvas";
import {
  DEFAULT_THEME,
  THEMES,
  type PhoneColors,
  type ThemeName,
} from "./components/Smartphone";
import { readFileAsDataUrl } from "./lib/mockup-image";

const THEME_OPTIONS: { id: ThemeName; label: string; preview: string }[] = [
  { id: "gray", label: "Cinza", preview: "#8A8A8E" },
  { id: "black", label: "Preto", preview: "#1C1C1E" },
  { id: "white", label: "Branco", preview: "#F5F5F7" },
];

const EXPORT_PRESETS: ExportPreset[] = [
  { height: 1080, label: "mockup-1080p", width: 1920 },
  { height: 1440, label: "mockup-1440p", width: 2560 },
];

const INITIAL_DEBUG_COLORS: Record<string, string> = {
  smartphoneBody: "#cc00ff",
  estruturaFrontal: "#ff00cc",
  gradientSound: "#000000",
  botaoPowerDireito: "#ff6600",
  botaoVolumeCima: "#ffcc00",
  botaoVolumeBaixo: "#ffff00",
  rightBigSideButton: "#ff4400",
  CircleTopLeft: "#000000",
  CircleTopLeftMiddle: "#ccff99",
  leftSmallSideButton: "#66ff66",
  notchBolinha1: "#00ff00",
  notchBolinha2: "#00ffff",
  notchBolinha3: "#0099ff",
  CircleTopRightMiddle: "#ff0066",
  notchPill: "#33ccff",
  moduloCameraAro: "#99ff00",
  CircleTopRight: "#ff99cc",
  lente1: "#0000ff",
  lente2: "#ffff99",
  lente3: "#00ff99",
  behindOrHideElement1: "#ff0000",
  behindOrHideElement2: "#ff3300",
  behindOrHideElement3: "#ff5500",
  behindOrHideElement4: "#ff7700",
  behindOrHideElement5: "#ff9900",
  behindOrHideElement6: "#ffbb00",
  behindOrHideElement7: "#ffdd00",
};

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const [inputVal, setInputVal] = useState(value);

  const handleHexInput = (e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setInputVal(nextValue);

    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(nextValue)) {
      onChange(nextValue);
    }
  };

  const handleColorPicker = (e: ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    onChange(e.target.value);
  };

  if (inputVal !== value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
    setInputVal(value);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-400 text-[10px] flex-1 truncate">
        {label}
      </span>
      <label className="relative w-6 h-6 rounded overflow-hidden border border-neutral-600 cursor-pointer shrink-0 hover:border-neutral-400 transition">
        <input
          type="color"
          value={value}
          onChange={handleColorPicker}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </label>
      <input
        type="text"
        value={inputVal}
        onChange={handleHexInput}
        maxLength={7}
        placeholder="#000000"
        className="w-20 bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-[10px] text-neutral-200 font-mono focus:outline-none focus:border-neutral-500 transition"
      />
    </div>
  );
}

export default function Home() {
  const [uploadedImage, setUploadedImage] =
    useState<string>("/placeholder.png");
  const [uploadError, setUploadError] = useState<string>("");
  const [activeTheme, setActiveTheme] = useState<ThemeName>(DEFAULT_THEME);
  const [colors, setColors] = useState<PhoneColors>(THEMES[DEFAULT_THEME]);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(180);
  const [rotationZ, setRotationZ] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [debugPartColors, setDebugPartColors] =
    useState<Record<string, string>>(INITIAL_DEBUG_COLORS);
  const [exportHandler, setExportHandler] =
    useState<((preset: ExportPreset) => Promise<void>) | null>(null);
  const [resetCameraHandler, setResetCameraHandler] =
    useState<(() => void) | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
    setColors(THEMES[themeId]);
  }

  function updateColor(part: keyof PhoneColors, hex: string) {
    setActiveTheme("" as ThemeName);
    setColors((prev) => ({ ...prev, [part]: hex }));
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
        onExportReady={(handler) => setExportHandler(() => handler)}
        onResetCameraReady={(handler) => setResetCameraHandler(() => handler)}
        transform={{
          position: [0, 0, 0],
          rotation: [
            (rotationX * Math.PI) / 180,
            (rotationY * Math.PI) / 180,
            (rotationZ * Math.PI) / 180,
          ],
        }}
      />

      <aside className="w-[320px] h-screen bg-neutral-950/95 border-l border-white/10 flex flex-col overflow-y-auto shrink-0">
        <div className="px-5 py-4 border-b border-white/10">
          <h1 className="text-sm font-semibold text-white tracking-[0.22em] uppercase">
            Mockup Studio
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            MVP de 1 objeto com export transparente
          </p>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          <section>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
              Tela do App
            </p>
            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-900 hover:bg-neutral-800 cursor-pointer transition text-sm text-neutral-300">
              Upload imagem
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
              Proporcao recomendada: 9:19.3.
              <br />
              Export final sempre em PNG com fundo transparente.
            </p>
            {uploadError ? (
              <p className="text-[11px] text-red-400 mt-2">{uploadError}</p>
            ) : null}
          </section>

          {!debugMode ? (
            <>
              <section>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
                  Temas
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => applyTheme(theme.id)}
                      title={theme.label}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition ${activeTheme === theme.id ? "border-white bg-white text-black" : "border-neutral-700 hover:border-neutral-500 bg-transparent text-white"}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: theme.preview }}
                      />
                      <span className="text-[10px] leading-tight text-center">
                        {theme.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
                  Cor do Body
                </p>
                <ColorRow
                  label="Body"
                  value={colors.body}
                  onChange={(hex) => updateColor("body", hex)}
                />
              </section>
            </>
          ) : (
            <section>
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
                Debug
              </p>
              <div className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
                {Object.entries(debugPartColors).map(([part, color]) => (
                  <ColorRow
                    key={part}
                    label={part}
                    value={color}
                    onChange={(hex) =>
                      setDebugPartColors((prev) => ({ ...prev, [part]: hex }))
                    }
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                Transform
              </p>
              <button
                onClick={resetMockup}
                className="text-[11px] text-neutral-400 hover:text-white transition"
              >
                Reset camera + objeto
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-3 space-y-4">
              <Control
                label="Rotacao X"
                value={rotationX}
                setValue={setRotationX}
                min={-45}
                max={45}
                step={1}
              />
              <Control
                label="Rotacao Y"
                value={rotationY}
                setValue={setRotationY}
                min={135}
                max={225}
                step={1}
              />
              <Control
                label="Rotacao Z"
                value={rotationZ}
                setValue={setRotationZ}
                min={-25}
                max={25}
                step={1}
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
              O objeto continua centralizado; por enquanto so liberamos rotacao.
            </p>
          </section>

          <section>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
              Export PNG
            </p>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => exportImage(preset)}
                  disabled={!exportHandler || isExporting}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-3 text-sm text-white hover:border-neutral-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {preset.width}x{preset.height}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
              O arquivo sai sem fundo e com supersampling pelo resize do render.
            </p>
          </section>

          <section>
            <button
              onClick={() => setDebugMode((current) => !current)}
              className={`w-full py-2 rounded-lg text-xs font-medium transition border ${debugMode ? "bg-yellow-500/15 border-yellow-500 text-yellow-300" : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500"}`}
            >
              {debugMode ? "Debug interativo: ON" : "Debug interativo: OFF"}
            </button>
          </section>
        </div>
      </aside>
    </main>
  );
}
