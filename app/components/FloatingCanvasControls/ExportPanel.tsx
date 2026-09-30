"use client";

import { useEffect, useState } from "react";
import { Check, Download, SlidersHorizontal } from "lucide-react";
import {
  Checkbox,
  SegmentedTabs,
  SubTabPanel,
  SubTabs,
} from "../EditorPrimitives/EditorPrimitives";
import { useCloseContextMenu } from "../ContextMenu/ContextMenu";
import type { AppCopy, Locale } from "../../lib/i18n";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  VIDEO_EXPORT_PRESETS,
  findVideoExportPreset,
  getVideoExportFormat,
  getVideoExportSize,
  type VideoExportSettings,
  type VideoFps,
  type VideoScale,
} from "../../lib/video-export";
import { canExportVideo } from "../MockupCanvas/export-video";

export type ExportTab = "image" | "video";

export type PhotoExportOption = {
  height: number;
  id: string;
  label: string;
  width: number;
};

/** Só no Movimento: o vídeo tem as configurações dele numa aba própria. */
export type VideoExportPanelProps = {
  durationMs: number;
  frame: MotionFrame;
  onExport: (settings: VideoExportSettings) => void;
  onSettingsChange: (settings: VideoExportSettings) => void;
  settings: VideoExportSettings;
};

/**
 * Conteúdo do menu Exportar. No Estático é só a imagem; no Movimento, duas
 * abas — Imagem e Vídeo —, cada uma com as suas opções e as linhas que
 * exportam. "Salvar como template" vale para as duas.
 */
