"use client";

import "./InspectorPanel.css";
import ColorRow from "../ColorRow/ColorRow";
import Control from "../Control/Control";
import CustomSelect, { type CustomSelectOption } from "../CustomSelect/CustomSelect";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import {
  EASING_IDS,
  MAX_KEYFRAMES,
  MAX_SEGMENT_MS,
  MIN_SEGMENT_MS,
  hasMotion,
  resolveKeyframeTransform,
  type EasingId,
} from "../../lib/scene-motion";
import { DEVICE_MODEL_LIST } from "../../models/device-models";
import {
  InspectorPanelHeader,
  PanelSection,
} from "../EditorPrimitives/EditorPrimitives";
import {
  ChevronDown,
  ChevronUp,
  Laptop,
  Play,
  Plus,
  RotateCcw,
  Smartphone,
  Square,
  Tablet,
  Trash2,
  Upload,
  Video,
  Watch,
} from "lucide-react";

const NOTEBOOK_SCREEN_ONLY_COLOR_KEYS = new Set([
  "screenBackCover",
  "screenBezel",
  "screenRubberSeal",
  "lowerHingeBar",
  "hingeRubberSeal",
]);

type InspectorPanelProps = {
  copy: AppCopy;
  object: SceneObject | null;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onModelChange: (modelId: SceneObject["modelId"]) => void;
  onResetObject: () => void;
  onThemeColorChange: (part: string, hex: string) => void;
  onThemeChange: (themeId: string) => void;
  onToggleCustomColors: () => void;
  onToggleDeviceShell: () => void;
  onToggleNotebookKeyboard: () => void;
  onToggleTabletBezel: () => void;
  onToggleMatteColors: () => void;
  onUpdateRotation: (
    patch: Pick<SceneObject, "rotationX" | "rotationY" | "rotationZ">,
  ) => void;
  onUpdatePosition: (
    patch: Pick<SceneObject, "positionX" | "positionY" | "positionZ">,
  ) => void;
  onUpdateScale: (scale: number) => void;
  motionTab: "static" | "motion";
  onMotionTabChange: (tab: "static" | "motion") => void;
  selectedKeyframeId: string;
  onSelectKeyframe: (id: string) => void;
  onStartMotion: () => void;
  onAddKeyframe: () => void;
  onMoveKeyframe: (id: string, direction: -1 | 1) => void;
  onRemoveKeyframe: (id: string) => void;
  onUpdateKeyframeMeta: (
    id: string,
    patch: { durationMs?: number; easing?: EasingId },
  ) => void;
  isMotionPlaying: boolean;
  onToggleMotionPlayback: () => void;
  uiTheme: UiTheme;
  uploadError: string;
};

