"use client";

import "./InspectorPanel.css";
import ColorRow from "../ColorRow/ColorRow";
import Control from "../Control/Control";
import type { ThemeName } from "../Smartphone";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import { DEVICE_MODEL_LIST } from "../../models/device-models";
import { PanelHeader, PanelSection } from "../EditorPrimitives/EditorPrimitives";
import { ChevronDown, RotateCcw, Upload } from "lucide-react";

type InspectorPanelProps = {
  copy: AppCopy;
  object: SceneObject | null;
  onColorChange: (hex: string) => void;
  onDebugColorChange: (part: string, hex: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelChange: (modelId: SceneObject["modelId"]) => void;
  onResetObject: () => void;
  onThemeChange: (themeId: ThemeName) => void;
  onToggleDebugMode: () => void;
  onToggleDeviceShell: () => void;
  onUpdateRotation: (
    patch: Pick<SceneObject, "rotationX" | "rotationY" | "rotationZ">,
  ) => void;
  onUpdatePosition: (
    patch: Pick<SceneObject, "positionX" | "positionY" | "positionZ">,
  ) => void;
  uiTheme: UiTheme;
  uploadError: string;
};

export default function InspectorPanel({
  copy,
  object,
  onColorChange,
  onDebugColorChange,
  onImageUpload,
  onModelChange,
  onResetObject,
  onThemeChange,
  onToggleDebugMode,
  onToggleDeviceShell,
  onUpdatePosition,
  onUpdateRotation,
  uiTheme,
  uploadError,
}: InspectorPanelProps) {
  if (!object) {
    return (
      <aside className="editor-sidebar inspector-sidebar h-screen w-[19rem] shrink-0" />
    );
  }

  const model = DEVICE_MODEL_LIST.find((item) => item.id === object.modelId);

  return (
    <aside className="editor-sidebar inspector-sidebar h-screen w-[19rem] shrink-0 overflow-y-auto">
      <PanelHeader
        eyebrow="Properties"
        title={object.name}
        titleClassName="panel-title-object"
      />

      <div className="flex flex-col">
        <PanelSection
          title={copy.modelLabel}
          className="--without-border-bottom"
        >
          <div className="select-wrapper">
            <select
              className="editor-input w-full appearance-none rounded-[var(--radius-sm)] px-2 py-1 pr-10 text-sm focus:outline-none"
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
            <ChevronDown className="select-chevron h-4 w-4" />
          </div>
          <label className="mt-2 flex justify-end items-center gap-2 text-[0.6875rem] leading-relaxed text-[var(--sidebar-muted)]">
            <span className="text-right">{copy.sceneSectionHint}</span>
            <input
              type="checkbox"
              checked={object.showDeviceShell}
              onChange={onToggleDeviceShell}
              className="mt-[0.125rem] h-3.5 w-3.5 rounded-[var(--radius-xs)] border border-[var(--input-border)] bg-[var(--input-bg)] accent-[var(--foreground)]"
            />
          </label>
        </PanelSection>

        <PanelSection
          title={copy.screenSectionTitle}
          className="--without-border-bottom"
        >
          <label className="upload-card">
            <Upload size={16} />
            {copy.uploadImage}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageUpload}
              className="hidden"
            />
          </label>
          <p className="editor-sidebar-muted text-[10px] mt-2 leading-relaxed text-right">
            {copy.screenSectionHint}
          </p>
          {uploadError ? (
            <p className="text-[11px] text-red-400 mt-2">{uploadError}</p>
          ) : null}
        </PanelSection>

        {!object.debugMode ? (
          <>
            <PanelSection
              title={copy.themesSectionTitle}
              className="--without-border-bottom"
            >
              <div className="grid grid-cols-4 gap-2">
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
              <div className="theme-color-inline">
                <span className="theme-color-inline-label">
                  {copy.bodyColorLabel}
                </span>
                <ColorRow
                  label=""
                  uiTheme={uiTheme}
                  value={object.colors.body}
                  onChange={onColorChange}
                  compact
                />
              </div>
            </PanelSection>
          </>
        ) : (
          <PanelSection title={copy.debugSectionTitle}>
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
          </PanelSection>
        )}

        <PanelSection
          title={copy.transformSectionTitle}
          className="transform-section"
          action={
            <div className="transform-reset-wrap">
              <span className="transform-reset-label">Reset</span>
              <button
                type="button"
                onClick={onResetObject}
                aria-label={copy.resetObjectButton}
                title={copy.resetObjectButton}
                className="editor-fab"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          }
        >
          <div className="transform-groups">
            <div className="transform-group">
              <Control
                label={copy.positionX}
                value={object.positionX}
                setValue={(value) =>
                  onUpdatePosition({
                    positionX: value,
                    positionY: object.positionY,
                    positionZ: object.positionZ,
                  })
                }
                min={-2}
                max={2}
                step={0.01}
              />
              <Control
                label={copy.positionY}
                value={object.positionY}
                setValue={(value) =>
                  onUpdatePosition({
                    positionX: object.positionX,
                    positionY: value,
                    positionZ: object.positionZ,
                  })
                }
                min={-2}
                max={2}
                step={0.01}
              />
              <Control
                label={copy.positionZ}
                value={object.positionZ}
                setValue={(value) =>
                  onUpdatePosition({
                    positionX: object.positionX,
                    positionY: object.positionY,
                    positionZ: value,
                  })
                }
                min={-1}
                max={1}
                step={0.01}
              />
            </div>

            <div className="transform-group transform-group-offset">
              <Control
                label={copy.rotationX}
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
                value={object.rotationY}
                displayValue={object.rotationY - 180}
                setValue={(value) =>
                  onUpdateRotation({
                    rotationX: object.rotationX,
                    rotationY: value + 180,
                    rotationZ: object.rotationZ,
                  })
                }
                min={-45}
                max={45}
              />
              <Control
                label={copy.rotationZ}
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
          </div>
        </PanelSection>

        <PanelSection title={copy.debugSectionTitle}>
          <button
            onClick={onToggleDebugMode}
            className={`w-full py-2 rounded-lg text-xs font-medium transition border ${object.debugMode ? "bg-yellow-500/15 border-yellow-500 text-yellow-300" : "editor-button editor-button-muted"}`}
          >
            {object.debugMode ? copy.debugOn : copy.debugOff}
          </button>
        </PanelSection>
      </div>
    </aside>
  );
}
