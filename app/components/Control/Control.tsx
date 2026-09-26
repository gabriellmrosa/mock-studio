import "./Control.css";
import type { CSSProperties } from "react";

export default function Control({
  displayValue,
  label,
  value,
  setValue,
  min,
  max,
  step = 1,
}: {
  displayValue?: number;
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const resolvedDisplayValue = displayValue ?? value;
  const rangeProgress = ((resolvedDisplayValue - min) / (max - min)) * 100;

  return (
    <div className="transform-control">
      <span className="transform-control-label">{label}</span>

      <div className="transform-control-row">
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={resolvedDisplayValue}
          onChange={(e) => setValue(Number(e.target.value))}
          className="editor-range"
          style={
            {
              "--range-progress": `${rangeProgress}%`,
            } as CSSProperties
          }
        />

        <input
          type="number"
          aria-label={label}
          className="editor-input transform-value-input"
          value={resolvedDisplayValue}
          step={step}
          min={min}
          max={max}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
