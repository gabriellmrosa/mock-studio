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

  // Sync external value changes (e.g. color picker, undo) only while not typing
  useEffect(() => {
    if (!isFocused) {
      setInputVal(value);
      setIsInvalid(false);
    }
  }, [value, isFocused]);

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

  const handleFocus = () => setIsFocused(true);

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
    setInputVal(e.target.value);
    setIsInvalid(false);
    onChange(e.target.value);
  };

  return (
    <div className={`flex items-center gap-3 ${compact ? "justify-end" : ""}`}>
      {label ? (
        <span className="flex-1 truncate text-[0.625rem] uppercase tracking-[0.16em] text-[var(--sidebar-muted)]">
          {label}
        </span>
      ) : null}
      <label
        className={`relative shrink-0 cursor-pointer overflow-hidden border border-[var(--input-border)] transition hover:border-[var(--input-border-hover)] ${
          compact ? "h-7 w-7 rounded-[var(--radius-xs)]" : "h-8 w-8 rounded-full"
        }`}
      >
        <input
          type="color"
          value={value}
          onChange={handleColorPicker}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </label>
      <input
        type="text"
        value={inputVal}
        onChange={handleHexInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        maxLength={7}
        placeholder="#000000"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className={`editor-input ${compact ? "w-[5.5rem] px-2 py-1.5" : "w-24 px-2.5 py-2"} rounded-[var(--radius-sm)] text-[0.6875rem] font-mono transition focus:outline-none ${
          uiTheme === "dark" ? "selection:bg-white/20" : "selection:bg-black/10"
        }${isInvalid ? " color-row-input-error" : ""}`}
      />
    </div>
  );
}
