"use client";

import Control from "./Control";
import ColorRow from "./ColorRow";
import type { ExportPreset } from "./MockupCanvas";
import type { PhoneColors, ThemeName } from "./Smartphone";
import type { Locale, UiTheme } from "../lib/i18n";
import {
  DEVICE_MODEL_LIST,
  type DeviceModelDefinition,
  type DeviceModelId,
} from "../models/device-models";
import ToggleSwitch from "./toggleSwitch";

type EditorSidebarProps = {
  copy: {
    activeDevice: string;
    appSubtitle: string;
    appTitle: string;
    bodyColorLabel: string;
    bodyColorSectionTitle: string;
    darkMode: string;
    debugOff: string;
    debugOn: string;
    debugSectionTitle: string;
    deviceSectionHint: string;
    deviceSectionTitle: string;
    english: string;
    exportSectionHint: string;
    exportSectionTitle: string;
    languageLabel: string;
    lightMode: string;
    portuguese: string;
    resetButton: string;
    rotationX: string;
    rotationY: string;
    rotationZ: string;
    sceneSectionHint: string;
    sceneSectionTitle: string;
    screenOnly: string;
    screenSectionHintLine1: string;
    screenSectionHintLine2: string;
    screenSectionTitle: string;
    shellOn: string;
    themeLabel: string;
    themeNames: Record<ThemeName, string>;
    themesSectionTitle: string;
    transformSectionHint: string;
    transformSectionTitle: string;
    uploadImage: string;
  };
  colors: PhoneColors;
  debugMode: boolean;
  debugPartColors: Record<string, string>;
  deviceTheme: ThemeName;
  exportPresets: ExportPreset[];
  isExporting: boolean;
  locale: Locale;
  model: DeviceModelDefinition;
  onColorChange: (part: keyof PhoneColors, hex: string) => void;
  onDebugColorChange: (part: string, hex: string) => void;
  onExport: (preset: ExportPreset) => Promise<void>;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLocaleChange: (locale: Locale) => void;
  onModelChange: (modelId: DeviceModelId) => void;
  onReset: () => void;
  onThemeChange: (themeId: ThemeName) => void;
  onToggleDeviceShell: () => void;
  onToggleDebugMode: () => void;
  onUiThemeChange: (theme: UiTheme) => void;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  selectedModelId: DeviceModelId;
  setRotationX: (value: number) => void;
  setRotationY: (value: number) => void;
  setRotationZ: (value: number) => void;
  showDeviceShell: boolean;
  uiTheme: UiTheme;
  uploadError: string;
};

