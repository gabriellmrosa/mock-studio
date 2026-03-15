"use client";

import { ChangeEvent, useState } from "react";

type ColorRowProps = {
  label: string;
  onChange: (hex: string) => void;
  value: string;
};

export default function ColorRow({ label, onChange, value }: ColorRowProps) {
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
      <span className="text-neutral-400 text-[10px] flex-1 truncate">
        {label}
      </span>
      <label className="relative w-6 h-6 rounded overflow-hidden border border-neutral-600 cursor-pointer shrink-0 hover:border-neutral-400 transition">
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
        className="w-20 bg-neutral-800 border border-neutral-700 rounded px-1.5 py-1 text-[10px] text-neutral-200 font-mono focus:outline-none focus:border-neutral-500 transition"
      />
    </div>
  );
}
