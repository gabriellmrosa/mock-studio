"use client";

import { ChangeEvent, useState } from "react";

type ColorRowProps = {
  label: string;
  onChange: (hex: string) => void;
  uiTheme: "dark" | "light";
  value: string;
};

export default function ColorRow({
  label,
  onChange,
  uiTheme,
  value,
}: ColorRowProps) {
  const [inputVal, setInputVal] = useState(value);

  const handleHexInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputVal(nextValue);

    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(nextValue)) {
      onChange(nextValue);
    }
  };

  const handleColorPicker = (event: ChangeEvent<HTMLInputElement>) => {
    setInputVal(event.target.value);
    onChange(event.target.value);
  };

  if (inputVal !== value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
    setInputVal(value);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] flex-1 truncate text-[var(--sidebar-muted)]">
        {label}
      </span>
      <label className="relative w-6 h-6 rounded overflow-hidden border border-[var(--input-border)] cursor-pointer shrink-0 transition hover:border-[var(--input-border-hover)]">
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
        maxLength={7}
        placeholder="#000000"
        className={`editor-input w-20 rounded px-1.5 py-1 text-[10px] font-mono transition focus:outline-none ${uiTheme === "dark" ? "selection:bg-white/20" : "selection:bg-black/10"}`}
      />
    </div>
  );
}
