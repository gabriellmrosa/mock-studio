"use client";

import "./InspectorPanel.css";
import { useRef, useState, type ReactNode } from "react";
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
  isPlaceholderImageUrl,
  type SceneObject,
  type ScreenFit,
} from "../../lib/scene-objects";
import { DEVICE_MODEL_LIST } from "../../models/device-models";
import {
  IconButton,
  InspectorPanelHeader,
  PanelSection,
  SegmentedTabPanel,
  SegmentedTabs,
  SidePopover,
  SubTabPanel,
  SubTabs,
  Switch,
  type SubTabItem,
} from "../EditorPrimitives/EditorPrimitives";
import {
  Crop,
  Image as ImageIcon,
  Laptop,
  MoreVertical,
  Pipette,
  Crosshair,
  RotateCcw,
  Scaling,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
  Video,
  Watch,
} from "lucide-react";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const VIDEO_ACCEPT = "video/mp4,video/quicktime,video/webm,.mov";

type ScreenTab = "fit" | "crop";
type AppearanceTab = "custom";

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
  /** Volta a tela ao placeholder. */
  onRemoveImage: () => void;
  onRemoveVideo: () => void;
  onScreenSourceChange: (source: SceneObject["screenSource"]) => void;
  /** Enquadramento da fonte ativa (imagem ou vídeo). */
  onUpdateScreenFit: (patch: Partial<ScreenFit>) => void;
  onModelChange: (modelId: SceneObject["modelId"]) => void;
  onResetObject: () => void;
  /** Leva o objeto ao centro da vista, na pose em edição. */
  onCenterObject: () => void;
  onThemeColorChange: (part: string, hex: string) => void;
  onThemeChange: (themeId: string) => void;
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
  /** 0 a 1; o controle mostra em %. */
  onUpdateOpacity: (opacity: number) => void;
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
  onRemoveImage,
  onRemoveVideo,
  onScreenSourceChange,
  onUpdateScreenFit,
  onModelChange,
  onResetObject,
  onCenterObject,
  onThemeColorChange,
  onThemeChange,
  onToggleDeviceShell,
  onToggleNotebookKeyboard,
  onToggleTabletBezel,
  onToggleMatteColors,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  onUpdateOpacity,
  motionTab,
  selectedKeyframeId,
  uiTheme,
  uploadError,
}: InspectorPanelProps) {
  // Sub-aba aberta em cada seção; `null` = todas fechadas, o estado inicial.
  // É estado de interface, não do objeto: vale para qualquer objeto
  // selecionado, como a posição de um painel.
  const [appearanceTab, setAppearanceTab] = useState<AppearanceTab | null>(
    null,
  );

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
  const uploadRecommendation = model?.recommendedUploadSize ?? "";
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

  // Vídeo só existe no Movimento: o Estático é uma imagem parada, então lá a
  // tela é sempre a imagem e não há escolha de fonte.
  const screenSource = motionTab === "motion" ? object.screenSource : "image";
  // As opções da tela só existem depois de um upload: com o placeholder (ou
  // sem vídeo) não há o que ajustar.
  const hasUploadedContent =
    screenSource === "image"
      ? !isPlaceholderImageUrl(object.imageUrl)
      : object.screenVideo !== null;
  const screenSourceTabs: SubTabItem<SceneObject["screenSource"]>[] = [
    { icon: <ImageIcon size={13} />, id: "image", label: copy.screenSourceImage },
    { icon: <Video size={13} />, id: "video", label: copy.screenSourceVideo },
  ];
  const appearanceTabs: SubTabItem<AppearanceTab>[] = [
    {
      icon: <Pipette size={13} />,
      id: "custom",
      label: copy.appearanceTabCustom,
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
          <Switch
            checked={object.showDeviceShell}
            label={copy.sceneSectionHint}
            onChange={onToggleDeviceShell}
          />
          {object.modelId === "notebook" ? (
            <Switch
              checked={object.showNotebookKeyboard}
              label={copy.keyboardToggleLabel}
              onChange={onToggleNotebookKeyboard}
            />
          ) : null}
          {object.modelId === "tablet" ? (
            <Switch
              checked={object.showTabletBezel}
              label={copy.tabletBezelToggleLabel}
              onChange={onToggleTabletBezel}
            />
          ) : null}
        </PanelSection>

        <PanelSection
          title={copy.screenSectionTitle}
          className="--without-border-bottom"
        >
          {motionTab === "motion" ? (
            <SegmentedTabs
              ariaLabel={copy.screenSectionTitle}
              items={screenSourceTabs}
              value={screenSource}
              onChange={onScreenSourceChange}
            />
          ) : null}

          {/* Antes do upload, o card convida a enviar; depois, vira uma linha
              compacta com o arquivo. As opções (substituir, momento, ajuste,
              corte, remover) ficam num painel flutuante aberto pelo "⋮" — o
              painel lateral fica enxuto e o efeito aparece na cena ao lado. */}
          {screenSource === "image" ? (
            hasUploadedContent ? (
              <ScreenFileRow
                key={object.id}
                closeLabel={copy.closeLabel}
                icon={<ImageIcon size={16} />}
                menuLabel={copy.imageOptions}
                name={object.imageName ?? copy.screenSourceImage}
              >
                <ScreenSettings
                  accept={IMAGE_ACCEPT}
                  copy={copy}
                  fit={getActiveScreenFit(object)}
                  onFitChange={onUpdateScreenFit}
                  onRemove={onRemoveImage}
                  onReplace={onImageUpload}
                  removeLabel={copy.removeImage}
                  replaceLabel={copy.uploadImage}
                  replaceMeta={uploadRecommendation}
                  uiTheme={uiTheme}
                />
              </ScreenFileRow>
            ) : (
              <UploadCard
                accept={IMAGE_ACCEPT}
                label={copy.screenUploadImage}
                meta={uploadRecommendation}
                metaTitle={`${copy.screenSectionHintPrefix} ${uploadRecommendation}`}
                onUpload={onImageUpload}
              />
            )
          ) : object.screenVideo ? (
            <ScreenFileRow
              key={object.id}
              closeLabel={copy.closeLabel}
              icon={<Video size={16} />}
              menuLabel={copy.videoOptions}
              meta={`${(object.screenVideo.durationMs / 1000).toFixed(1)}s`}
              name={object.screenVideo.name}
            >
              <ScreenSettings
                accept={VIDEO_ACCEPT}
                copy={copy}
                fit={getActiveScreenFit(object)}
                onFitChange={onUpdateScreenFit}
                onRemove={onRemoveVideo}
                onReplace={onVideoUpload}
                removeLabel={copy.removeVideo}
                replaceLabel={copy.replaceVideo}
                replaceMeta={copy.screenVideoHint}
                uiTheme={uiTheme}
              />
            </ScreenFileRow>
          ) : (
            <UploadCard
              accept={VIDEO_ACCEPT}
              label={copy.uploadVideo}
              meta={copy.screenVideoHint}
              onUpload={onVideoUpload}
            />
          )}
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

          {/* Os temas são o conteúdo principal e ficam sempre à vista; cores
              peça a peça são sub-opção, fechada até o usuário pedir. */}
          {customizableColorKeys.length > 0 ? (
            <>
              <SubTabs
                ariaLabel={copy.appearanceTabsLabel}
                idPrefix="appearance-options"
                items={appearanceTabs}
                value={appearanceTab}
                onChange={setAppearanceTab}
              />
              {appearanceTab === "custom" ? (
                <SubTabPanel activeId="custom" idPrefix="appearance-options">
                  <div className="panel-card custom-theme-panel">
                    {customizableColorKeys.map((part) => (
                      <ColorRow
                        key={part}
                        label={
                          customizableColorLabels[part] ??
                          formatColorPartLabel(part)
                        }
                        uiTheme={uiTheme}
                        value={object.colors[part] ?? "#000000"}
                        onChange={(hex) => onThemeColorChange(part, hex)}
                      />
                    ))}
                  </div>
                </SubTabPanel>
              ) : null}
            </>
          ) : null}

          {/* Acabamento é um liga/desliga que vale para tema e cores
              personalizadas — por isso fica fora das sub-abas. */}
          {customizableColorKeys.length > 0 ? (
            <Switch
              checked={object.matteColors}
              label={copy.matteColorLabel}
              onChange={onToggleMatteColors}
            />
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
            // Com os campos de posição na tela: no Estático, ou num keyframe.
            motionTab === "static" || editedKeyframe ? (
              <div className="transform-actions">
                <div className="transform-reset-wrap">
                  <span className="transform-reset-label">
                    {copy.centerObjectLabel}
                  </span>
                  <button
                    type="button"
                    onClick={onCenterObject}
                    aria-label={copy.centerObjectButton}
                    title={copy.centerObjectButton}
                    className="editor-fab"
                  >
                    <Crosshair size={16} />
                  </button>
                </div>
                {/* O reset volta o objeto à pose padrão; no Movimento a pose
                    é a de cada keyframe, e ele não se aplica. */}
                {motionTab === "static" ? (
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
                ) : null}
              </div>
            ) : undefined
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
              <Control
                label={copy.opacity}
                value={Math.round(editedTransform.opacity * 100)}
                setValue={(value) => onUpdateOpacity(value / 100)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>
          )}
        </PanelSection>

      </div>
    </aside>
  );
}

/** Convite ao upload, enquanto a tela ainda mostra o placeholder. */
function UploadCard({
  accept,
  label,
  meta,
  metaTitle,
  onUpload,
}: {
  accept: string;
  label: string;
  /** Dado útil para o upload: tamanho ideal da imagem, formatos do vídeo. */
  meta: string;
  metaTitle?: string;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="upload-card">
      <Upload size={16} />
      <span className="upload-card-label">{label}</span>
      {meta ? (
        <span className="upload-card-meta" title={metaTitle}>
          {meta}
        </span>
      ) : null}
      <input
        type="file"
        accept={accept}
        aria-label={label}
        onChange={onUpload}
        className="hidden"
      />
    </label>
  );
}

/**
 * O arquivo já enviado, numa linha: ícone do tipo, nome (reticências se não
 * couber), um dado opcional e o "⋮" que abre as opções num painel flutuante.
 */
function ScreenFileRow({
  children,
  closeLabel,
  icon,
  menuLabel,
  meta,
  name,
}: {
  children: ReactNode;
  closeLabel: string;
  icon: ReactNode;
  menuLabel: string;
  meta?: string;
  name: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rowRef} className="screen-file-row">
      <span className="screen-file-icon" aria-hidden>
        {icon}
      </span>
      <span className="screen-file-name" title={name}>
        {name}
      </span>
      {meta ? <span className="screen-file-meta">{meta}</span> : null}
      {/* Gatilho de menu discreto, como o "⋮" das preferências: sem fundo
          no hover nem com o painel aberto. */}
      <IconButton
        aria-label={menuLabel}
        title={menuLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        active={isOpen}
        className="context-menu-trigger-quiet editor-icon-button-no-hover-bg"
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreVertical size={14} />
      </IconButton>
      {isOpen ? (
        <SidePopover
          anchorRef={rowRef}
          closeLabel={closeLabel}
          onClose={() => setIsOpen(false)}
          title={menuLabel}
        >
          {children}
        </SidePopover>
      ) : null}
    </div>
  );
}

/**
 * Conteúdo do painel de opções da tela: substituir no topo, o segmentado
 * Ajuste | Corte e, no rodapé, remover. Segmentado e não sub-abas:
 * o painel foi aberto justamente para ajustar, então sempre há uma escolhida.
 */
function ScreenSettings({
  accept,
  copy,
  fit,
  onFitChange,
  onRemove,
  onReplace,
  removeLabel,
  replaceLabel,
  replaceMeta,
  uiTheme,
}: {
  accept: string;
  copy: AppCopy;
  fit: ScreenFit;
  onFitChange: (patch: Partial<ScreenFit>) => void;
  onRemove: () => void;
  onReplace: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeLabel: string;
  replaceLabel: string;
  replaceMeta: string;
  uiTheme: UiTheme;
}) {
  const tabs: SubTabItem<ScreenTab>[] = [
    { icon: <Scaling size={13} />, id: "fit", label: copy.screenTabFit },
    { icon: <Crop size={13} />, id: "crop", label: copy.screenTabCrop },
  ];
  const [tab, setTab] = useState<ScreenTab>("fit");

  return (
    <>
      <UploadCard
        accept={accept}
        label={replaceLabel}
        meta={replaceMeta}
        onUpload={onReplace}
      />
      <SegmentedTabs
        ariaLabel={copy.screenTabsLabel}
        idPrefix="screen-options"
        items={tabs}
        value={tab}
        onChange={setTab}
      />
      <SegmentedTabPanel activeId={tab} idPrefix="screen-options">
          {tab === "fit" ? (
            <ScreenFitPanel
              copy={copy}
              fit={fit}
              onChange={onFitChange}
              uiTheme={uiTheme}
            />
          ) : (
            <ScreenCropPanel
              copy={copy}
              fit={fit}
              onChange={onFitChange}
              uiTheme={uiTheme}
            />
          )}
      </SegmentedTabPanel>
      <div className="side-popover-footer">
        <button type="button" className="editor-button-danger" onClick={onRemove}>
          <Trash2 size={14} />
          {removeLabel}
        </button>
      </div>
    </>
  );
}

/** Botão de resetar no topo de um painel de sub-aba. */
function SubPanelReset({
  disabled,
  label,
  onReset,
}: {
  disabled: boolean;
  label: string;
  onReset: () => void;
}) {
  return (
    <div className="inspector-subpanel-actions">
      <button
        type="button"
        className="editor-icon-button inspector-subpanel-reset"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onReset}
      >
        <RotateCcw size={13} />
      </button>
    </div>
  );
}

/**
 * Ajuste do conteúdo na tela, tudo em %. A posição é a fração da folga: com
 * zoom ≥ 100%, ±100% encosta a borda do conteúdo na da tela (nunca sobra vão);
 * abaixo de 100% o conteúdo fica menor que a tela e o resto é o fundo.
 */
function ScreenFitPanel({
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
  const isDefault =
    fit.zoom === DEFAULT_SCREEN_FIT.zoom &&
    fit.panX === DEFAULT_SCREEN_FIT.panX &&
    fit.panY === DEFAULT_SCREEN_FIT.panY &&
    fit.background === DEFAULT_SCREEN_FIT.background;

  return (
    <>
      <SubPanelReset
        disabled={isDefault}
        label={copy.screenFitReset}
        onReset={() =>
          onChange({
            background: DEFAULT_SCREEN_FIT.background,
            panX: DEFAULT_SCREEN_FIT.panX,
            panY: DEFAULT_SCREEN_FIT.panY,
            zoom: DEFAULT_SCREEN_FIT.zoom,
          })
        }
      />
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
    </>
  );
}

/**
 * Corte das bordas do arquivo, em % com décimos (uma moldura de 11 px num
 * vídeo de 1624 px é 0,7%). É uma máscara: o conteúdo não muda de tamanho nem
 * de lugar, e a faixa cortada mostra o fundo — por isso a cor dele também
 * aparece aqui.
 */
function ScreenCropPanel({
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
  const cropControls = [
    ["cropTop", copy.screenCropTop],
    ["cropBottom", copy.screenCropBottom],
    ["cropLeft", copy.screenCropLeft],
    ["cropRight", copy.screenCropRight],
  ] as const;
  const isDefault = cropControls.every(([key]) => fit[key] === 0);

  return (
    <>
      <SubPanelReset
        disabled={isDefault}
        label={copy.screenCropReset}
        onReset={() =>
          onChange({ cropBottom: 0, cropLeft: 0, cropRight: 0, cropTop: 0 })
        }
      />
      {cropControls.map(([key, label]) => (
        <Control
          key={key}
          label={label}
          value={Math.round(fit[key] * 1000) / 10}
          setValue={(value) => onChange({ [key]: value / 100 })}
          min={0}
          max={MAX_SCREEN_CROP * 100}
          step={0.1}
        />
      ))}
      {/* A faixa cortada mostra o fundo: a cor fica à mão aqui também. É o
          mesmo valor do Ajuste, e o resetar do corte não mexe nela. */}
      <ColorRow
        compact
        label={copy.screenFitBackground}
        uiTheme={uiTheme}
        value={fit.background}
        onChange={(background) => onChange({ background })}
      />
    </>
  );
}

function formatColorPartLabel(part: string) {
  return part
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}
