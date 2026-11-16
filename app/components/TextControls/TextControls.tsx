"use client";

import "./TextControls.css";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
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
  type SceneText,
  type TextAlign,
} from "../../lib/text-objects";
import {
  TEXT_FONTS,
  TEXT_FONT_IDS,
  isTextFontId,
  type TextWeight,
} from "../../lib/text-fonts";
import ColorRow from "../ColorRow/ColorRow";
import Control from "../Control/Control";
import CustomSelect from "../CustomSelect/CustomSelect";
import {
  PanelSection,
  SegmentedTabs,
  Switch,
  type SubTabItem,
} from "../EditorPrimitives/EditorPrimitives";

/** Largura com que o texto passa a quebrar linha ao ligar "Quebrar linhas". */
const DEFAULT_WRAP_WIDTH = 400;

/**
 * O que um texto diz e como se vê: conteúdo, fonte, peso, tamanho, cor,
 * alinhamento, entrelinha, espaço entre letras e largura. Não é pose — a
 * posição, a rotação e a opacidade são os controles de Transformação, comuns
 * aos aparelhos. Por isso valem em qualquer modo e não animam: no Vídeo o
 * texto muda de lugar, não de conteúdo.
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
  const weightTabs: SubTabItem<TextWeight>[] = [
    { icon: null, id: "regular", label: copy.textWeightRegular },
    { icon: null, id: "bold", label: copy.textWeightBold },
  ];
  const alignTabs: SubTabItem<TextAlign>[] = [
    { icon: <AlignLeft size={13} />, id: "left", label: copy.textAlignLeft },
    { icon: <AlignCenter size={13} />, id: "center", label: copy.textAlignCenter },
    { icon: <AlignRight size={13} />, id: "right", label: copy.textAlignRight },
  ];

  return (
    <PanelSection
      title={copy.textSectionTitle}
      className="--without-border-bottom"
    >
      <div className="text-controls">
        <label className="text-controls-field">
          <span className="transform-control-label">{copy.textContentLabel}</span>
          <textarea
            aria-label={copy.textContentLabel}
            className="text-controls-textarea"
            maxLength={MAX_TEXT_LENGTH}
            rows={3}
            value={text.content}
            onChange={(event) => onChange({ content: event.target.value })}
          />
        </label>
        <p className="editor-sidebar-muted text-controls-hint">
          {copy.textUnsupportedHint}
        </p>

        <div className="text-controls-field">
          <span className="transform-control-label">{copy.textFontLabel}</span>
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
        </div>

        <SegmentedTabs
          ariaLabel={copy.textWeightLabel}
          items={weightTabs}
          value={text.weight}
          onChange={(weight) => onChange({ weight })}
        />

        <Control
          label={copy.textSizeLabel}
          min={MIN_TEXT_FONT_SIZE}
          max={MAX_TEXT_FONT_SIZE}
          setValue={(fontSize) => onChange({ fontSize })}
          value={Math.round(text.fontSize)}
        />

        <ColorRow
          compact
          label={copy.textColorLabel}
          uiTheme={uiTheme}
          value={text.color}
          onChange={(color) => onChange({ color })}
        />

        <SegmentedTabs
          ariaLabel={copy.textAlignLabel}
          items={alignTabs}
          value={text.align}
          onChange={(align) => onChange({ align })}
        />

        <Control
          label={copy.textLineHeightLabel}
          min={MIN_TEXT_LINE_HEIGHT}
          max={MAX_TEXT_LINE_HEIGHT}
          setValue={(lineHeight) => onChange({ lineHeight })}
          step={0.05}
          value={Number(text.lineHeight.toFixed(2))}
        />
        <Control
          label={copy.textLetterSpacingLabel}
          min={MIN_TEXT_LETTER_SPACING}
          max={MAX_TEXT_LETTER_SPACING}
          setValue={(letterSpacing) => onChange({ letterSpacing })}
          step={0.01}
          value={Number(text.letterSpacing.toFixed(2))}
        />

        <Switch
          checked={text.maxWidth !== null}
          label={copy.textWrapLabel}
          onChange={(wrap) =>
            onChange({ maxWidth: wrap ? DEFAULT_WRAP_WIDTH : null })
          }
        />
        {text.maxWidth !== null ? (
          <Control
            label={copy.textMaxWidthLabel}
            min={MIN_TEXT_MAX_WIDTH}
            max={MAX_TEXT_MAX_WIDTH}
            setValue={(maxWidth) => onChange({ maxWidth })}
            step={10}
            value={Math.round(text.maxWidth)}
          />
        ) : null}
      </div>
    </PanelSection>
  );
}
