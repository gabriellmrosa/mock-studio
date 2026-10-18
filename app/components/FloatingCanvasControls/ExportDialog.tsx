"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Link } from "lucide-react";
import CustomSelect from "../CustomSelect/CustomSelect";
import Dialog from "../Dialog/Dialog";
import { Callout, Checkbox } from "../EditorPrimitives/EditorPrimitives";
import { copyPendingText, isSafari } from "../../lib/browser";
import type { AppCopy, Locale } from "../../lib/i18n";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  getVideoExportFormat,
  getVideoExportSize,
  type VideoExportSettings,
  type VideoFps,
  type VideoScale,
} from "../../lib/video-export";
import { canExportVideo } from "../MockupCanvas/export-video";

export type ExportKind = "image" | "video";

export type PhotoExportOption = {
  badge: string;
  height: number;
  id: string;
  width: number;
};

/** Só no Movimento: o vídeo, com as configurações dele. */
export type VideoExportDialogProps = {
  durationMs: number;
  frame: MotionFrame;
  onSettingsChange: (settings: VideoExportSettings) => void;
  settings: VideoExportSettings;
};

/**
 * O Exportar: um dialog em que primeiro se escolhe tudo — o que exportar, o
 * tamanho, o fundo — e só então se exporta, num botão só. Cada escolha é um
 * select, com o valor à vista; nada exporta no meio do caminho.
 *
 * No Estático é só imagem. No Movimento, o primeiro select troca entre
 * imagem e vídeo. "Salvar como template" vale para os dois.
 */
export default function ExportDialog({
  backgroundSwatch,
  copy,
  exportWithBg,
  isOpen,
  kind,
  locale,
  onCancel,
  onCreateProjectLink,
  onExport,
  onExportWithBgChange,
  onKindChange,
  onPhotoSizeChange,
  onSaveTemplateChange,
  photoOptions,
  photoSizeId,
  saveTemplate,
  video,
}: {
  /** Cor e borda do quadradinho "Com fundo". */
  backgroundSwatch: { background: string; border: string };
  copy: AppCopy;
  exportWithBg: boolean;
  isOpen: boolean;
  kind: ExportKind;
  locale: Locale;
  onCancel: () => void;
  /** A URL desta cena; liga o "Copiar link do projeto" do aviso do Safari. */
  onCreateProjectLink?: () => Promise<string>;
  /** Exporta o que está escolhido; quem chama já tem as escolhas. */
  onExport: () => void;
  onExportWithBgChange: (value: boolean) => void;
  onKindChange: (kind: ExportKind) => void;
  onPhotoSizeChange: (id: string) => void;
  onSaveTemplateChange: (value: boolean) => void;
  photoOptions: readonly PhotoExportOption[];
  photoSizeId: string;
  saveTemplate: boolean;
  video?: VideoExportDialogProps;
}) {
  const activeKind = video ? kind : "image";
  const [isVideoSupported, setIsVideoSupported] = useState(true);
  const hasMotion = (video?.durationMs ?? 0) > 0;
  const canExport =
    activeKind === "image" || (hasMotion && isVideoSupported);

  // O que o navegador codifica depende do formato e do tamanho: confere a
  // cada mudança, e o aviso só aparece quando não dá.
  const videoSettings = video?.settings;
  const videoFrame = video?.frame;

  useEffect(() => {
    if (!isOpen || activeKind !== "video" || !videoSettings || !videoFrame) {
      return;
    }

    let isCurrent = true;

    canExportVideo(
      videoSettings,
      getVideoExportSize(videoFrame, videoSettings.scale),
    )
      .then((supported) => isCurrent && setIsVideoSupported(supported))
      .catch(() => isCurrent && setIsVideoSupported(false));

    return () => {
      isCurrent = false;
    };
  }, [activeKind, isOpen, videoFrame, videoSettings]);

  const transparentSwatch = (
    <span className="export-swatch export-swatch-transparent" />
  );
  const colorSwatch = <span className="export-swatch" style={backgroundSwatch} />;

  return (
    <Dialog
      isOpen={isOpen}
      title={copy.takePhotoButton}
      className="export-dialog"
      cancelLabel={copy.dialogCancel}
      onCancel={onCancel}
      actions={[
        {
          disabled: !canExport,
          label: copy.takePhotoButton,
          onClick: onExport,
          variant: "primary",
        },
      ]}
      footerStart={
        <Checkbox
          checked={saveTemplate}
          label={copy.saveAsTemplate}
          onChange={onSaveTemplateChange}
        />
      }
    >
      {video ? (
        <Field label={copy.exportFormatLabel}>
          <CustomSelect
            ariaLabel={copy.exportFormatLabel}
            value={activeKind}
            onChange={(value) => onKindChange(value as ExportKind)}
            options={[
              { badgeLabel: "PNG", label: copy.exportTabImage, value: "image" },
              {
                badgeLabel: "MP4 · WebM",
                label: copy.exportTabVideo,
                value: "video",
              },
            ]}
          />
        </Field>
      ) : null}

      {activeKind === "image" ? (
        <>
          <Field label={copy.exportSizeLabel}>
            <CustomSelect
              ariaLabel={copy.exportSizeLabel}
              value={photoSizeId}
              onChange={onPhotoSizeChange}
              options={photoOptions.map((option) => ({
                badgeLabel: option.badge,
                label: `${option.width} × ${option.height}`,
                value: option.id,
              }))}
            />
          </Field>
          <Field label={copy.exportBackgroundLabel}>
            <CustomSelect
              ariaLabel={copy.exportBackgroundLabel}
              value={exportWithBg ? "with" : "without"}
              onChange={(value) => onExportWithBgChange(value === "with")}
              options={[
                {
                  icon: transparentSwatch,
                  label: copy.exportTransparent,
                  value: "without",
                },
                {
                  icon: colorSwatch,
                  label: copy.exportWithBackground,
                  value: "with",
                },
              ]}
            />
          </Field>
        </>
      ) : (
        <VideoFields
          colorSwatch={colorSwatch}
          copy={copy}
          hasMotion={hasMotion}
          isSupported={isVideoSupported}
          onCreateProjectLink={onCreateProjectLink}
          locale={locale}
          transparentSwatch={transparentSwatch}
          video={video!}
        />
      )}
    </Dialog>
  );
}

