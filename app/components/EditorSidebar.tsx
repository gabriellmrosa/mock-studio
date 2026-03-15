"use client";

import Control from "./Control";
import ColorRow from "./ColorRow";
import type { ExportPreset } from "./MockupCanvas";
import type { PhoneColors, ThemeName } from "./Smartphone";
import {
  DEVICE_MODEL_LIST,
  type DeviceModelDefinition,
  type DeviceModelId,
} from "../models/device-models";

type EditorSidebarProps = {
  activeTheme: ThemeName;
  colors: PhoneColors;
  debugMode: boolean;
  debugPartColors: Record<string, string>;
  exportPresets: ExportPreset[];
  isExporting: boolean;
  model: DeviceModelDefinition;
  onColorChange: (part: keyof PhoneColors, hex: string) => void;
  onDebugColorChange: (part: string, hex: string) => void;
  onExport: (preset: ExportPreset) => Promise<void>;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelChange: (modelId: DeviceModelId) => void;
  onReset: () => void;
  onThemeChange: (themeId: ThemeName) => void;
  onToggleDeviceShell: () => void;
  onToggleDebugMode: () => void;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  selectedModelId: DeviceModelId;
  setRotationX: (value: number) => void;
  setRotationY: (value: number) => void;
  setRotationZ: (value: number) => void;
  showDeviceShell: boolean;
  uploadError: string;
};

export default function EditorSidebar({
  activeTheme,
  colors,
  debugMode,
  debugPartColors,
  exportPresets,
  isExporting,
  model,
  onColorChange,
  onDebugColorChange,
  onExport,
  onImageUpload,
  onModelChange,
  onReset,
  onThemeChange,
  onToggleDeviceShell,
  onToggleDebugMode,
  rotationX,
  rotationY,
  rotationZ,
  selectedModelId,
  setRotationX,
  setRotationY,
  setRotationZ,
  showDeviceShell,
  uploadError,
}: EditorSidebarProps) {
  return (
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
            Dispositivo
          </p>
          <div className="grid grid-cols-1 gap-2">
            {DEVICE_MODEL_LIST.map((device) => (
              <button
                key={device.id}
                onClick={() => onModelChange(device.id)}
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${selectedModelId === device.id ? "border-white bg-white text-black" : "border-neutral-700 bg-neutral-900 text-white hover:border-neutral-500"}`}
              >
                <div>
                  <p className="text-sm font-medium">{device.name}</p>
                  <p
                    className={`text-[10px] uppercase tracking-[0.18em] ${selectedModelId === device.id ? "text-black/60" : "text-neutral-500"}`}
                  >
                    Ativo
                  </p>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${selectedModelId === device.id ? "bg-black" : "bg-neutral-600"}`}
                />
              </button>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
            A base agora suporta catalogo de dispositivos, mesmo com apenas um
            modelo ativo por enquanto.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
              Cena
            </p>
            <button
              onClick={onToggleDeviceShell}
              className={`rounded-lg border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] transition ${showDeviceShell ? "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500" : "border-white bg-white text-black"}`}
            >
              {showDeviceShell ? "Casca ligada" : "So tela"}
            </button>
          </div>
          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Desligue a casca para trabalhar apenas com a textura da tela, sem
            moldura de dispositivo ao redor.
          </p>
        </section>

        <section>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3">
            Tela do App
          </p>
          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 bg-neutral-900 hover:bg-neutral-800 cursor-pointer transition text-sm text-neutral-300">
            Upload imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageUpload}
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
                {model.themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
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
                onChange={(hex) => onColorChange("body", hex)}
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
                  onChange={(hex) => onDebugColorChange(part, hex)}
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
              onClick={onReset}
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
            {exportPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => void onExport(preset)}
                disabled={isExporting}
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
            onClick={onToggleDebugMode}
            className={`w-full py-2 rounded-lg text-xs font-medium transition border ${debugMode ? "bg-yellow-500/15 border-yellow-500 text-yellow-300" : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500"}`}
          >
            {debugMode ? "Debug interativo: ON" : "Debug interativo: OFF"}
          </button>
        </section>
      </div>
    </aside>
  );
}