export default function InspectorPanel({
  copy,
  object,
  onImageUpload,
  onModelChange,
  onResetObject,
  onThemeColorChange,
  onThemeChange,
  onToggleCustomColors,
  onToggleDeviceShell,
  onToggleNotebookKeyboard,
  onToggleTabletBezel,
  onToggleMatteColors,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  motionTab,
  onMotionTabChange,
  selectedKeyframeId,
  onSelectKeyframe,
  onStartMotion,
  onAddKeyframe,
  onRemoveKeyframe,
  onMoveKeyframe,
  onUpdateKeyframeMeta,
  isMotionPlaying,
  onToggleMotionPlayback,
  uiTheme,
  uploadError,
}: InspectorPanelProps) {
  const editedKeyframeIndex =
    object && motionTab === "motion" && hasMotion(object)
      ? object.keyframes.findIndex(
          (keyframe) => keyframe.id === selectedKeyframeId,
        )
      : -1;
  if (!object) {
    return (
      <aside className="editor-sidebar editor-sidebar-shell inspector-sidebar" />
    );
  }

  // Em Motion os controles editam o keyframe selecionado, então os valores
  // exibidos vêm dele; na Static, da pose do objeto.
  const editedTransform =
    editedKeyframeIndex >= 0
      ? resolveKeyframeTransform(object, editedKeyframeIndex)
      : object;

  const model = DEVICE_MODEL_LIST.find((item) => item.id === object.modelId);
  const uploadRecommendation = model?.recommendedUploadSize
    ? `${copy.screenSectionHintPrefix} ${model.recommendedUploadSize}`
    : "";
  const customizableColorKeys = (model?.customizableColorKeys ?? []).filter((part) =>
    object.modelId === "notebook" && !object.showNotebookKeyboard
      ? NOTEBOOK_SCREEN_ONLY_COLOR_KEYS.has(part)
      : true,
  );
  const customizableColorLabels = copy.colorPartLabels;
  const positionXRange = Math.max(5, Math.ceil(Math.abs(object.positionX)) + 1);
  const modelOptions: CustomSelectOption[] = [
    ...DEVICE_MODEL_LIST.map((device) => ({
      value: device.id,
      label: device.name,
      icon:
        device.id === "smartphone" ||
        device.id === "smartphone2" ||
        device.id === "smartphone3" ? (
          <Smartphone size={14} />
        ) : device.id === "smartwatch" ? (
          <Watch size={14} />
        ) : device.id === "tablet" ? (
          <Tablet size={14} />
        ) : (
          <Laptop size={14} />
        ),
    })),
    {
      value: "video-mp4",
      label: "Video MP4",
      badgeLabel: "Em breve",
      disabled: true,
      icon: <Video size={14} />,
    },
  ];

  return (
    <aside className="editor-sidebar editor-sidebar-shell inspector-sidebar inspector-sidebar-scroll">
      <InspectorPanelHeader
        eyebrow={copy.propertiesEyebrow}
        title={object.name}
        titleClassName="panel-title-object"
      />

      <div className="inspector-stack">
        <PanelSection
          title={copy.modelLabel}
          className="--without-border-bottom"
        >
          <CustomSelect
            ariaLabel={copy.modelLabel}
            className="model-select"
            value={object.modelId}
            options={modelOptions}
            onChange={(value) => onModelChange(value as SceneObject["modelId"])}
          />
          <label className="inspector-inline-toggle">
            <span className="inspector-inline-toggle-text">{copy.sceneSectionHint}</span>
            <input
              type="checkbox"
              checked={object.showDeviceShell}
              onChange={onToggleDeviceShell}
              className="inspector-checkbox"
              aria-label={copy.sceneSectionHint}
            />
          </label>
          {object.modelId === "notebook" ? (
            <label className="inspector-inline-toggle">
              <span className="inspector-inline-toggle-text">{copy.keyboardToggleLabel}</span>
              <input
                type="checkbox"
                checked={object.showNotebookKeyboard}
                onChange={onToggleNotebookKeyboard}
                className="inspector-checkbox"
                aria-label={copy.keyboardToggleLabel}
              />
            </label>
          ) : null}
          {object.modelId === "tablet" ? (
            <label className="inspector-inline-toggle">
              <span className="inspector-inline-toggle-text">{copy.tabletBezelToggleLabel}</span>
              <input
                type="checkbox"
                checked={object.showTabletBezel}
                onChange={onToggleTabletBezel}
                className="inspector-checkbox"
                aria-label={copy.tabletBezelToggleLabel}
              />
            </label>
          ) : null}
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
              aria-label={copy.uploadImage}
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
                    aria-label={copy.matteColorLabel}
                  />
                </label>

              <label className="inspector-inline-toggle">
                <span className="inspector-inline-toggle-text">{copy.bodyColorLabel}</span>
                  <input
                    type="checkbox"
                    checked={object.customColorsEnabled}
                    onChange={onToggleCustomColors}
                    className="inspector-checkbox"
                    aria-label={copy.bodyColorLabel}
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

        <PanelSection
          title={copy.transformSectionTitle}
          className="transform-section"
          action={
            motionTab === "motion" ? undefined : (
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
            )
          }
        >
          {/* Em Motion os controles editam o keyframe selecionado, então os
              valores exibidos precisam vir dele — e não da pose estática. */}
          <div className="transform-tabs" role="tablist">
            {(["static", "motion"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={motionTab === tab}
                className={`transform-tab${motionTab === tab ? " is-active" : ""}`}
                onClick={() => onMotionTabChange(tab)}
              >
                {tab === "static"
                  ? copy.transformStaticTab
                  : copy.transformMotionTab}
              </button>
            ))}
          </div>

          {motionTab === "motion" ? (
            <MotionPanel
              copy={copy}
              isPlaying={isMotionPlaying}
              object={object}
              onAddKeyframe={onAddKeyframe}
              onMoveKeyframe={onMoveKeyframe}
              onRemoveKeyframe={onRemoveKeyframe}
              onSelectKeyframe={onSelectKeyframe}
              onStartMotion={onStartMotion}
              onTogglePlayback={onToggleMotionPlayback}
              onUpdateKeyframeMeta={onUpdateKeyframeMeta}
              selectedKeyframeId={selectedKeyframeId}
            />
          ) : null}

          {motionTab === "motion" && !hasMotion(object) ? null : (
          <div className="transform-groups">
            <div className="transform-group">
              <Control
                label={copy.positionX}
                value={editedTransform.positionX}
                setValue={(value) =>
                  onUpdatePosition({
                    positionX: value,
                    positionY: editedTransform.positionY,
                    positionZ: editedTransform.positionZ,
                  })
                }
                min={-positionXRange}
                max={positionXRange}
                step={0.01}
              />
              <Control
                label={copy.positionY}
                value={editedTransform.positionY}
                setValue={(value) =>
                  onUpdatePosition({
                    positionX: editedTransform.positionX,
                    positionY: value,
                    positionZ: editedTransform.positionZ,
                  })
                }
                min={-5}
                max={5}
                step={0.01}
              />
              <Control
                label={copy.positionZ}
                value={editedTransform.positionZ}
                setValue={(value) =>
                  onUpdatePosition({
                    positionX: editedTransform.positionX,
                    positionY: editedTransform.positionY,
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
                value={editedTransform.rotationX}
                setValue={(value) =>
                  onUpdateRotation({
                    rotationX: value,
                    rotationY: editedTransform.rotationY,
                    rotationZ: editedTransform.rotationZ,
                  })
                }
                min={-45}
                max={45}
              />
              <Control
                label={copy.rotationY}
                value={editedTransform.rotationY}
                displayValue={editedTransform.rotationY - 180}
                setValue={(value) =>
                  onUpdateRotation({
                    rotationX: editedTransform.rotationX,
                    rotationY: value + 180,
                    rotationZ: editedTransform.rotationZ,
                  })
                }
                min={-45}
                max={45}
              />
              <Control
                label={copy.rotationZ}
                value={editedTransform.rotationZ}
                setValue={(value) =>
                  onUpdateRotation({
                    rotationX: editedTransform.rotationX,
                    rotationY: editedTransform.rotationY,
                    rotationZ: value,
                  })
                }
                min={-360}
                max={360}
              />
            </div>

            <div className="transform-group transform-group-offset">
              <Control
                label={copy.scale}
                value={editedTransform.scale}
                setValue={onUpdateScale}
                min={0.1}
                max={3}
                step={0.01}
              />
            </div>
          </div>
          )}
        </PanelSection>

      </div>
    </aside>
  );
}

/**
 * Lista de keyframes do objeto. O primeiro é a pose de repouso: não tem
 * duração nem suavização próprias, porque nada chega até ele.
 */
function MotionPanel({
  copy,
  isPlaying,
  object,
  onAddKeyframe,
  onMoveKeyframe,
  onRemoveKeyframe,
  onSelectKeyframe,
  onStartMotion,
  onTogglePlayback,
  onUpdateKeyframeMeta,
  selectedKeyframeId,
}: {
  copy: AppCopy;
  isPlaying: boolean;
  object: SceneObject;
  onAddKeyframe: () => void;
  onMoveKeyframe: (id: string, direction: -1 | 1) => void;
  onRemoveKeyframe: (id: string) => void;
  onSelectKeyframe: (id: string) => void;
  onStartMotion: () => void;
  onTogglePlayback: () => void;
  onUpdateKeyframeMeta: (
    id: string,
    patch: { durationMs?: number; easing?: EasingId },
  ) => void;
  selectedKeyframeId: string;
}) {
  if (!hasMotion(object)) {
    return (
      <div className="motion-empty">
        <p className="editor-sidebar-muted">{copy.motionEmptyHint}</p>
        <button
          type="button"
          className="editor-button-outline"
          onClick={onStartMotion}
        >
          <Plus size={14} />
          {copy.motionStart}
        </button>
      </div>
    );
  }

  const selectedIndex = object.keyframes.findIndex(
    (keyframe) => keyframe.id === selectedKeyframeId,
  );
  const selected = object.keyframes[selectedIndex];

  const easingOptions: CustomSelectOption[] = EASING_IDS.map((easing) => ({
    label: copy.motionEasingLabels[easing] ?? easing,
    value: easing,
  }));

  return (
    <div className="motion-panel">
      <button
        type="button"
        className="editor-button-outline"
        onClick={onTogglePlayback}
      >
        {isPlaying ? <Square size={13} /> : <Play size={13} />}
        {isPlaying ? copy.motionStop : copy.motionPlay}
      </button>

      <div className="motion-keyframes">
        {object.keyframes.map((keyframe, index) => (
          <div
            key={keyframe.id}
            className={`motion-keyframe${
              keyframe.id === selectedKeyframeId ? " is-active" : ""
            }`}
          >
            <button
              type="button"
              className="motion-keyframe-select"
              aria-pressed={keyframe.id === selectedKeyframeId}
              onClick={() => onSelectKeyframe(keyframe.id)}
            >
              <span>{`${copy.motionKeyframeLabel} ${index + 1}`}</span>
              {index === 0 ? (
                <span className="motion-keyframe-tag">
                  {copy.motionFirstKeyframe}
                </span>
              ) : (
                <span className="motion-keyframe-tag">
                  {`${(keyframe.durationMs / 1000).toFixed(1)}s`}
                </span>
              )}
            </button>
            <button
              type="button"
              className="editor-icon-button motion-keyframe-action"
              aria-label={copy.motionMoveKeyframeUp}
              title={copy.motionMoveKeyframeUp}
              disabled={index === 0}
              onClick={() => onMoveKeyframe(keyframe.id, -1)}
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              className="editor-icon-button motion-keyframe-action"
              aria-label={copy.motionMoveKeyframeDown}
              title={copy.motionMoveKeyframeDown}
              disabled={index === object.keyframes.length - 1}
              onClick={() => onMoveKeyframe(keyframe.id, 1)}
            >
              <ChevronDown size={12} />
            </button>
            <button
              type="button"
              className="editor-icon-button motion-keyframe-action"
              aria-label={copy.motionRemoveKeyframe}
              title={copy.motionRemoveKeyframe}
              onClick={() => onRemoveKeyframe(keyframe.id)}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {object.keyframes.length < MAX_KEYFRAMES ? (
        <button
          type="button"
          className="editor-button-outline"
          onClick={onAddKeyframe}
        >
          <Plus size={14} />
          {copy.motionAddKeyframe}
        </button>
      ) : null}

      {selected && selectedIndex > 0 ? (
        <div className="motion-segment">
          <Control
            label={copy.motionDuration}
            value={selected.durationMs / 1000}
            setValue={(value) =>
              onUpdateKeyframeMeta(selected.id, {
                durationMs: Math.round(value * 1000),
              })
            }
            min={MIN_SEGMENT_MS / 1000}
            max={MAX_SEGMENT_MS / 1000}
            step={0.1}
          />
          <div className="motion-easing">
            <span className="editor-sidebar-label">{copy.motionEasing}</span>
            <CustomSelect
              ariaLabel={copy.motionEasing}
              options={easingOptions}
              value={selected.easing}
              onChange={(value) =>
                onUpdateKeyframeMeta(selected.id, { easing: value as EasingId })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatColorPartLabel(part: string) {
  return part
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}
