"use client";

import { useRef, useState } from "react";
import { Check, Link2, Link2Off, Proportions } from "lucide-react";
import { IconButton } from "../EditorPrimitives/EditorPrimitives";
import TimelineMenu from "./TimelineMenu";
import type { AppCopy, Locale } from "../../lib/i18n";
import {
  findMotionFramePreset,
  formatMotionFrameRatio,
  MOTION_FRAME_MAX,
  MOTION_FRAME_MIN,
  MOTION_FRAME_PRESETS,
  resizeMotionFrame,
  type MotionFrame,
} from "../../lib/motion-frame";

/**
 * Tamanho do vídeo, no cabeçalho da timeline: um botão com as medidas atuais
 * que abre um painel com os atalhos de proporção e a largura e a altura em
 * pixels. Digitar as medidas já define a proporção; o cadeado, desligado por
 * padrão, faz um lado acompanhar o outro.
 */
export default function MotionFrameControl({
  copy,
  frame,
  locale,
  onChange,
}: {
  copy: AppCopy;
  frame: MotionFrame;
  locale: Locale;
  onChange: (frame: MotionFrame) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [keepRatio, setKeepRatio] = useState(false);
  const activePreset = findMotionFramePreset(frame);
  const size = `${frame.width} × ${frame.height}`;

  function toggle() {
    const rect = triggerRef.current?.getBoundingClientRect();

    // Abre para cima, alinhado à direita do botão: a timeline fica no rodapé
    // e o botão, no canto direito dela.
    setAnchor(anchor || !rect ? null : { x: rect.right, y: rect.top });
  }

  function close() {
    setAnchor(null);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="motion-frame-trigger"
        aria-expanded={anchor !== null}
        aria-haspopup="dialog"
        aria-label={`${copy.motionFrameLabel}: ${size}`}
        title={copy.motionFrameLabel}
        onClick={toggle}
        // O painel fecha com um mousedown fora dele. Sem isto, clicar no botão
        // para fechar fecharia no mousedown e reabriria no click.
        onMouseDown={(event) => event.nativeEvent.stopPropagation()}
      >
        <Proportions size={13} />
        {size}
      </button>

      {anchor ? (
        <TimelineMenu
          align="end"
          ariaLabel={copy.motionFrameLabel}
          className="is-panel"
          role="dialog"
          x={anchor.x}
          y={anchor.y - 8}
          onClose={close}
        >
          <p className="context-menu-header motion-timeline-menu-title">
            {copy.motionFrameLabel}
          </p>
          {MOTION_FRAME_PRESETS.map((preset) => {
            const isActive = activePreset === preset;

            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={isActive}
                className="context-menu-row"
                onClick={() => onChange({ height: preset.height, width: preset.width })}
              >
                <span className="context-menu-row-label">{preset.label}</span>
                <span className="context-menu-row-meta motion-frame-preset-size">
                  {`${preset.width} × ${preset.height}`}
                  {isActive ? (
                    <Check size={12} className="context-menu-check" />
                  ) : (
                    <span className="motion-frame-check-space" />
                  )}
                </span>
              </button>
            );
          })}

          <div className="motion-frame-fields">
            <FrameSideInput
              label={copy.motionFrameWidth}
              value={frame.width}
              onCommit={(value) =>
                onChange(resizeMotionFrame(frame, "width", value, keepRatio))
              }
            />
            <IconButton
              active={keepRatio}
              aria-label={copy.motionFrameKeepRatio}
              aria-pressed={keepRatio}
              className="motion-frame-lock"
              title={copy.motionFrameKeepRatio}
              onClick={() => setKeepRatio((current) => !current)}
            >
              {keepRatio ? <Link2 size={13} /> : <Link2Off size={13} />}
            </IconButton>
            <FrameSideInput
              label={copy.motionFrameHeight}
              value={frame.height}
              onCommit={(value) =>
                onChange(resizeMotionFrame(frame, "height", value, keepRatio))
              }
            />
          </div>
          <p className="motion-frame-ratio">
            {`${copy.motionFrameRatio} ${formatMotionFrameRatio(frame, locale)}`}
          </p>
        </TimelineMenu>
      ) : null}
    </>
  );
}

/**
 * Um lado em pixels. Guarda o que se digita e só aplica no Enter ou ao sair
 * do campo: aplicar a cada tecla faria "648" passar por 6 e 64, arredondados
 * e travados no mínimo, antes de chegar lá.
 */
function FrameSideInput({
  label,
  onCommit,
  value,
}: {
  label: string;
  onCommit: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft !== null && draft.trim() !== "") {
      onCommit(Number(draft));
    }

    setDraft(null);
  }

  return (
    <label className="motion-frame-field">
      <span className="motion-frame-field-label">{label}</span>
      <input
        className="editor-input"
        type="number"
        inputMode="numeric"
        min={MOTION_FRAME_MIN}
        max={MOTION_FRAME_MAX}
        step={2}
        value={draft ?? value}
        onBlur={commit}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}
