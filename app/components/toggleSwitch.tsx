"use client";

import Image from "next/image";

type ToggleOption<T extends string> = {
  value: T;
  label: string;
  iconSrc: string;
  iconClassName?: string;
  iconAlt?: string;
};

type ToggleSwitchProps<T extends string> = {
  ariaLabel: string;
  options: [ToggleOption<T>, ToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
};

export default function ToggleSwitch<T extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: ToggleSwitchProps<T>) {
  const activeIndex = options.findIndex((option) => option.value === value);
  const thumbIndex = activeIndex === -1 ? 0 : activeIndex;

  return (
    <div
      className="toggle-switch"
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ ["--toggle-index" as string]: thumbIndex }}
    >
      <div className="toggle-switch-thumb" aria-hidden="true" />

      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className="toggle-switch-option"
            data-active={isActive}
          >
            <Image
              src={option.iconSrc}
              alt={option.iconAlt ?? option.label}
              width={16}
              height={16}
              className={`toggle-switch-icon ${option.iconClassName ?? ""}`}
            />
          </button>
        );
      })}
    </div>
  );
}
