"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { AppCopy } from "../../lib/i18n";
import {
  getActiveScreenVideos,
  isAudioObject,
  type SceneObject,
} from "../../lib/scene-objects";

/** Passo das setas do teclado, em px. */
const KEYBOARD_STEP = 16;
/** Teto da altura automática: mostra as faixas sem esmagar o palco. */
export const AUTO_TIMELINE_MAX_VIEWPORT_FRACTION = 0.35;
/** A timeline nunca passa da metade da janela: o canvas não pode sumir. */
export const MAX_TIMELINE_VIEWPORT_FRACTION = 0.5;
/**
 * Medidas verticais da `.motion-timeline` (ver `MotionTimeline.css` e
 * `tokens.css`):
 * - `border-top`: 1px
 * - `padding-block`: 2 × `--space-3` (1.5rem)
 * - cabeçalho (`.editor-fab`): `--canvas-fab-size` (2.25rem)
 * - gap entre cabeçalho e corpo: `--space-2` (0.5rem)
 * - régua: 1rem
 * Total fixo: 5.25rem + 1px. Cada faixa soma altura (1.5rem) + gap (0.25rem) =
 * 1.75rem.
 */
const TIMELINE_BORDER_PX = 1;
const TIMELINE_CHROME_REM = 5.25;
const TIMELINE_TRACK_REM = 1.75;
/** Piso em faixas: mesmo vazia ou encolhida à mão, cabem cabeçalho, régua e 2 faixas. */
export const MIN_TIMELINE_TRACKS = 2;

function readRootFontSize() {
  const size = parseFloat(getComputedStyle(document.documentElement).fontSize);

  return Number.isFinite(size) && size > 0 ? size : 16;
}

/**
 * Conta quantas faixas a `MotionTimeline` desenha para a cena atual: cada
 * objeto visível (e a música, mesmo muda) ocupa uma faixa, mais uma subfaixa
 * por vídeo de tela ativo (no Duo podem ser duas).
 */
export function countTimelineTracks(objects: readonly SceneObject[]) {
  let count = 0;

  for (const object of objects) {
    if (!object.isVisible && !isAudioObject(object)) {
      continue;
    }

    count += 1 + getActiveScreenVideos(object).length;
  }

  return count;
}

function getTimelineHeightRem(trackCount: number) {
  const tracks = Math.max(MIN_TIMELINE_TRACKS, trackCount);

  return TIMELINE_CHROME_REM + tracks * TIMELINE_TRACK_REM;
}

function getTimelineHeightPx(trackCount: number, rootFontSize: number) {
  return Math.round(getTimelineHeightRem(trackCount) * rootFontSize + TIMELINE_BORDER_PX);
}

/** Menor altura permitida para a timeline, em px (cabeçalho, régua e 2 faixas). */
export function getMinTimelineHeight(rootFontSize = readRootFontSize()) {
  return getTimelineHeightPx(MIN_TIMELINE_TRACKS, rootFontSize);
}

/**
 * Altura automática da timeline em px para `trackCount` faixas, limitada a
 * `35vh` (mas nunca abaixo do mínimo de 2 faixas).
 */
export function getAutoTimelineHeight(
  trackCount: number,
  viewportHeight = window.innerHeight,
  rootFontSize = readRootFontSize(),
) {
  const min = getMinTimelineHeight(rootFontSize);
  const fit = getTimelineHeightPx(trackCount, rootFontSize);
  const max = Math.max(min, viewportHeight * AUTO_TIMELINE_MAX_VIEWPORT_FRACTION);

  return Math.round(Math.min(max, Math.max(min, fit)));
}

/**
 * Expressão CSS da altura automática: usa `rem` e `vh` direto, então funciona
 * na hidratação sem medir janela e acompanha redimensionamentos ao vivo.
 */
export function getAutoTimelineHeightCss(trackCount: number) {
  const minRem = getTimelineHeightRem(MIN_TIMELINE_TRACKS);
  const fitRem = getTimelineHeightRem(trackCount);
  const maxVh = Math.round(AUTO_TIMELINE_MAX_VIEWPORT_FRACTION * 100);

  return `clamp(calc(${minRem}rem + ${TIMELINE_BORDER_PX}px), calc(${fitRem}rem + ${TIMELINE_BORDER_PX}px), ${maxVh}vh)`;
}

/** Expressão CSS da altura escolhida manualmente, presa entre o mínimo e 50vh. */
export function getManualTimelineHeightCss(height: number) {
  const minRem = getTimelineHeightRem(MIN_TIMELINE_TRACKS);
  const maxVh = Math.round(MAX_TIMELINE_VIEWPORT_FRACTION * 100);

  return `clamp(calc(${minRem}rem + ${TIMELINE_BORDER_PX}px), ${Math.round(height)}px, ${maxVh}vh)`;
}

export function clampTimelineHeight(
  height: number,
  viewportHeight = window.innerHeight,
  rootFontSize = readRootFontSize(),
) {
  const min = getMinTimelineHeight(rootFontSize);
  const max = Math.max(min, viewportHeight * MAX_TIMELINE_VIEWPORT_FRACTION);

  return Math.round(Math.min(max, Math.max(min, height)));
}

/**
 * Alça na borda de cima da timeline, como nos editores de vídeo: arrastar
 * muda a altura na sessão atual, as setas também, e o clique duplo (ou Home)
 * volta ao ajuste automático (`null`). É um separador redimensionável
 * (`role="separator"` com foco), que é como leitores de tela entendem esse
 * controle.
 */
export default function TimelineResizeHandle({
  copy,
  height,
  onChange,
  trackCount,
}: {
  copy: AppCopy;
  /** A altura escolhida na sessão, ou `null` para o ajuste automático. */
  height: number | null;
  onChange: (height: number | null) => void;
  /** Quantas faixas a timeline mostra agora, para o cálculo automático. */
  trackCount: number;
}) {
  const dragRef = useRef<{ startHeight: number; startY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Só renderiza no cliente (Movimento aberto): o documento já existe.
  const resolveCurrentHeight = () =>
    height !== null
      ? clampTimelineHeight(height)
      : getAutoTimelineHeight(trackCount);
  const current = resolveCurrentHeight();

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragRef.current = { startHeight: resolveCurrentHeight(), startY: event.clientY };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    // A alça está em cima: subir o cursor aumenta a timeline.
    onChange(clampTimelineHeight(drag.startHeight + drag.startY - event.clientY));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta =
      event.key === "ArrowUp"
        ? KEYBOARD_STEP
        : event.key === "ArrowDown"
          ? -KEYBOARD_STEP
          : null;

    if (event.key === "Home") {
      event.preventDefault();
      onChange(null);
      return;
    }

    if (delta === null) {
      return;
    }

    event.preventDefault();
    onChange(clampTimelineHeight(resolveCurrentHeight() + delta));
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={copy.timelineResizeLabel}
      aria-valuenow={Math.round(current)}
      tabIndex={0}
      title={copy.timelineResizeHint}
      className={`timeline-resize-handle${isDragging ? " is-dragging" : ""}`}
      onDoubleClick={() => onChange(null)}
      onKeyDown={handleKeyDown}
      onPointerCancel={endDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
    />
  );
}
