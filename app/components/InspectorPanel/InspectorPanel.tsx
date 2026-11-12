"use client";

import { DEFAULT_FOLD_ANGLE } from "../../lib/scene-presets";
import { FoldableIcon } from "../FoldableIcon/FoldableIcon";
import "./InspectorPanel.css";
import { useRef, useState, type ReactNode } from "react";
import ColorRow from "../ColorRow/ColorRow";
import Control from "../Control/Control";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import type { ObjectAlignment } from "../MockupCanvas/object-alignment";
import {
  DEFAULT_SCREEN_FIT,
  DUO_OUTER_SCREEN_SIZE,
  MAX_SCREEN_CROP,
  MAX_SCREEN_PAN,
  MAX_SCREEN_ZOOM,
  MIN_SCREEN_ZOOM,
  getActiveOuterScreenFit,
  getActiveScreenFit,
  isDefaultObjectTransform,
  isPlaceholderImageUrl,
  type SceneObject,
  type ScreenFit,
  type ScreenVideo,
} from "../../lib/scene-objects";
import { isCustomDeviceTheme } from "../../lib/device-colors";
import {
  DEVICE_MODEL_LIST,
  MODELS_WITH_FINISH,
  type DeviceThemeOption,
} from "../../models/device-models";
import {
  IconButton,
  InspectorPanelHeader,
  PanelSection,
  ResetButton,
  SegmentedTabPanel,
  SegmentedTabs,
  SidePopover,
  SubTabPanel,
  SubTabs,
  Switch,
  type SubTabItem,
} from "../EditorPrimitives/EditorPrimitives";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Crop,
  Image as ImageIcon,
  Laptop,
  MoreVertical,
  Pipette,
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
  /** Alinha o objeto ao quadro do canvas, na pose em edição. */
  onAlignObject: (alignment: ObjectAlignment) => void;
  onThemeColorChange: (part: string, hex: string) => void;
  onThemeChange: (themeId: string) => void;
  onToggleDeviceShell: () => void;
  onToggleNotebookKeyboard: () => void;
  onToggleTabletBezel: () => void;
  onToggleMatteFinish: () => void;
  onUpdateRotation: (
    patch: Pick<SceneObject, "rotationX" | "rotationY" | "rotationZ">,
  ) => void;
  onUpdatePosition: (
    patch: Pick<SceneObject, "positionX" | "positionY" | "positionZ">,
  ) => void;
  onUpdateScale: (scale: number) => void;
  /** 0 a 1; o controle mostra em %. */
  onUpdateOpacity: (opacity: number) => void;
  /** Abertura do dobrável em graus: 180 aberto, 0 fechado. */
  onUpdateFoldAngle: (foldAngle: number) => void;
  /** A tela de fora do dobrável: imagem ou vídeo, cada um com o seu arquivo. */
  onOuterImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onOuterVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveOuterImage: () => void;
  onRemoveOuterVideo: () => void;
  onOuterScreenSourceChange: (source: SceneObject["screenSource"]) => void;
  /** Enquadramento da fonte ativa da tela de fora (imagem ou vídeo). */
  onUpdateOuterScreenFit: (patch: Partial<ScreenFit>) => void;
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
  onAlignObject,
  onThemeColorChange,
  onThemeChange,
  onToggleDeviceShell,
  onToggleNotebookKeyboard,
  onToggleTabletBezel,
  onToggleMatteFinish,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  onUpdateOpacity,
  onUpdateFoldAngle,
  onOuterImageUpload,
  onOuterVideoUpload,
  onRemoveOuterImage,
  onRemoveOuterVideo,
  onOuterScreenSourceChange,
  onUpdateOuterScreenFit,
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
  const uploadRecommendation = model?.recommendedUploadSize ?? "";
  const customizableColorKeys = (model?.customizableColorKeys ?? []).filter((part) =>
    object.modelId === "notebook" && !object.showNotebookKeyboard
      ? NOTEBOOK_SCREEN_ONLY_COLOR_KEYS.has(part)
      : true,
  );
  const customizableColorLabels = copy.colorPartLabels;
  const positionXRange = Math.max(5, Math.ceil(Math.abs(object.positionX)) + 1);
  // A faixa de aparência: nome e cor do tema, ou "Personalizada" quando alguma
  // parte foi editada à mão — com a cor do corpo, que é a que se reconhece.
  const isCustomTheme = model
    ? isCustomDeviceTheme(model, object.deviceTheme, object.colors)
    : false;
  const currentThemeName = isCustomTheme
    ? copy.themeCustomName
    : (copy.themeNames[object.deviceTheme] ?? object.deviceTheme);
  const currentThemeSwatch =
    (isCustomTheme && model?.primaryColorKey
      ? object.colors[model.primaryColorKey]
      : model?.themeOptions.find((theme) => theme.id === object.deviceTheme)
          ?.preview) ?? "transparent";
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
          {/* Como a tela e a cor: o aparelho numa faixa, e o painel que ela
              abre tem a lista de aparelhos e as opções do corpo. */}
          <ScreenFileRow
            key={object.id}
            closeLabel={copy.closeLabel}
            icon={getDeviceIcon(object.modelId, 16)}
            menuLabel={copy.modelLabel}
            name={model?.name ?? object.modelId}
          >
            <DeviceSettings
              copy={copy}
              object={object}
              onModelChange={onModelChange}
              onToggleDeviceShell={onToggleDeviceShell}
              onToggleNotebookKeyboard={onToggleNotebookKeyboard}
              onToggleTabletBezel={onToggleTabletBezel}
            />
          </ScreenFileRow>
        </PanelSection>

        <PanelSection
          title={copy.screenSectionTitle}
          className="--without-border-bottom"
        >
          {/* O dobrável tem duas telas, cada uma com o seu título, a sua
              escolha Imagem | Vídeo e o seu arquivo. Nos outros aparelhos há
              uma só, sem título. */}
          <ScreenControls
            copy={copy}
            image={{
              fileName: object.imageName,
              fit: getActiveScreenFit(object),
              hasFile: !isPlaceholderImageUrl(object.imageUrl),
              onFitChange: onUpdateScreenFit,
              onRemove: onRemoveImage,
              onUpload: onImageUpload,
              recommendation: uploadRecommendation,
            }}
            onSourceChange={onScreenSourceChange}
            rowKey={object.id}
            source={motionTab === "motion" ? object.screenSource : "image"}
            suffix=""
            title={object.modelId === "duo" ? copy.innerScreenLabel : null}
            uiTheme={uiTheme}
            video={{
              data: object.screenVideo,
              fit: getActiveScreenFit(object),
              onFitChange: onUpdateScreenFit,
              onRemove: onRemoveVideo,
              onUpload: onVideoUpload,
            }}
            withSourceTabs={motionTab === "motion"}
          />
          {object.modelId === "duo" ? (
            <ScreenControls
              copy={copy}
              image={{
                fileName: object.outerImageName,
                fit: getActiveOuterScreenFit(object),
                hasFile: object.outerImageUrl !== null,
                onFitChange: onUpdateOuterScreenFit,
                onRemove: onRemoveOuterImage,
                onUpload: onOuterImageUpload,
                recommendation: DUO_OUTER_SCREEN_SIZE.join("x"),
              }}
              onSourceChange={onOuterScreenSourceChange}
              rowKey={`${object.id}-outer`}
              source={
                motionTab === "motion" ? object.outerScreenSource : "image"
              }
              isFollowing
              suffix={` (${copy.outerScreenLabel})`}
              title={copy.outerScreenLabel}
              uiTheme={uiTheme}
              video={{
                data: object.outerScreenVideo,
                fit: getActiveOuterScreenFit(object),
                onFitChange: onUpdateOuterScreenFit,
                onRemove: onRemoveOuterVideo,
                onUpload: onOuterVideoUpload,
              }}
              withSourceTabs={motionTab === "motion"}
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
          {/* Como o arquivo da tela: a cor escolhida numa faixa, e o "⋮" abre
              o painel flutuante com as outras cores e a edição peça a peça.
              Nasce com a cor padrão já marcada, em vez de uma grade de cartões
              sempre aberta. */}
          <ScreenFileRow
            key={object.id}
            closeLabel={copy.closeLabel}
            icon={
              <span
                aria-hidden
                className="theme-preview screen-file-swatch"
                style={{ backgroundColor: currentThemeSwatch }}
              />
            }
            menuLabel={copy.appearanceTabsLabel}
            name={currentThemeName}
          >
            <AppearanceSettings
              colorLabels={customizableColorLabels}
              colorKeys={customizableColorKeys}
              copy={copy}
              hasFinish={MODELS_WITH_FINISH.includes(object.modelId)}
              object={object}
              onThemeChange={onThemeChange}
              onThemeColorChange={onThemeColorChange}
              onToggleMatteFinish={onToggleMatteFinish}
              themeOptions={model?.themeOptions ?? []}
              uiTheme={uiTheme}
            />
          </ScreenFileRow>
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
            // O reset volta o objeto à pose padrão; no Movimento a pose é a
            // de cada keyframe, e ele não se aplica.
            motionTab === "static" ? (
              <ResetButton
                disabled={isDefaultObjectTransform(object)}
                label={copy.resetObjectButton}
                onReset={onResetObject}
              />
            ) : undefined
          }
        >
          {motionTab === "motion" && !editedKeyframe ? (
            <p className="editor-sidebar-muted motion-empty-hint">
              {copy.motionEmptyHint}
            </p>
          ) : (
          <div className="transform-groups">
            <AlignmentControl copy={copy} onAlign={onAlignObject} />

            {/* A abertura é pose: no Movimento, cada keyframe tem a sua, e o
                aparelho abre ou fecha entre eles. */}
            {object.modelId === "duo" ? (
              <div className="transform-group transform-group-offset">
                <Control
                  label={copy.foldAngle}
                  value={Math.round(
                    editedTransform.foldAngle ?? DEFAULT_FOLD_ANGLE,
                  )}
                  setValue={onUpdateFoldAngle}
                  min={0}
                  max={180}
                  step={1}
                />
              </div>
            ) : null}

            <div className="transform-group transform-group-offset">
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

/**
 * Alinhamento ao quadro do canvas: dois trilhos lado a lado, o horizontal
 * (esquerda, centro, direita) e o vertical (topo, meio, base). São ações,
 * não estados — nenhum botão fica selecionado.
 */
function AlignmentControl({
  copy,
  onAlign,
}: {
  copy: AppCopy;
  onAlign: (alignment: ObjectAlignment) => void;
}) {
  const groups: {
    axis: ObjectAlignment["axis"];
    items: { edge: ObjectAlignment["edge"]; icon: ReactNode; label: string }[];
    label: string;
  }[] = [
    {
      axis: "x",
      items: [
        { edge: "start", icon: <AlignStartVertical size={16} />, label: copy.alignLeft },
        { edge: "center", icon: <AlignCenterVertical size={16} />, label: copy.alignCenter },
        { edge: "end", icon: <AlignEndVertical size={16} />, label: copy.alignRight },
      ],
      label: copy.alignmentHorizontal,
    },
    {
      axis: "y",
      items: [
        { edge: "start", icon: <AlignStartHorizontal size={16} />, label: copy.alignTop },
        { edge: "center", icon: <AlignCenterHorizontal size={16} />, label: copy.alignMiddle },
        { edge: "end", icon: <AlignEndHorizontal size={16} />, label: copy.alignBottom },
      ],
      label: copy.alignmentVertical,
    },
  ];

  return (
    <div className="transform-group">
      <span className="transform-reset-label">{copy.alignmentLabel}</span>
      <div className="transform-align-row">
        {groups.map((group) => (
          <div
            key={group.axis}
            role="group"
            aria-label={group.label}
            className="editor-segmented transform-align-group"
          >
            {group.items.map((item) => (
              <button
                key={item.edge}
                type="button"
                aria-label={item.label}
                title={item.label}
                className="editor-segmented-tab"
                onClick={() => onAlign({ axis: group.axis, edge: item.edge })}
              >
                {item.icon}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** O ícone de cada aparelho: o da lista e o da faixa. */
function getDeviceIcon(modelId: SceneObject["modelId"], size: number) {
  switch (modelId) {
    case "smartphone":
    case "smartphone2":
    case "smartphone3":
      return <Smartphone size={size} />;
    case "smartwatch":
      return <Watch size={size} />;
    case "tablet":
      return <Tablet size={size} />;
    case "duo":
      return <FoldableIcon size={size} />;
    default:
      return <Laptop size={size} />;
  }
}

/**
 * O que o painel do aparelho mostra: a lista de modelos, com o escolhido
 * marcado por fundo e cor, e, abaixo, as opções do corpo — o corpo em si e, em
 * quem os tem, o teclado do notebook e a moldura do tablet.
 *
 * É uma escolha exclusiva, então cada modelo é um `radio`: o leitor de tela
 * anuncia "1 de 7" e qual está marcado. A lista fica aberta ao escolher, como
 * as cores: o efeito aparece na cena ao lado e dá para comparar.
 */
function DeviceSettings({
  copy,
  object,
  onModelChange,
  onToggleDeviceShell,
  onToggleNotebookKeyboard,
  onToggleTabletBezel,
}: {
  copy: AppCopy;
  object: SceneObject;
  onModelChange: (modelId: SceneObject["modelId"]) => void;
  onToggleDeviceShell: () => void;
  onToggleNotebookKeyboard: () => void;
  onToggleTabletBezel: () => void;
}) {
  return (
    <>
      <div role="radiogroup" aria-label={copy.modelLabel} className="device-option-list">
        {DEVICE_MODEL_LIST.map((device) => {
          const isSelected = device.id === object.modelId;

          return (
            <button
              key={device.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`device-option ${isSelected ? "device-option-active" : ""}`.trim()}
              onClick={() => onModelChange(device.id)}
            >
              {getDeviceIcon(device.id, 14)}
              <span>{device.name}</span>
            </button>
          );
        })}
      </div>

      <div className="device-options">
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
        {object.modelId === "tablet" || object.modelId === "duo" ? (
          <Switch
            checked={object.showTabletBezel}
            label={copy.tabletBezelToggleLabel}
            onChange={onToggleTabletBezel}
          />
        ) : null}
      </div>
    </>
  );
}

type ScreenControlsProps = {
  copy: AppCopy;
  image: {
    fileName: string | null;
    fit: ScreenFit;
    /** Já tem arquivo, e não o placeholder. */
    hasFile: boolean;
    onFitChange: (patch: Partial<ScreenFit>) => void;
    onRemove: () => void;
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    /** Tamanho ideal da imagem, mostrado no painel de envio. */
    recommendation: string;
  };
  onSourceChange: (source: SceneObject["screenSource"]) => void;
  /** Muda com o objeto (ou a tela): remonta a faixa e fecha o painel dela. */
  rowKey: string;
  /** O que a tela mostra: imagem ou vídeo. Vídeo só existe no Movimento. */
  source: SceneObject["screenSource"];
  /** Texto acrescentado aos nomes acessíveis, para dizer de que tela é. */
  suffix: string;
  /** O nome da tela, quando o aparelho tem mais de uma. */
  title: string | null;
  /**
   * Vem depois de outra tela: abre um espaço maior antes do título, para os
   * controles de cada tela formarem um grupo à parte (proximidade: o que está
   * junto pertence junto, e o espaço entre os grupos tem que passar do espaço
   * dentro deles).
   */
  isFollowing?: boolean;
  uiTheme: UiTheme;
  video: {
    data: ScreenVideo | null;
    fit: ScreenFit;
    onFitChange: (patch: Partial<ScreenFit>) => void;
    onRemove: () => void;
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };
  withSourceTabs: boolean;
};

/**
 * Uma tela do aparelho no Inspector: o título (se há mais de uma), a escolha
 * Imagem | Vídeo (só no Movimento, o Estático é uma imagem parada) e a faixa do
 * arquivo. Antes do upload a faixa convida a enviar; depois vira uma linha
 * compacta com o arquivo. As opções (substituir, momento, ajuste, corte,
 * remover) ficam num painel flutuante aberto pelo "⋮" — o painel lateral fica
 * enxuto e o efeito aparece na cena ao lado.
 *
 * É um componente para a tela principal e a de fora do dobrável serem iguais:
 * cada uma com o seu controle, sem uma escolha que valha para as duas.
 */
function ScreenControls({
  copy,
  image,
  onSourceChange,
  rowKey,
  source,
  suffix,
  title,
  isFollowing = false,
  uiTheme,
  video,
  withSourceTabs,
}: ScreenControlsProps) {
  const sourceTabs: SubTabItem<SceneObject["screenSource"]>[] = [
    { icon: <ImageIcon size={13} />, id: "image", label: copy.screenSourceImage },
    { icon: <Video size={13} />, id: "video", label: copy.screenSourceVideo },
  ];

  return (
    <>
      {title ? (
        <span
          className={`transform-reset-label${
            isFollowing ? " screen-group-title-following" : ""
          }`}
        >
          {title}
        </span>
      ) : null}
      {withSourceTabs ? (
        <SegmentedTabs
          ariaLabel={`${copy.screenSectionTitle}${suffix}`}
          items={sourceTabs}
          value={source}
          onChange={onSourceChange}
        />
      ) : null}

      {source === "image" ? (
        <ScreenFileRow
          key={rowKey}
          closeLabel={copy.closeLabel}
          icon={<ImageIcon size={16} />}
          menuLabel={`${copy.imageOptions}${suffix}`}
          name={
            image.hasFile
              ? (image.fileName ?? copy.screenSourceImage)
              : copy.screenAddImage
          }
        >
          {image.hasFile ? (
            <ScreenSettings
              accept={IMAGE_ACCEPT}
              copy={copy}
              fit={image.fit}
              onFitChange={image.onFitChange}
              onRemove={image.onRemove}
              onReplace={image.onUpload}
              removeLabel={copy.removeImage}
              replaceLabel={copy.uploadImage}
              replaceMeta={image.recommendation}
              uiTheme={uiTheme}
            />
          ) : (
            <UploadCard
              accept={IMAGE_ACCEPT}
              label={`${copy.screenUploadImage}${suffix}`}
              meta={image.recommendation}
              metaTitle={`${copy.screenSectionHintPrefix} ${image.recommendation}`}
              onUpload={image.onUpload}
            />
          )}
        </ScreenFileRow>
      ) : (
        <ScreenFileRow
          key={rowKey}
          closeLabel={copy.closeLabel}
          icon={<Video size={16} />}
          menuLabel={`${copy.videoOptions}${suffix}`}
          meta={
            video.data
              ? `${(video.data.durationMs / 1000).toFixed(1)}s`
              : undefined
          }
          name={video.data ? video.data.name : copy.screenAddVideo}
        >
          {video.data ? (
            <ScreenSettings
              accept={VIDEO_ACCEPT}
              copy={copy}
              fit={video.fit}
              onFitChange={video.onFitChange}
              onRemove={video.onRemove}
              onReplace={video.onUpload}
              removeLabel={copy.removeVideo}
              replaceLabel={copy.replaceVideo}
              replaceMeta={copy.screenVideoHint}
              uiTheme={uiTheme}
            />
          ) : (
            <UploadCard
              accept={VIDEO_ACCEPT}
              label={`${copy.uploadVideo}${suffix}`}
              meta={copy.screenVideoHint}
              onUpload={video.onUpload}
            />
          )}
        </ScreenFileRow>
      )}
    </>
  );
}

/**
 * O que o painel de aparência mostra: as cores prontas do aparelho e, numa
 * sub-aba que nasce fechada, as peças uma a uma. O estado da sub-aba mora
 * aqui, e não no Inspector: fechar o painel o descarta, e ele abre de novo
 * enxuto.
 */
function AppearanceSettings({
  colorKeys,
  colorLabels,
  copy,
  hasFinish,
  object,
  onThemeChange,
  onThemeColorChange,
  onToggleMatteFinish,
  themeOptions,
  uiTheme,
}: {
  colorKeys: string[];
  colorLabels: Record<string, string>;
  copy: AppCopy;
  /** O acabamento só existe onde muda o que se vê (`MODELS_WITH_FINISH`). */
  hasFinish: boolean;
  object: SceneObject;
  onThemeChange: (themeId: string) => void;
  onThemeColorChange: (part: string, hex: string) => void;
  onToggleMatteFinish: () => void;
  themeOptions: DeviceThemeOption[];
  uiTheme: UiTheme;
}) {
  const [tab, setTab] = useState<AppearanceTab | null>(null);
  const tabs: SubTabItem<AppearanceTab>[] = [
    {
      icon: <Pipette size={13} />,
      id: "custom",
      label: copy.appearanceTabCustom,
    },
  ];

  return (
    <>
      <div className="theme-grid">
        {themeOptions.map((theme) => (
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

      {hasFinish ? (
        <Switch
          checked={object.matteFinish}
          label={copy.matteFinishToggleLabel}
          onChange={onToggleMatteFinish}
        />
      ) : null}

      {colorKeys.length > 0 ? (
        <>
          <SubTabs
            ariaLabel={copy.appearanceTabsLabel}
            idPrefix="appearance-options"
            items={tabs}
            value={tab}
            onChange={setTab}
          />
          {tab === "custom" ? (
            <SubTabPanel activeId="custom" idPrefix="appearance-options">
              <div className="panel-card custom-theme-panel">
                {colorKeys.map((part) => (
                  <ColorRow
                    key={part}
                    label={colorLabels[part] ?? formatColorPartLabel(part)}
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
    </>
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
 * Uma linha com uma só ação — abrir um painel flutuante: ícone, nome
 * (reticências se não couber), um dado opcional e o "⋮". Como a única coisa
 * que a linha faz é abrir o painel, ela inteira é o botão; o "⋮" fica como
 * indício e como o caminho do teclado, que ativa a linha pelo clique que
 * sobe dele. (A linha da lista de objetos é diferente: tem o olho e o "⋮",
 * duas ações, e por isso cada uma tem o seu alvo.)
 *
 * Serve ao arquivo da tela (enviado ou ainda por enviar) e à cor do aparelho.
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
    <div
      ref={rowRef}
      className="screen-file-row screen-file-row-action"
      onClick={(event) => {
        // O painel está no React dentro da linha (num portal): o clique nele
        // sobe até aqui, e não pode contar como clique na linha.
        if (rowRef.current?.contains(event.target as Node)) {
          setIsOpen((current) => !current);
        }
      }}
    >
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
      <ResetButton
        disabled={disabled}
        label={label}
        size="small"
        onReset={onReset}
      />
    </div>
  );
}

/**
 * Ajuste do conteúdo na tela, tudo em %. A posição é medida no tamanho da
 * própria imagem: 50% anda meia largura (ou altura) dela, 100% uma inteira —
 * o bastante para tirá-la da tela, deixando o fundo à vista. Abaixo de 100%
 * de zoom o conteúdo fica menor que a tela e o resto é o fundo.
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
        min={-MAX_SCREEN_PAN * 100}
        max={MAX_SCREEN_PAN * 100}
      />
      <Control
        label={copy.screenFitY}
        value={Math.round(fit.panY * 100)}
        setValue={(value) => onChange({ panY: value / 100 })}
        min={-MAX_SCREEN_PAN * 100}
        max={MAX_SCREEN_PAN * 100}
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
