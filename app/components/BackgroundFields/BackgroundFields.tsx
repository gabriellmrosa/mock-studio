"use client";

import "./BackgroundFields.css";
import { Blend, Grid3x3, RotateCw, Square } from "lucide-react";
import {
  DEFAULT_GRADIENT_ANGLE,
  getDefaultGradientColor,
  type BackgroundPose,
  type BackgroundPosePatch,
  type CanvasBackgroundStyle,
} from "../../lib/canvas-background";
import {
  DEFAULT_CANVAS_GRID,
  getGridLineColors,
  isDefaultCanvasGrid,
} from "../../lib/canvas-grid";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import ColorRow from "../ColorRow/ColorRow";
import {
  ResetButton,
  SegmentedTabs,
  Switch,
} from "../EditorPrimitives/EditorPrimitives";
import NumberField from "../NumberField/NumberField";

/** O que os campos editam, e como gravar uma mudança. */
export type BackgroundEditor = {
  onChange: (patch: BackgroundPosePatch) => void;
  value: BackgroundPose;
};

/**
 * Os campos de um fundo: o estilo (chão 3D ou liso), a cor, o degradê (só no
 * liso) e a grade (só no chão). Os mesmos no painel do botão Fundo e grade e
 * no Inspector com o Fundo selecionado; quem usa decide o que eles editam — o
 * fundo da cena ou um keyframe do Fundo.
 */
export default function BackgroundFields({
  copy,
  onChange,
  title,
  uiTheme,
  value,
}: {
  copy: AppCopy;
  /** Muda só o que veio no patch, a partir do fundo de agora. */
  onChange: (patch: BackgroundPosePatch) => void;
  /** O título do grupo do fundo; sem ele, quem envolve já tem o seu. */
  title?: string;
  uiTheme: UiTheme;
  value: BackgroundPose;
}) {
  const gradient = value.style === "flat" ? value.gradient : null;
  // A cor que a grade tem quando é automática: é o que o seletor mostra.
  const autoGridColor = getGridLineColors(value.color, DEFAULT_CANVAS_GRID).section;

  return (
    <div className="background-fields">
      <section className="background-fields-section">
        {title ? <h3 className="background-fields-title">{title}</h3> : null}
        <SegmentedTabs<CanvasBackgroundStyle>
          ariaLabel={copy.canvasBackgroundStyleLabel}
          items={[
            { icon: <Grid3x3 size={14} />, id: "floor", label: copy.canvasBackgroundFloor },
            { icon: <Square size={14} />, id: "flat", label: copy.canvasBackgroundFlat },
          ]}
          value={value.style}
          onChange={(style) => onChange({ style })}
        />
        <ColorRow
          ariaLabel={copy.backgroundColorButton}
          label=""
          layout="field"
          uiTheme={uiTheme}
          value={value.color}
          onChange={(color) => onChange({ color })}
        />
        {value.style === "flat" ? (
          <Switch
            checked={gradient !== null}
            label={copy.canvasGradientLabel}
            onChange={(checked) =>
              onChange({
                gradient: checked
                  ? {
                      angle: DEFAULT_GRADIENT_ANGLE,
                      color: getDefaultGradientColor(value.color),
                    }
                  : null,
              })
            }
          />
        ) : null}
        {gradient ? (
          <>
            <ColorRow
              ariaLabel={copy.canvasGradientColorLabel}
              label=""
              layout="field"
              uiTheme={uiTheme}
              value={gradient.color}
              onChange={(color) => onChange({ gradient: { color } })}
            />
            <NumberField
              ariaLabel={copy.canvasGradientAngleLabel}
              icon={<RotateCw size={14} />}
              max={360}
              min={0}
              suffix="°"
              value={gradient.angle}
              onChange={(angle) => {
                if (angle !== null) onChange({ gradient: { angle } });
              }}
            />
          </>
        ) : null}
      </section>

      {/* No fundo liso não há chão: a grade só existe no Chão 3D. */}
      {value.style === "floor" ? (
        <section className="background-fields-section">
          <div className="background-fields-heading">
            <h3 className="background-fields-title">{copy.canvasGridSection}</h3>
            <ResetButton
              disabled={isDefaultCanvasGrid(value.grid)}
              label={copy.canvasGridResetLabel}
              size="small"
              onReset={() =>
                onChange({
                  grid: {
                    color: DEFAULT_CANVAS_GRID.color,
                    opacity: DEFAULT_CANVAS_GRID.opacity,
                  },
                })
              }
            />
          </div>
          <ColorRow
            ariaLabel={copy.canvasGridColorLabel}
            label=""
            layout="field"
            uiTheme={uiTheme}
            value={value.grid.color ?? autoGridColor}
            onChange={(color) => onChange({ grid: { color } })}
          />
          <NumberField
            ariaLabel={copy.canvasGridOpacityLabel}
            icon={<Blend size={14} />}
            max={1}
            min={0}
            scale={100}
            step={0.05}
            suffix="%"
            value={value.grid.opacity}
            onChange={(opacity) => {
              if (opacity !== null) onChange({ grid: { opacity } });
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