export default function ExportPanel({
  backgroundSwatch,
  copy,
  exportWithBg,
  locale,
  onExportPhoto,
  onExportWithBgChange,
  onSaveTemplateChange,
  onTabChange,
  photoOptions,
  saveTemplate,
  tab,
  video,
}: {
  /** Cor e borda do quadradinho "Com fundo". */
  backgroundSwatch: { background: string; border: string };
  copy: AppCopy;
  exportWithBg: boolean;
  locale: Locale;
  onExportPhoto: (option: PhotoExportOption) => void;
  onExportWithBgChange: (value: boolean) => void;
  onSaveTemplateChange: (value: boolean) => void;
  onTabChange: (tab: ExportTab) => void;
  photoOptions: readonly PhotoExportOption[];
  saveTemplate: boolean;
  tab: ExportTab;
  video?: VideoExportPanelProps;
}) {
  const close = useCloseContextMenu();
  const activeTab = video ? tab : "image";
  const templateCheckbox = (
    <div className="export-panel-template">
      <Checkbox
        checked={saveTemplate}
        label={copy.saveAsTemplate}
        onChange={onSaveTemplateChange}
      />
    </div>
  );

  return (
    <div className="export-panel">
      {video ? (
        <SegmentedTabs
          ariaLabel={copy.takePhotoButton}
          idPrefix="export"
          items={[
            { icon: null, id: "image", label: copy.exportTabImage },
            { icon: null, id: "video", label: copy.exportTabVideo },
          ]}
          value={activeTab}
          onChange={onTabChange}
        />
      ) : null}

      {activeTab === "image" ? (
        <div className="export-panel-body">
          <OptionList label={copy.exportBackgroundLabel}>
            <OptionRow
              checked={!exportWithBg}
              label={copy.exportTransparent}
              leading={<span className="export-swatch export-swatch-transparent" />}
              onSelect={() => onExportWithBgChange(false)}
            />
            <OptionRow
              checked={exportWithBg}
              label={copy.exportWithBackground}
              leading={<span className="export-swatch" style={backgroundSwatch} />}
              onSelect={() => onExportWithBgChange(true)}
            />
          </OptionList>

          {templateCheckbox}

          <div className="export-panel-actions">
            {photoOptions.map((option) => (
              <ExportRow
                key={option.id}
                label={option.label}
                onClick={() => {
                  onExportPhoto(option);
                  close();
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <VideoTab
          close={close}
          copy={copy}
          locale={locale}
          templateCheckbox={templateCheckbox}
          video={video!}
        />
      )}
    </div>
  );
}

function VideoTab({
  close,
  copy,
  locale,
  templateCheckbox,
  video,
}: {
  close: () => void;
  copy: AppCopy;
  locale: Locale;
  templateCheckbox: React.ReactNode;
  video: VideoExportPanelProps;
}) {
  const { durationMs, frame, onExport, onSettingsChange, settings } = video;
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const activePreset = findVideoExportPreset(settings);
  const size = getVideoExportSize(frame, settings.scale);
  const hasMotion = durationMs > 0;
  const summary = [
    getVideoExportFormat(settings).toUpperCase(),
    `${size.width} × ${size.height}`,
    `${settings.fps} fps`,
    `${(durationMs / 1000).toLocaleString(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })} s`,
  ].join(" · ");

  // O que o navegador codifica depende do formato e do tamanho: confere a
  // cada mudança, e o aviso só aparece quando não dá.
  useEffect(() => {
    let isCurrent = true;

    canExportVideo(settings, getVideoExportSize(frame, settings.scale))
      .then((supported) => isCurrent && setIsSupported(supported))
      .catch(() => isCurrent && setIsSupported(false));

    return () => {
      isCurrent = false;
    };
  }, [frame, settings]);

  function update(patch: Partial<VideoExportSettings>) {
    onSettingsChange({ ...settings, ...patch });
  }

  return (
    <div className="export-panel-body">
      <OptionList label={copy.videoExportDestination}>
        {VIDEO_EXPORT_PRESETS.map((preset) => (
          <OptionRow
            key={preset.id}
            checked={activePreset === preset.id}
            hint={copy.videoExportPresets[preset.id].hint}
            label={copy.videoExportPresets[preset.id].title}
            onSelect={() => onSettingsChange(preset.settings)}
          />
        ))}
      </OptionList>

      <div>
        <SubTabs
          ariaLabel={copy.videoExportCustomize}
          idPrefix="export-video"
          items={[
            {
              icon: <SlidersHorizontal size={13} />,
              id: "custom",
              label: copy.videoExportCustomize,
            },
          ]}
          value={isCustomOpen ? "custom" : null}
          onChange={(id) => setIsCustomOpen(id === "custom")}
        />
        {isCustomOpen ? (
          <SubTabPanel activeId="custom" idPrefix="export-video">
            <div className="export-panel-custom">
              <SettingRow label={copy.exportBackgroundLabel}>
                <SegmentedTabs
                  ariaLabel={copy.exportBackgroundLabel}
                  items={[
                    { icon: null, id: "with", label: copy.exportWithBackground },
                    { icon: null, id: "without", label: copy.exportTransparent },
                  ]}
                  value={settings.background ? "with" : "without"}
                  onChange={(id) => update({ background: id === "with" })}
                />
              </SettingRow>
              <SettingRow label={copy.videoExportFps}>
                <SegmentedTabs
                  ariaLabel={copy.videoExportFps}
                  items={[
                    { icon: null, id: "30", label: "30" },
                    { icon: null, id: "60", label: "60" },
                  ]}
                  value={String(settings.fps) as "30" | "60"}
                  onChange={(id) => update({ fps: Number(id) as VideoFps })}
                />
              </SettingRow>
              <SettingRow label={copy.videoExportResolution}>
                <SegmentedTabs
                  ariaLabel={copy.videoExportResolution}
                  items={[
                    { icon: null, id: "1", label: "1×" },
                    { icon: null, id: "2", label: "2×" },
                  ]}
                  value={String(settings.scale) as "1" | "2"}
                  onChange={(id) => update({ scale: Number(id) as VideoScale })}
                />
              </SettingRow>
            </div>
          </SubTabPanel>
        ) : null}
      </div>

      <p className="export-panel-note">
        {hasMotion ? summary : copy.videoExportUnavailable}
      </p>
      {isSupported ? null : (
        <p className="export-panel-note export-panel-warning" role="alert">
          {copy.videoExportUnsupported}
        </p>
      )}

      {templateCheckbox}

      <div className="export-panel-actions">
        <ExportRow
          disabled={!hasMotion || !isSupported}
          label={copy.videoExportSubmit}
          onClick={() => {
            onExport(settings);
            close();
          }}
        />
      </div>
    </div>
  );
}

function OptionList({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="export-bg-toggle">
      <span className="export-bg-toggle-label">{label}</span>
      <div className="export-bg-seg" role="radiogroup" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

/** Uma escolha exclusiva da lista, com o check à direita, como no fundo. */
function OptionRow({
  checked,
  hint,
  label,
  leading,
  onSelect,
}: {
  checked: boolean;
  hint?: string;
  label: string;
  leading?: React.ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={`export-bg-seg-btn${checked ? " is-active" : ""}`}
      onClick={onSelect}
    >
      {leading}
      <span className="export-bg-seg-label">
        {label}
        {hint ? <span className="export-option-hint">{hint}</span> : null}
      </span>
      {checked ? <Check size={13} className="export-bg-seg-check" /> : null}
    </button>
  );
}

function SettingRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="export-panel-setting">
      <span className="export-panel-note">{label}</span>
      {children}
    </div>
  );
}

/** A linha que exporta: mesma cara dos itens de menu, com o ícone de baixar. */
function ExportRow({
  disabled = false,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`context-menu-row${disabled ? " context-menu-row-disabled" : ""}`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span className="context-menu-row-label">{label}</span>
      <span className="context-menu-row-meta">
        <span className="context-menu-row-icon">
          <Download size={14} />
        </span>
      </span>
    </button>
  );
}
