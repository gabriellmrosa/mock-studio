"use client";

import "./InspectorPanel.css";
import ColorRow from "../ColorRow/ColorRow";
import Control from "../Control/Control";
import CustomSelect, { type CustomSelectOption } from "../CustomSelect/CustomSelect";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import {
  DEFAULT_SCREEN_FIT,
  MAX_SCREEN_CROP,
  MAX_SCREEN_ZOOM,
  MIN_SCREEN_ZOOM,
  getActiveScreenFit,
  type SceneObject,
  type ScreenFit,
  type ScreenVideo,
} from "../../lib/scene-objects";
import { DEVICE_MODEL_LIST } from "../../models/device-models";
import {
  InspectorPanelHeader,
  PanelSection,
} from "../EditorPrimitives/EditorPrimitives";
import {
  Image as ImageIcon,
  Laptop,
  RotateCcw,
  Smartphone,
  Tablet,
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
  onVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onScreenSourceChange: (source: SceneObject["screenSource"]) => void;
  onUpdateScreenVideo: (
    patch: Partial<Pick<ScreenVideo, "frameMs" | "startMs">>,
  ) => void;
  /** Enquadramento da fonte ativa (imagem ou vídeo). */
  onUpdateScreenFit: (patch: Partial<ScreenFit>) => void;
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
  selectedKeyframeId: string;
  uiTheme: UiTheme;
  uploadError: string;
};

