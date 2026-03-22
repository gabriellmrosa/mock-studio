"use client";

import "./InspectorPanel.css";
import ColorRow from "../ColorRow/ColorRow";
import Control from "../Control/Control";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import { DEVICE_MODEL_LIST } from "../../models/device-models";
import {
  InspectorPanelHeader,
  PanelSection,
} from "../EditorPrimitives/EditorPrimitives";
import { ChevronDown, RotateCcw, Upload } from "lucide-react";

type InspectorPanelProps = {
  copy: AppCopy;
  object: SceneObject | null;
  onDebugColorChange: (part: string, hex: string) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelChange: (modelId: SceneObject["modelId"]) => void;
  onResetObject: () => void;
  onThemeColorChange: (part: string, hex: string) => void;
  onThemeChange: (themeId: string) => void;
  onToggleCustomColors: () => void;
  onToggleDebugMode: () => void;
  onToggleDeviceShell: () => void;
  onToggleMatteColors: () => void;
  onUpdateRotation: (
    patch: Pick<SceneObject, "rotationX" | "rotationY" | "rotationZ">,
  ) => void;
  onUpdatePosition: (
    patch: Pick<SceneObject, "positionX" | "positionY" | "positionZ">,
  ) => void;
  onUpdateScale: (scale: number) => void;
  uiTheme: UiTheme;
  uploadError: string;
};

export default function InspectorPanel({
  copy,
  object,
  onDebugColorChange,
  onImageUpload,
  onModelChange,
  onResetObject,
  onThemeColorChange,
  onThemeChange,
  onToggleCustomColors,
  onToggleDebugMode,
  onToggleDeviceShell,
  onToggleMatteColors,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  uiTheme,
  uploadError,
}: InspectorPanelProps) {
  if (!object) {
    return (
      <aside className="editor-sidebar editor-sidebar-shell inspector-sidebar" />
    );
  }

  const model = DEVICE_MODEL_LIST.find((item) => item.id === object.modelId);
  const uploadRecommendation = model?.recommendedUploadSize
    ? `${copy.screenSectionHintPrefix} ${model.recommendedUploadSize}`
    : "";
  const customizableColorKeys = model?.customizableColorKeys ?? [];
  const customizableColorLabels = model?.customizableColorLabels ?? {};

  return (
    <aside className="editor-sidebar editor-sidebar-shell inspector-sidebar inspector-sidebar-scroll">
      <InspectorPanelHeader
        eyebrow="Properties"
        title={object.name}
        titleClassName="panel-title-object"
      />

      <div className="inspector-stack">
        <PanelSection
          title={copy.modelLabel}
          className="--without-border-bottom"
        >
          <div className="select-wrapper">
            <select
              className="editor-input model-select appearance-none focus:outline-none"
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
          <label className="inspector-inline-toggle">
            <span className="inspector-inline-toggle-text">{copy.sceneSectionHint}</span>
            <input
              type="checkbox"
              checked={object.showDeviceShell}
              onChange={onToggleDeviceShell}
              className="inspector-checkbox"
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
          <p className="editor-sidebar-muted inspector-meta-note">
            {uploadRecommendation}
          </p>
          {uploadError ? (
            <p className="inspector-error-note">{uploadError}</p>
          ) : null}
        </PanelSection>

        {!object.debugMode ? (
          <>
            <PanelSection
              title={copy.themesSectionTitle}
              className="--without-border-bottom"
            >
              <div className="theme-grid">
                {model?.themeOptions.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onThemeChange(theme.id)}
                    title={copy.themeNames[theme.id]}
                    className={`theme-card ${object.deviceTheme === theme.id ? "theme-card-active" : "theme-card-inactive"}`}
                  >
                    <div
                      className="theme-preview"
                      style={{ backgroundColor: theme.preview }}
                    />
                    <span className="theme-card-label">
                      {copy.themeNames[theme.id]}
                    </span>
                  </button>
                ))}
              </div>
              {customizableColorKeys.length > 0 ? (
                <>
                  <label className="inspector-inline-toggle">
                    <span className="inspector-inline-toggle-text">{copy.matteColorLabel}</span>
                    <input
                      type="checkbox"
                      checked={object.matteColors}
                      onChange={onToggleMatteColors}
                      className="inspector-checkbox"
                    />
                  </label>

                  <label className="inspector-inline-toggle">
                    <span className="inspector-inline-toggle-text">{copy.bodyColorLabel}</span>
                    <input
                      type="checkbox"
                      checked={object.customColorsEnabled}
                      onChange={onToggleCustomColors}
                      className="inspector-checkbox"
                    />
                  </label>

                  {object.customColorsEnabled ? (
                    <div className="panel-card custom-theme-panel">
                      {customizableColorKeys.map((part) => (
                        <ColorRow
                          key={part}
                          label={customizableColorLabels[part] ?? formatColorPartLabel(part)}
                          uiTheme={uiTheme}
                          value={object.colors[part] ?? "#000000"}
                          onChange={(hex) => onThemeColorChange(part, hex)}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </PanelSection>
          </>
        ) : (
          <PanelSection title={copy.debugSectionTitle}>
            <div className="panel-card debug-panel">
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
                min={-5}
                max={5}
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
                min={-5}
                max={5}
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
                min={-3}
                max={3}
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

            <div className="transform-group transform-group-offset">
              <Control
                label={copy.scale}
                value={object.scale}
                setValue={onUpdateScale}
                min={0.1}
                max={3}
                step={0.01}
              />
            </div>
          </div>
        </PanelSection>

        <PanelSection title={copy.debugSectionTitle}>
          <button
            onClick={onToggleDebugMode}
            className={`debug-toggle-button ${object.debugMode ? "debug-toggle-button-on" : "editor-button editor-button-muted debug-toggle-button-off"}`}
          >
            {object.debugMode ? copy.debugOn : copy.debugOff}
          </button>
        </PanelSection>
      </div>
    </aside>
  );
}

function formatColorPartLabel(part: string) {
  return part
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}
