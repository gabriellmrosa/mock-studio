export default function Control({
  label,
  uiTheme,
  value,
  setValue,
  min,
  max,
  step = 1,
}: {
  label: string;
  uiTheme: "dark" | "light";
  value: number;
  setValue: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--sidebar-muted)]">
          {label}
        </span>
        <span className="text-xs font-mono text-[var(--sidebar-value)]">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className={`flex-1 ${uiTheme === "dark" ? "accent-white" : "accent-black"}`}
        />

        <input
          type="number"
          className="editor-input w-18 rounded-md px-2 py-1 text-xs focus:outline-none"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => setValue(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
