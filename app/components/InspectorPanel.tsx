"use client";

import ColorRow from "./ColorRow";
import Control from "./Control";
import type { ExportPreset } from "./MockupCanvas";
import type { ThemeName } from "./Smartphone";
import type { AppCopy, UiTheme } from "../lib/i18n";
import type { SceneObject } from "../lib/scene-objects";
import { DEVICE_MODEL_LIST } from "../models/device-models";
import {
  DownloadIcon,
  RotateCcwIcon,
  UploadIcon,
} from "./Icons";

type InspectorPanelProps = {
  copy: AppCopy;
  exportPresets: ExportPreset[];
  isExporting: boolean;
  object: SceneObject | null;
  onColorChange: (hex: string) => void;
  onDebugColorChange: (part: string, hex: string) => void;
  onExport: (preset: ExportPreset) => Promise<void>;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelChange: (modelId: SceneObject["modelId"]) => void;
  onResetCamera: () => void;
  onResetObject: () => void;
  onThemeChange: (themeId: ThemeName) => void;
  onToggleDebugMode: () => void;
  onToggleDeviceShell: () => void;
  onUpdateName: (name: string) => void;
  onUpdateRotation: (
    patch: Pick<SceneObject, "rotationX" | "rotationY" | "rotationZ">,
  ) => void;
  onUpdatePosition: (
    patch: Pick<SceneObject, "positionX" | "positionY">,
  ) => void;
  uiTheme: UiTheme;
  uploadError: string;
};

export default function InspectorPanel({
  copy,
  exportPresets,
  isExporting,
  object,
  onColorChange,
  onDebugColorChange,
  onExport,
  onImageUpload,
  onModelChange,
  onResetCamera,
  onResetObject,
  onThemeChange,
  onToggleDebugMode,
  onToggleDeviceShell,
  onUpdateName,
  onUpdatePosition,
  onUpdateRotation,
  uiTheme,
  uploadError,
}: InspectorPanelProps) {
  if (!object) {
    return (
      <aside className="editor-sidebar w-[320px] h-screen flex flex-col shrink-0" />
    );
  }

  const model = DEVICE_MODEL_LIST.find((item) => item.id === object.modelId);

  return (
    <aside className="editor-sidebar w-[320px] h-screen flex flex-col overflow-y-auto shrink-0">
      <div className="px-5 py-4 border-b border-[var(--sidebar-border)]">
        <h2 className="text-sm font-semibold tracking-[0.22em] uppercase">
          {copy.objectSectionTitle}
        </h2>
        <p className="editor-sidebar-muted text-xs mt-1">{object.name}</p>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        <section>
          <p className="editor-sidebar-label mb-3">{copy.objectNameLabel}</p>
          <input
            className="editor-input w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={object.name}
            onChange={(event) => onUpdateName(event.target.value)}
          />
        </section>

        <section>
          <p className="editor-sidebar-label mb-3">{copy.modelLabel}</p>
          <select
            className="editor-input w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={object.modelId}
            onChange={(event) =>
              onModelChange(event.target.value as SceneObject["modelId"])
            }
          >
            {DEVICE_MODEL_LIST.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
          {model ? (
            <p className="editor-sidebar-muted text-[10px] mt-2">
              {model.name}
            </p>
          ) : null}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="editor-sidebar-label">{copy.sceneSectionTitle}</p>
            <button
              onClick={onToggleDeviceShell}
              className={`editor-toggle ${object.showDeviceShell ? "editor-toggle-inactive" : "editor-toggle-active"}`}
            >
              {object.showDeviceShell ? copy.shellOn : copy.screenOnly}
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
            <UploadIcon className="h-4 w-4" />
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

        {!object.debugMode ? (
          <>
            <section>
              <p className="editor-sidebar-label mb-3">
                {copy.themesSectionTitle}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {model?.themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    title={copy.themeNames[theme.id]}
                    className={`theme-card ${object.deviceTheme === theme.id ? "theme-card-active" : "theme-card-inactive"}`}
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
                value={object.colors.body}
                onChange={onColorChange}
              />
            </section>
          </>
        ) : (
          <section>
            <p className="editor-sidebar-label mb-3">{copy.debugSectionTitle}</p>
            <div className="panel-card flex flex-col gap-2 p-3">
              {Object.entries(object.debugPartColors).map(([part, color]) => (
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
            <p className="editor-sidebar-label">{copy.transformSectionTitle}</p>
            <button
              onClick={onResetObject}
              className="editor-icon-button"
              aria-label={copy.resetObjectButton}
              title={copy.resetObjectButton}
            >
              <RotateCcwIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="panel-card space-y-3 p-3">
            <Control
              label={copy.positionX}
              uiTheme={uiTheme}
              value={object.positionX}
              setValue={(value) =>
                onUpdatePosition({
                  positionX: value,
                  positionY: object.positionY,
                })
              }
              min={-2}
              max={2}
              step={0.01}
            />
            <Control
              label={copy.positionY}
              uiTheme={uiTheme}
              value={object.positionY}
              setValue={(value) =>
                onUpdatePosition({
                  positionX: object.positionX,
                  positionY: value,
                })
              }
              min={-2}
              max={2}
              step={0.01}
            />
            <Control
              label={copy.rotationX}
              uiTheme={uiTheme}
              value={object.rotationX}
              setValue={(value) =>
                onUpdateRotation({
                  rotationX: value,
                  rotationY: object.rotationY,
                  rotationZ: object.rotationZ,
                })
              }
              min={-45}
              max={45}
            />
            <Control
              label={copy.rotationY}
              uiTheme={uiTheme}
              value={object.rotationY}
              setValue={(value) =>
                onUpdateRotation({
                  rotationX: object.rotationX,
                  rotationY: value,
                  rotationZ: object.rotationZ,
                })
              }
              min={135}
              max={225}
            />
            <Control
              label={copy.rotationZ}
              uiTheme={uiTheme}
              value={object.rotationZ}
              setValue={(value) =>
                onUpdateRotation({
                  rotationX: object.rotationX,
                  rotationY: object.rotationY,
                  rotationZ: value,
                })
              }
              min={-25}
              max={25}
            />
          </div>
          <p className="editor-sidebar-muted text-[10px] mt-2 leading-relaxed">
            {copy.transformSectionHint}
          </p>
        </section>

        <section>
          <button
            onClick={onToggleDebugMode}
            className={`w-full py-2 rounded-lg text-xs font-medium transition border ${object.debugMode ? "bg-yellow-500/15 border-yellow-500 text-yellow-300" : "editor-button editor-button-muted"}`}
          >
            {object.debugMode ? copy.debugOn : copy.debugOff}
          </button>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="editor-sidebar-label">{copy.exportSectionTitle}</p>
            <button
              onClick={onResetCamera}
              className="editor-icon-button"
              aria-label={copy.resetCameraButton}
              title={copy.resetCameraButton}
            >
              <RotateCcwIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {exportPresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => void onExport(preset)}
                disabled={isExporting}
                className="editor-button inline-flex items-center justify-center gap-2 px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                {preset.width}x{preset.height}
              </button>
            ))}
          </div>
          <p className="editor-sidebar-muted text-[10px] mt-2 leading-relaxed">
            {copy.exportSectionHint}
          </p>
        </section>
      </div>
    </aside>
  );
}