function VideoFields({
  colorSwatch,
  copy,
  hasMotion,
  isSupported,
  locale,
  onCreateProjectLink,
  transparentSwatch,
  video,
}: {
  colorSwatch: ReactNode;
  copy: AppCopy;
  hasMotion: boolean;
  isSupported: boolean;
  locale: Locale;
  onCreateProjectLink?: () => Promise<string>;
  transparentSwatch: ReactNode;
  video: VideoExportDialogProps;
}) {
  const { durationMs, frame, onSettingsChange, settings } = video;
  const size = getVideoExportSize(frame, settings.scale);
  const summary = [
    getVideoExportFormat(settings).toUpperCase(),
    `${size.width} × ${size.height}`,
    `${settings.fps} fps`,
    `${(durationMs / 1000).toLocaleString(locale, {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })} s`,
  ].join(" · ");

  function update(patch: Partial<VideoExportSettings>) {
    onSettingsChange({ ...settings, ...patch });
  }

  return (
    <>
      <Field label={copy.exportBackgroundLabel}>
        <CustomSelect
          ariaLabel={copy.exportBackgroundLabel}
          value={settings.background ? "with" : "without"}
          onChange={(value) => update({ background: value === "with" })}
          options={[
            {
              badgeLabel: "MP4",
              icon: colorSwatch,
              label: copy.exportWithBackground,
              value: "with",
            },
            {
              badgeLabel: "WebM",
              icon: transparentSwatch,
              label: copy.exportTransparent,
              value: "without",
            },
          ]}
        />
      </Field>
      <Field label={copy.videoExportFps}>
        <CustomSelect
          ariaLabel={copy.videoExportFps}
          value={String(settings.fps)}
          onChange={(value) => update({ fps: Number(value) as VideoFps })}
          options={[
            { label: "30 fps", value: "30" },
            { label: "60 fps", value: "60" },
          ]}
        />
      </Field>
      <Field label={copy.videoExportResolution}>
        <CustomSelect
          ariaLabel={copy.videoExportResolution}
          value={String(settings.scale)}
          onChange={(value) => update({ scale: Number(value) as VideoScale })}
          options={([1, 2] as const).map((scale) => {
            const scaled = getVideoExportSize(frame, scale);

            return {
              badgeLabel: `${scale}×`,
              label: `${scaled.width} × ${scaled.height}`,
              value: String(scale),
            };
          })}
        />
      </Field>

      <p className="export-dialog-note">
        {hasMotion ? summary : copy.videoExportUnavailable}
      </p>
      {isSupported ? null : (
        <p className="export-dialog-note export-dialog-warning" role="alert">
          {copy.videoExportUnsupported}
        </p>
      )}
      {/* Só sem fundo: com fundo sai MP4, que o Safari mostra bem. */}
      {!settings.background && isSafari(navigator.userAgent) ? (
        <Callout
          action={
            onCreateProjectLink ? (
              <ProjectLinkButton copy={copy} onCreate={onCreateProjectLink} />
            ) : null
          }
        >
          {copy.videoExportSafariTransparent}
        </Callout>
      ) : null}
    </>
  );
}

/**
 * Copia o link desta cena para abrir em outro navegador. O rótulo confirma a
 * cópia por um instante, no próprio botão: um aviso no canto da tela ficaria
 * atrás da máscara do dialog.
 */
function ProjectLinkButton({
  copy,
  onCreate,
}: {
  copy: AppCopy;
  onCreate: () => Promise<string>;
}) {
  const [status, setStatus] = useState<"copied" | "error" | "idle">("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setStatus("idle"), 2500);

    return () => window.clearTimeout(timeout);
  }, [status]);

  return (
    <button
      type="button"
      className="editor-callout-action"
      aria-live="polite"
      onClick={() => {
        copyPendingText(onCreate())
          .then(() => setStatus("copied"))
          .catch(() => setStatus("error"));
      }}
    >
      {status === "copied" ? <Check size={13} aria-hidden /> : <Link size={13} aria-hidden />}
      {status === "copied"
        ? copy.projectLinkCopied
        : status === "error"
          ? copy.projectLinkCopyError
          : copy.projectLinkCopy}
    </button>
  );
}

/** Uma escolha do dialog: o rótulo à esquerda, o select à direita. */
function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="export-dialog-field">
      <span className="export-dialog-label">{label}</span>
      <div className="export-dialog-control">
        {children}
      </div>
    </div>
  );
}