export default function InspectorPanel({
  copy,
  object,
  onImageUpload,
  onVideoUpload,
  onScreenSourceChange,
  onUpdateScreenVideo,
  onUpdateScreenFit,
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
  selectedKeyframeId,
  uiTheme,
  uploadError,
}: InspectorPanelProps) {
  if (!object) {
    return (
      <aside className="editor-sidebar editor-sidebar-shell inspector-sidebar" />
    );
  }

  // Em Movimento os controles editam o keyframe selecionado na timeline, então
  // os valores exibidos vêm dele; em Estático, da pose do objeto. Sem keyframe
  // selecionado deste objeto não há o que editar em Movimento.
  const editedKeyframe =
    motionTab === "motion"
      ? object.keyframes.find((keyframe) => keyframe.id === selectedKeyframeId)
      : undefined;
  const editedTransform = editedKeyframe?.transform ?? object;

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
          <div className="screen-source-tabs" role="tablist">
            {(["image", "video"] as const).map((source) => (
              <button
                key={source}
                type="button"
                role="tab"
                aria-selected={object.screenSource === source}
                className={`screen-source-tab${
                  object.screenSource === source ? " is-active" : ""
                }`}
                onClick={() => onScreenSourceChange(source)}
              >
                {source === "image" ? (
                  <ImageIcon size={13} />
                ) : (
                  <Video size={13} />
                )}
                {source === "image"
                  ? copy.screenSourceImage
                  : copy.screenSourceVideo}
              </button>
            ))}
          </div>

          {object.screenSource === "image" ? (
            <>
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
            </>
          ) : (
            <>
              <label className="upload-card">
                <Upload size={16} />
                {object.screenVideo ? copy.replaceVideo : copy.uploadVideo}
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mov"
                  aria-label={
                    object.screenVideo ? copy.replaceVideo : copy.uploadVideo
                  }
                  onChange={onVideoUpload}
                  className="hidden"
                />
              </label>
              {object.screenVideo && motionTab === "static" ? (
                <div className="screen-video-timing">
                  {/* O Estático congela um quadro — o do PNG. No Movimento o
                      tempo do vídeo é da timeline: o clipe fica numa trilha
                      própria, como num editor de vídeo. */}
                  <Control
                    label={copy.screenVideoFrame}
                    value={object.screenVideo.frameMs / 1000}
                    setValue={(value) =>
                      onUpdateScreenVideo({
                        frameMs: Math.round(value * 1000),
                      })
                    }
                    min={0}
                    max={object.screenVideo.durationMs / 1000}
                    step={0.01}
                  />
                </div>
              ) : null}
              {object.screenVideo ? (
                <p
                  className="screen-video-file"
                  title={object.screenVideo.name}
                >
                  <span className="screen-video-name">
                    {object.screenVideo.name}
                  </span>
                  <span className="screen-video-duration">
                    {`${(object.screenVideo.durationMs / 1000).toFixed(1)}s`}
                  </span>
                </p>
              ) : null}
              <p className="editor-sidebar-muted inspector-meta-note">
                {copy.screenVideoHint}
              </p>
            </>
          )}
          {object.screenSource === "image" || object.screenVideo ? (
            <ScreenFitControls
              copy={copy}
              fit={getActiveScreenFit(object)}
              onChange={onUpdateScreenFit}
              uiTheme={uiTheme}
            />
          ) : null}
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
          title={
            editedKeyframe
              ? `${copy.transformSectionTitle} · ${copy.motionKeyframeLabel} ${(
                  editedKeyframe.timeMs / 1000
                ).toFixed(2)}s`
              : motionTab === "motion"
                ? `${copy.transformSectionTitle} · ${copy.transformMotionTab}`
                : copy.transformSectionTitle
          }
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
          {motionTab === "motion" && !editedKeyframe ? (
            <p className="editor-sidebar-muted motion-empty-hint">
              {copy.motionEmptyHint}
            </p>
          ) : (
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
 * Enquadramento do conteúdo na tela, tudo em %. A posição é a fração da folga:
 * com zoom ≥ 100%, ±100% encosta a borda do conteúdo na da tela (nunca sobra
 * vão); abaixo de 100% o conteúdo fica menor que a tela e o resto é o fundo.
 * "Cortar bordas" descarta o que foi gravado nas bordas do arquivo, como a
 * moldura escura de uma gravação espelhada.
 */
function ScreenFitControls({
  copy,
  fit,
  onChange,
  uiTheme,
}: {
  copy: AppCopy;
  fit: ScreenFit;
  onChange: (patch: Partial<ScreenFit>) => void;
  uiTheme: UiTheme;
}) {
  const isDefault = (Object.keys(DEFAULT_SCREEN_FIT) as (keyof ScreenFit)[])
    .every((key) => fit[key] === DEFAULT_SCREEN_FIT[key]);
  const cropControls = [
    ["cropTop", copy.screenCropTop],
    ["cropBottom", copy.screenCropBottom],
    ["cropLeft", copy.screenCropLeft],
    ["cropRight", copy.screenCropRight],
  ] as const;

  return (
    <div className="screen-fit">
      <div className="screen-fit-header">
        <span className="editor-sidebar-label">{copy.screenFitTitle}</span>
        <button
          type="button"
          className="editor-icon-button screen-fit-reset"
          aria-label={copy.screenFitReset}
          title={copy.screenFitReset}
          disabled={isDefault}
          onClick={() => onChange({ ...DEFAULT_SCREEN_FIT })}
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <Control
        label={copy.screenFitZoom}
        value={Math.round(fit.zoom * 100)}
        setValue={(value) => onChange({ zoom: value / 100 })}
        min={MIN_SCREEN_ZOOM * 100}
        max={MAX_SCREEN_ZOOM * 100}
      />
      <Control
        label={copy.screenFitX}
        value={Math.round(fit.panX * 100)}
        setValue={(value) => onChange({ panX: value / 100 })}
        min={-100}
        max={100}
      />
      <Control
        label={copy.screenFitY}
        value={Math.round(fit.panY * 100)}
        setValue={(value) => onChange({ panY: value / 100 })}
        min={-100}
        max={100}
      />
      <ColorRow
        compact
        label={copy.screenFitBackground}
        uiTheme={uiTheme}
        value={fit.background}
        onChange={(background) => onChange({ background })}
      />

      <span className="editor-sidebar-label screen-fit-subtitle">
        {copy.screenCropTitle}
      </span>
      {cropControls.map(([key, label]) => (
        <Control
          key={key}
          label={label}
          // Décimos de %: uma moldura de 11 px num vídeo de 1624 px é 0,7%.
          value={Math.round(fit[key] * 1000) / 10}
          setValue={(value) => onChange({ [key]: value / 100 })}
          min={0}
          max={MAX_SCREEN_CROP * 100}
          step={0.1}
        />
      ))}
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
