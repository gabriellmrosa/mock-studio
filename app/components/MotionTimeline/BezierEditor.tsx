"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { AppCopy } from "../../lib/i18n";
import {
  BEZIER_Y_RANGE,
  DEFAULT_BEZIER,
  clampBezier,
  type CubicBezier,
} from "../../lib/scene-motion";

// Geometria do gráfico em unidades do viewBox. O quadrado unitário (tempo e
// progresso de 0 a 1) fica no meio; acima e abaixo sobra espaço para as alças
// de overshoot, até os limites de BEZIER_Y_RANGE.
const WIDTH = 168;
const UNIT_HEIGHT = 112;
const [MIN_Y, MAX_Y] = BEZIER_Y_RANGE;
const HEIGHT = (MAX_Y - MIN_Y) * UNIT_HEIGHT;
const PAD = 8;

function toSvg(x: number, y: number): [number, number] {
  return [x * WIDTH, (MAX_Y - y) * UNIT_HEIGHT];
}

const AXIS_LABELS = ["x1", "y1", "x2", "y2"] as const;

type BezierEditorProps = {
  copy: AppCopy;
  onChange: (bezier: CubicBezier) => void;
  onDone: () => void;
  value: CubicBezier;
};

/**
 * Editor de curva no estilo do DevTools: arrastar as duas alças ou digitar os
 * quatro números. Cada mudança já é aplicada ao keyframe, para ajustar e dar
 * play sem fechar o painel.
 */
export default function BezierEditor({
  copy,
  onChange,
  onDone,
  value,
}: BezierEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef<0 | 1 | null>(null);
  const [x1, y1, x2, y2] = value;

  const [startX, startY] = toSvg(0, 0);
  const [endX, endY] = toSvg(1, 1);
  const [c1x, c1y] = toSvg(x1, y1);
  const [c2x, c2y] = toSvg(x2, y2);

  function pointFromEvent(event: ReactPointerEvent<SVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();

    if (!rect) {
      return null;
    }

    // O viewBox tem PAD em volta; converte do pixel para as unidades dele.
    const scaleX = (WIDTH + PAD * 2) / rect.width;
    const scaleY = (HEIGHT + PAD * 2) / rect.height;
    const svgX = (event.clientX - rect.left) * scaleX - PAD;
    const svgY = (event.clientY - rect.top) * scaleY - PAD;

    return {
      x: svgX / WIDTH,
      y: MAX_Y - svgY / UNIT_HEIGHT,
    };
  }

  function round(number: number) {
    return Math.round(number * 100) / 100;
  }

  function handlePointerDown(
    handle: 0 | 1,
    event: ReactPointerEvent<SVGCircleElement>,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = handle;
  }

  function handlePointerMove(event: ReactPointerEvent<SVGCircleElement>) {
    const handle = draggingRef.current;
    const point = handle === null ? null : pointFromEvent(event);

    if (handle === null || !point) {
      return;
    }

    const next: CubicBezier = [...value];

    next[handle * 2] = round(point.x);
    next[handle * 2 + 1] = round(point.y);
    onChange(clampBezier(next));
  }

  function handlePointerUp() {
    draggingRef.current = null;
  }

  function handleInput(index: number, raw: string) {
    const number = Number(raw);

    if (raw === "" || Number.isNaN(number)) {
      return;
    }

    const next: CubicBezier = [...value];

    next[index] = number;
    onChange(clampBezier(next));
  }

  return (
    <div className="bezier-editor">
      <p className="context-menu-header motion-timeline-menu-title">
        {copy.motionBezierTitle}
      </p>

      <svg
        ref={svgRef}
        className="bezier-editor-graph"
        viewBox={`${-PAD} ${-PAD} ${WIDTH + PAD * 2} ${HEIGHT + PAD * 2}`}
        role="img"
        aria-label={`cubic-bezier(${value.join(", ")})`}
      >
        <rect
          className="bezier-editor-unit"
          x={startX}
          y={endY}
          width={endX - startX}
          height={startY - endY}
        />
        <line
          className="bezier-editor-linear"
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
        />
        <line
          className="bezier-editor-arm"
          x1={startX}
          y1={startY}
          x2={c1x}
          y2={c1y}
        />
        <line
          className="bezier-editor-arm"
          x1={endX}
          y1={endY}
          x2={c2x}
          y2={c2y}
        />
        <path
          className="bezier-editor-curve"
          d={`M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`}
        />
        {([
          [c1x, c1y],
          [c2x, c2y],
        ] as const).map(([cx, cy], handle) => (
          <circle
            key={handle}
            className="bezier-editor-handle"
            cx={cx}
            cy={cy}
            r={6}
            onPointerDown={(event) => handlePointerDown(handle as 0 | 1, event)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        ))}
      </svg>

      <div className="bezier-editor-values">
        {AXIS_LABELS.map((label, index) => (
          <label key={label} className="bezier-editor-field">
            <span>{label}</span>
            <input
              type="number"
              className="editor-input bezier-editor-input"
              aria-label={label}
              step={0.01}
              min={index % 2 === 0 ? 0 : MIN_Y}
              max={index % 2 === 0 ? 1 : MAX_Y}
              value={value[index]}
              onChange={(event) => handleInput(index, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="bezier-editor-actions">
        <button
          type="button"
          className="editor-button-outline"
          onClick={() => onChange([...DEFAULT_BEZIER])}
        >
          {copy.motionBezierReset}
        </button>
        <button type="button" className="editor-button-outline" onClick={onDone}>
          {copy.motionBezierDone}
        </button>
      </div>
    </div>
  );
}
