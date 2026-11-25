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
  suffix,
}: {
  displayValue?: number;
  label: string;
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Unidade discreta exibida à direita do número (ex.: "%" ou "°"). */
  suffix?: string;
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

        <div className="editor-input transform-value-field">
          <input
            type="number"
            aria-label={label}
            className="transform-value-input"
            value={resolvedDisplayValue}
            step={step}
            min={min}
            max={max}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          {suffix ? (
            <span className="transform-value-suffix" aria-hidden>
              {suffix}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