export default function EditorSidebar({
  copy,
  colors,
  debugMode,
  debugPartColors,
  deviceTheme,
  exportPresets,
  isExporting,
  locale,
  model,
  onColorChange,
  onDebugColorChange,
  onExport,
  onImageUpload,
  onLocaleChange,
  onModelChange,
  onReset,
  onThemeChange,
  onToggleDeviceShell,
  onToggleDebugMode,
  onUiThemeChange,
  rotationX,
  rotationY,
  rotationZ,
  selectedModelId,
  setRotationX,
  setRotationY,
  setRotationZ,
  showDeviceShell,
  uiTheme,
  uploadError,
}: EditorSidebarProps) {
  return (
    <aside className="editor-sidebar w-[320px] h-screen flex flex-col overflow-y-auto shrink-0">
      <div className="px-5 py-4 border-b border-[var(--sidebar-border)]">
        <h1 className="text-sm font-semibold tracking-[0.22em] uppercase">
          {copy.appTitle}
        </h1>
        <p className="editor-sidebar-muted text-xs mt-1">
          {copy.appSubtitle}
        </p>
      </div>

      <div className="flex flex-col gap-6 px-5 py-5">
        <section className="grid grid-cols-2 gap-3">
          <div>
            <p className="editor-sidebar-label mb-3">{copy.themeLabel}</p>
            <ToggleSwitch
              ariaLabel={copy.themeLabel}
              value={uiTheme}
              onChange={onUiThemeChange}
              options={[
                {
                  value: "dark",
                  label: copy.darkMode,
                  iconAlt: copy.darkMode,
                  iconSrc: "/icons/moon-and-stars.png",
                },
                {
                  value: "light",
                  label: copy.lightMode,
                  iconAlt: copy.lightMode,
                  iconSrc: "/icons/sun.png",
                },
              ]}
            />
          </div>

          <div>
            <p className="editor-sidebar-label mb-3">{copy.languageLabel}</p>
            <ToggleSwitch
              ariaLabel={copy.languageLabel}
              value={locale}
              onChange={onLocaleChange}
              options={[
                { value: "pt-BR", label: copy.portuguese },
                { value: "en-US", label: copy.english },
              ]}
            />
          </div>
        </section>

        <section>
          <p className="editor-sidebar-label mb-3">
            {copy.deviceSectionTitle}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {DEVICE_MODEL_LIST.map((device) => (
              <button
                key={device.id}
                onClick={() => onModelChange(device.id)}
                className={`device-card ${selectedModelId === device.id ? "device-card-active" : "device-card-inactive"}`}
              >
                <div>
                  <p className="text-sm font-medium">{device.name}</p>
                  <p
                    className={`text-[10px] uppercase tracking-[0.18em] ${selectedModelId === device.id ? "text-black/60" : "editor-sidebar-muted"}`}
                  >
                    {copy.activeDevice}
                  </p>
                </div>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${selectedModelId === device.id ? "bg-black" : "bg-[var(--sidebar-dot)]"}`}
                />
              </button>
            ))}
          </div>
          <p className="editor-sidebar-muted text-[10px] mt-2 leading-relaxed">
            {copy.deviceSectionHint}
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="editor-sidebar-label">
              {copy.sceneSectionTitle}
            </p>
            <button
              onClick={onToggleDeviceShell}
              className={`editor-toggle ${showDeviceShell ? "editor-toggle-inactive" : "editor-toggle-active"}`}
            >
              {showDeviceShell ? copy.shellOn : copy.screenOnly}
            </button>
          </div>
          <p className="editor-sidebar-muted text-[10px] leading-relaxed">
            {copy.sceneSectionHint}
          </p>
        </section>

        <section>
          <p className="editor-sidebar-label mb-3">
            {copy.screenSectionTitle}
          </p>
          <label className="upload-card">
            {copy.uploadImage}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageUpload}
              className="hidden"
            />
          </label>
          <p className="editor-sidebar-muted text-[10px] mt-2 leading-relaxed">
            {copy.screenSectionHintLine1}
            <br />
            {copy.screenSectionHintLine2}
          </p>
          {uploadError ? (
            <p className="text-[11px] text-red-400 mt-2">{uploadError}</p>
          ) : null}
        </section>

        {!debugMode ? (
          <>
            <section>
              <p className="editor-sidebar-label mb-3">
                {copy.themesSectionTitle}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {model.themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    title={copy.themeNames[theme.id]}
                    className={`theme-card ${deviceTheme === theme.id ? "theme-card-active" : "theme-card-inactive"}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: theme.preview }}
                    />
                    <span className="text-[10px] leading-tight text-center">
                      {copy.themeNames[theme.id]}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="editor-sidebar-label mb-3">
                {copy.bodyColorSectionTitle}
              </p>
              <ColorRow
                label={copy.bodyColorLabel}
                uiTheme={uiTheme}
                value={colors.body}
                onChange={(hex) => onColorChange("body", hex)}
              />
            </section>
          </>
        ) : (
          <section>
            <p className="editor-sidebar-label mb-3">
              {copy.debugSectionTitle}
            </p>
            <div className="panel-card flex flex-col gap-2 p-3">
              {Object.entries(debugPartColors).map(([part, color]) => (
                <ColorRow
                  key={part}
                  label={part}
                  uiTheme={uiTheme}
                  value={color}
                  onChange={(hex) => onDebugColorChange(part, hex)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="editor-sidebar-label">
              {copy.transformSectionTitle}
            </p>
            <button
              onClick={onReset}
              className="editor-link-button"
            >
              {copy.resetButton}
            </button>
          </div>

          <div className="panel-card space-y-4 p-3">
            <Control
              label={copy.rotationX}
              uiTheme={uiTheme}
              value={rotationX}
              setValue={setRotationX}
              min={-45}
              max={45}
              step={1}
            />
            <Control
              label={copy.rotationY}
              uiTheme={uiTheme}
              value={rotationY}
              setValue={setRotationY}
              min={135}
              max={225}
              step={1}
            />
            <Control
              label={copy.rotationZ}
              uiTheme={uiTheme}
              value={rotationZ}
              setValue={setRotationZ}
              min={-25}
              max={25}
              step={1}
            />
          </div>
          <p className="editor-sidebar-muted text-[10px] mt-2 leading-relaxed">
            {copy.transformSectionHint}
          </p>
        </section>

        <section>
          <p className="editor-sidebar-label mb-3">
            {copy.exportSectionTitle}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {exportPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => void onExport(preset)}
                disabled={isExporting}
                className="editor-button px-3 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {preset.width}x{preset.height}
              </button>
            ))}
          </div>
          <p className="editor-sidebar-muted text-[10px] mt-2 leading-relaxed">
            {copy.exportSectionHint}
          </p>
        </section>

        <section>
          <button
            onClick={onToggleDebugMode}
            className={`w-full py-2 rounded-lg text-xs font-medium transition border ${debugMode ? "bg-yellow-500/15 border-yellow-500 text-yellow-300" : "editor-button editor-button-muted"}`}
          >
            {debugMode ? copy.debugOn : copy.debugOff}
          </button>
        </section>
      </div>
    </aside>
  );
}
