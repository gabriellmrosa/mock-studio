"use client";

import "./TextControls.css";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ArrowUpDown,
  MoveHorizontal,
  Type,
} from "lucide-react";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import {
  MAX_TEXT_FONT_SIZE,
  MAX_TEXT_LENGTH,
  MAX_TEXT_LETTER_SPACING,
  MAX_TEXT_LINE_HEIGHT,
  MAX_TEXT_MAX_WIDTH,
  MIN_TEXT_FONT_SIZE,
  MIN_TEXT_LETTER_SPACING,
  MIN_TEXT_LINE_HEIGHT,
  MIN_TEXT_MAX_WIDTH,
  toRenderableText,
  type SceneText,
  type TextAlign,
} from "../../lib/text-objects";
import {
  TEXT_FONTS,
  TEXT_FONT_IDS,
  TEXT_WEIGHT_NAMES,
  getNearestWeight,
  isTextFontId,
} from "../../lib/text-fonts";
import ColorRow from "../ColorRow/ColorRow";
import CustomSelect from "../CustomSelect/CustomSelect";
import {
  PanelSection,
  SegmentedTabs,
  type SubTabItem,
} from "../EditorPrimitives/EditorPrimitives";
import NumberField from "../NumberField/NumberField";

const ICON_SIZE = 14;

/**
 * O que um texto diz e como se vê, em poucas linhas — no molde do painel de
 * tipografia dos editores de design: conteúdo; fonte; peso e tamanho;
 * entrelinha e espaço entre letras; alinhamento e largura; cor. Os campos
 * numéricos substituem os sliders (cada um ocuparia uma linha só para si).
 *
 * Não é pose: posição, rotação e opacidade são os controles de Transformação,
 * comuns aos aparelhos. Por isso valem em qualquer modo e não animam: no Vídeo
 * o texto muda de lugar, não de conteúdo.
 */
export default function TextControls({
  copy,
  onChange,
  text,
  uiTheme,
}: {
  copy: AppCopy;
  onChange: (patch: Partial<SceneText>) => void;
  text: SceneText;
  uiTheme: UiTheme;
}) {
  const alignTabs: SubTabItem<TextAlign>[] = [
    { icon: <AlignLeft size={ICON_SIZE} />, id: "left", label: copy.textAlignLeft },
    {
      icon: <AlignCenter size={ICON_SIZE} />,
      id: "center",
      label: copy.textAlignCenter,
    },
    {
      icon: <AlignRight size={ICON_SIZE} />,
      id: "right",
      label: copy.textAlignRight,
    },
  ];
  // O aviso só aparece quando há o que avisar: letras que as fontes não têm.
  const hasUnsupportedCharacters = toRenderableText(text.content) !== text.content;

  return (
    <PanelSection
      title={copy.textSectionTitle}
      className="--without-border-bottom"
    >
      <div className="text-controls">
        <div className="text-controls-field">
          <textarea
            aria-label={copy.textContentLabel}
            className="text-controls-textarea"
            maxLength={MAX_TEXT_LENGTH}
            rows={3}
            value={text.content}
            onChange={(event) => onChange({ content: event.target.value })}
          />
          {hasUnsupportedCharacters ? (
            <p className="editor-sidebar-muted text-controls-hint">
              {copy.textUnsupportedHint}
            </p>
          ) : null}
        </div>

        <CustomSelect
          ariaLabel={copy.textFontLabel}
          options={TEXT_FONT_IDS.map((id) => ({
            label: TEXT_FONTS[id].label,
            value: id,
          }))}
          value={text.fontId}
          onChange={(value) => {
            if (isTextFontId(value)) onChange({ fontId: value });
          }}
        />

        <div className="text-controls-row">
          {/* Só os pesos que a fonte escolhida tem. */}
          <CustomSelect
            ariaLabel={copy.textWeightLabel}
            options={TEXT_FONTS[text.fontId].weights.map((weight) => ({
              label: TEXT_WEIGHT_NAMES[weight],
              value: String(weight),
            }))}
            value={String(getNearestWeight(text.fontId, text.weight))}
            onChange={(value) =>
              onChange({ weight: getNearestWeight(text.fontId, Number(value)) })
            }
          />
          <NumberField
            ariaLabel={copy.textSizeLabel}
            icon={<Type size={ICON_SIZE} />}
            max={MAX_TEXT_FONT_SIZE}
            min={MIN_TEXT_FONT_SIZE}
            value={text.fontSize}
            onChange={(fontSize) => {
              if (fontSize !== null) onChange({ fontSize });
            }}
          />
        </div>

        <div className="text-controls-group">
          <div className="text-controls-row">
            <span className="transform-control-label">
              {copy.textLineHeightLabel}
            </span>
            <span className="transform-control-label">
              {copy.textLetterSpacingLabel}
            </span>
          </div>
          <div className="text-controls-row">
            <NumberField
              ariaLabel={copy.textLineHeightLabel}
              icon={<ArrowUpDown size={ICON_SIZE} />}
              max={MAX_TEXT_LINE_HEIGHT}
              min={MIN_TEXT_LINE_HEIGHT}
              step={0.05}
              value={text.lineHeight}
              onChange={(lineHeight) => {
                if (lineHeight !== null) onChange({ lineHeight });
              }}
            />
            <NumberField
              ariaLabel={copy.textLetterSpacingLabel}
              icon={<ArrowLeftRight size={ICON_SIZE} />}
              max={MAX_TEXT_LETTER_SPACING}
              min={MIN_TEXT_LETTER_SPACING}
              scale={100}
              step={0.01}
              suffix="%"
              value={text.letterSpacing}
              onChange={(letterSpacing) => {
                if (letterSpacing !== null) onChange({ letterSpacing });
              }}
            />
          </div>
        </div>

        <div className="text-controls-group">
          <div className="text-controls-row">
            <span className="transform-control-label">
              {copy.textAlignLabel}
            </span>
            <span className="transform-control-label">
              {copy.textMaxWidthLabel}
            </span>
          </div>
          <div className="text-controls-row">
            <SegmentedTabs
              ariaLabel={copy.textAlignLabel}
              className="text-controls-segmented"
              iconOnly
              items={alignTabs}
              value={text.align}
              onChange={(align) => onChange({ align })}
            />
            {/* Vazio é "Auto": a caixa cresce com o texto. Um número liga a
                quebra de linha nessa largura. */}
            <NumberField
              ariaLabel={copy.textMaxWidthLabel}
              emptyLabel={copy.textWidthAuto}
              icon={<MoveHorizontal size={ICON_SIZE} />}
              max={MAX_TEXT_MAX_WIDTH}
              min={MIN_TEXT_MAX_WIDTH}
              step={10}
              value={text.maxWidth}
              onChange={(maxWidth) => onChange({ maxWidth })}
            />
          </div>
        </div>

        <div className="text-controls-group">
          <span className="transform-control-label">{copy.textColorLabel}</span>
          <ColorRow
            ariaLabel={copy.textColorLabel}
            label=""
            layout="field"
            uiTheme={uiTheme}
            value={text.color}
            onChange={(color) => onChange({ color })}
          />
        </div>
      </div>
    </PanelSection>
  );
}
