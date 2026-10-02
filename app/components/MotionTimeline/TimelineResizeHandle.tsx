"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { AppCopy } from "../../lib/i18n";

/** Passo das setas do teclado, em px. */
const KEYBOARD_STEP = 16;
/** A timeline nunca passa da metade da janela: o canvas não pode sumir. */
const MAX_VIEWPORT_FRACTION = 0.5;

/**
 * Altura padrão da timeline, em px: o token `--motion-timeline-height` de
 * :root (o palco do canvas o sobrescreve com a altura escolhida). É também a
 * mínima — abaixo dela o cabeçalho e uma trilha deixam de caber.
 */
export function readDefaultTimelineHeight() {
  const root = document.documentElement;
  const value = getComputedStyle(root)
    .getPropertyValue("--motion-timeline-height")
    .trim();
  const amount = parseFloat(value);

  if (value.endsWith("rem")) {
    return amount * parseFloat(getComputedStyle(root).fontSize);
  }

  return amount;
}

export function clampTimelineHeight(height: number) {
  const min = readDefaultTimelineHeight();
  const max = Math.max(min, window.innerHeight * MAX_VIEWPORT_FRACTION);

  return Math.round(Math.min(max, Math.max(min, height)));
}

/**
 * Alça na borda de cima da timeline, como nos editores de vídeo: arrastar
 * muda a altura, as setas também, e o clique duplo volta ao padrão (`null`).
 * É um separador redimensionável (`role="separator"` com foco), que é como
 * leitores de tela entendem esse controle.
 */
export default function TimelineResizeHandle({
  copy,
  height,
  onChange,
}: {
  copy: AppCopy;
  /** A altura escolhida, ou `null` para a padrão. */
  height: number | null;
  onChange: (height: number | null) => void;
}) {
  const dragRef = useRef<{ startHeight: number; startY: number } | null>(null);
  // Só renderiza no cliente (Movimento aberto): o documento já existe.
  const current = height ?? readDefaultTimelineHeight();

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startHeight: current, startY: event.clientY };
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
    onChange(clampTimelineHeight(current + delta));
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={copy.timelineResizeLabel}
      aria-valuenow={Math.round(current)}
      tabIndex={0}
      title={copy.timelineResizeHint}
      className="timeline-resize-handle"
      onDoubleClick={() => onChange(null)}
      onKeyDown={handleKeyDown}
      onPointerCancel={endDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
    />
  );
}
