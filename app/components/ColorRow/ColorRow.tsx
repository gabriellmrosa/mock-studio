"use client";

import "./ColorRow.css";
import { ChangeEvent, memo, useEffect, useRef, useState } from "react";
import type { UiTheme } from "../../lib/i18n";

type ColorRowProps = {
  /** Nome para leitores de tela, quando o rótulo visível fica fora da linha. */
  ariaLabel?: string;
  compact?: boolean;
  /** Sem o que editar agora (ex.: nenhum keyframe selecionado). */
  disabled?: boolean;
  /**
   * `field`: o quadrado e o campo hex têm a altura e a forma dos campos do
   * painel (NumberField), ocupam a largura toda e o rótulo vem de fora, em cima
   * — como nos campos irmãos. Sem ele, a linha de sempre: rótulo, quadrado e
   * campo hex lado a lado.
   */
  layout?: "inline" | "field";
  label: string;
  onChange: (hex: string) => void;
  uiTheme: UiTheme;
  value: string;
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const DEBOUNCE_MS = 350;

function normalize(raw: string): string {
  const t = raw.trim();
  return t && !t.startsWith("#") ? `#${t}` : t;
}

function ColorRowImpl({
  compact = false,
  disabled = false,
  label,
  ariaLabel,
  layout = "inline",
  onChange,
  uiTheme,
  value,
}: ColorRowProps) {
  const isField = layout === "field";
  const [inputVal, setInputVal] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pendingPickerValueRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleHexInput = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputVal(raw);

    const normalized = normalize(raw);
    const valid = HEX_RE.test(normalized);
    setIsInvalid(raw.length > 0 && !valid);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (valid) {
      debounceRef.current = setTimeout(() => onChange(normalized), DEBOUNCE_MS);
    }
  };

  const handleFocus = () => {
    setInputVal(value);
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const normalized = normalize(inputVal);
    if (HEX_RE.test(normalized)) {
      setInputVal(normalized);
      setIsInvalid(false);
      if (normalized !== value) onChange(normalized);
    } else {
      // Revert to last valid value
      setInputVal(value);
      setIsInvalid(false);
    }
  };

  const handleColorPicker = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === value) return;
    setInputVal(e.target.value);
    setIsInvalid(false);
    pendingPickerValueRef.current = e.target.value;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;

      if (pendingPickerValueRef.current) {
        onChange(pendingPickerValueRef.current);
      }
    });
  };

  return (
    <div
      className={`color-row ${compact ? "color-row-compact" : ""}${
        isField ? " color-row-field" : ""
      }${disabled ? " is-disabled" : ""}`.trim()}
    >
      {label ? (
        <span className="color-row-label">
          {label}
        </span>
      ) : null}
      <label
        className={`color-row-swatch ${
          isField
            ? "color-row-swatch-field"
            : compact
              ? "color-row-swatch-compact"
              : "color-row-swatch-default"
        }`}
      >
        <input
          type="color"
          aria-label={ariaLabel}
          disabled={disabled}
          value={value}
          onChange={handleColorPicker}
          className="color-row-swatch-input"
        />
        <div className="color-row-swatch-fill" style={{ backgroundColor: value }} />
      </label>
      <input
        type="text"
        aria-label={ariaLabel}
        disabled={disabled}
        value={isFocused ? inputVal : value}
        onChange={handleHexInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        maxLength={7}
        placeholder="#000000"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={`editor-input color-row-input ${
          isField
            ? "color-row-input-field"
            : compact
              ? "color-row-input-compact"
              : "color-row-input-default"
        } ${
          uiTheme !== "light" ? "color-row-input-dark" : "color-row-input-light"
        }${isInvalid ? " color-row-input-error" : ""}`}
      />
    </div>
  );
}

const ColorRow = memo(
  ColorRowImpl,
  (prevProps, nextProps) =>
    prevProps.compact === nextProps.compact &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.layout === nextProps.layout &&
    prevProps.ariaLabel === nextProps.ariaLabel &&
    prevProps.label === nextProps.label &&
    prevProps.uiTheme === nextProps.uiTheme &&
    prevProps.value === nextProps.value,
);

export default ColorRow;
