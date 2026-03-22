"use client";

import "./ColorRow.css";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type ColorRowProps = {
  compact?: boolean;
  label: string;
  onChange: (hex: string) => void;
  uiTheme: "dark" | "light";
  value: string;
};

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const DEBOUNCE_MS = 350;

function normalize(raw: string): string {
  const t = raw.trim();
  return t && !t.startsWith("#") ? `#${t}` : t;
}

export default function ColorRow({
  compact = false,
  label,
  onChange,
  uiTheme,
  value,
}: ColorRowProps) {
  const [inputVal, setInputVal] = useState(value);
  const [isInvalid, setIsInvalid] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
    onChange(e.target.value);
  };

  return (
    <div className={`color-row ${compact ? "color-row-compact" : ""}`.trim()}>
      {label ? (
        <span className="color-row-label">
          {label}
        </span>
      ) : null}
      <label
        className={`color-row-swatch ${
          compact ? "color-row-swatch-compact" : "color-row-swatch-default"
        }`}
      >
        <input
          type="color"
          value={value}
          onChange={handleColorPicker}
          className="color-row-swatch-input"
        />
        <div className="color-row-swatch-fill" style={{ backgroundColor: value }} />
      </label>
      <input
        type="text"
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
          compact ? "color-row-input-compact" : "color-row-input-default"
        } ${
          uiTheme === "dark" ? "color-row-input-dark" : "color-row-input-light"
        }${isInvalid ? " color-row-input-error" : ""}`}
      />
    </div>
  );
}
