"use client";

import Dialog from "../Dialog/Dialog";
import type { AppCopy, Locale } from "../../lib/i18n";

export type VideoExportProgress = {
  done: number;
  /** Estimativa pelo ritmo até aqui; `null` enquanto ainda não dá para dizer. */
  remainingMs: number | null;
  total: number;
};

/** "45 segundos", "3 minutos": de 5 em 5 s abaixo de um minuto, depois em minutos. */
function formatRemaining(ms: number, locale: Locale) {
  const seconds = ms / 1000;

  if (seconds < 60) {
    return new Intl.NumberFormat(locale, {
      style: "unit",
      unit: "second",
      unitDisplay: "long",
    }).format(Math.max(5, Math.ceil(seconds / 5) * 5));
  }

  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "minute",
    unitDisplay: "long",
  }).format(Math.ceil(seconds / 60));
}

/**
 * O progresso da exportação de vídeo, num dialog central: a cena e os painéis
 * ficam atrás da máscara, porque mexer em qualquer coisa agora mudaria o
 * arquivo. Uma barra, o quadro em que está, o tempo que falta e o que esperar
 * do fim.
 *
 * Não fecha com Esc nem clique fora: só Cancelar interrompe, para um toque
 * sem querer não jogar fora minutos de exportação.
 */
export default function ExportProgressDialog({
  copy,
  locale,
  onCancel,
  progress,
}: {
  copy: AppCopy;
  locale: Locale;
  onCancel: () => void;
  progress: VideoExportProgress | null;
}) {
  const done = progress?.done ?? 0;
  const total = progress?.total ?? 1;
  const percent = Math.min(100, Math.round((done / total) * 100));
  const isFinishing = done >= total;
  const status = isFinishing
    ? copy.videoExportFinishing
    : progress?.remainingMs != null
      ? copy.videoExportRemaining.replace(
          "{time}",
          formatRemaining(progress.remainingMs, locale),
        )
      : copy.videoExportEstimating;

  return (
    <Dialog
      isOpen={progress !== null}
      title={copy.videoExportProgressTitle}
      className="export-progress-dialog"
      cancelLabel={copy.videoExportCancel}
      dismissible={false}
      actions={[]}
      onCancel={onCancel}
    >
      <div className="export-progress">
        <div
          className="export-progress-track"
          role="progressbar"
          aria-label={copy.videoExportProgressTitle}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="export-progress-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="export-progress-row">
          <span>
            {copy.videoExportProgress
              .replace("{done}", done.toLocaleString(locale))
              .replace("{total}", total.toLocaleString(locale))}
          </span>
          <span>{percent}%</span>
        </div>
      </div>
      <div className="export-progress-copy" aria-live="polite">
        <p className="export-progress-status">{status}</p>
        <p className="export-dialog-note">{copy.videoExportHint}</p>
      </div>
    </Dialog>
  );
}
