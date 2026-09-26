"use client";

import "./CustomSelect.css";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type CustomSelectOption = {
  badgeLabel?: string;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  value: string;
};

type PanelPosition = {
  left: number;
  top: number;
  width: number;
};

type CustomSelectProps = {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  value: string;
};

export default function CustomSelect({
  ariaLabel,
  className = "",
  onChange,
  options,
  placeholder = "Select",
  value,
}: CustomSelectProps) {
  const selectedOption =
    options.find((option) => option.value === value) ?? null;
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const panelStyle = useMemo(() => {
    if (!panelPosition) return undefined;
    return {
      left: panelPosition.left,
      top: panelPosition.top,
      width: panelPosition.width,
    };
  }, [panelPosition]);

  function updatePanelPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const width = rect.width;
    const viewportPadding = 12;
    const panelMaxHeight = Math.min(288, window.innerHeight * 0.5);
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUpward = spaceBelow < panelMaxHeight && spaceAbove > spaceBelow;
    const top = openUpward
      ? Math.max(viewportPadding, rect.top - Math.min(panelMaxHeight, spaceAbove) - 4)
      : Math.min(window.innerHeight - viewportPadding, rect.bottom + 4);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );

    setPanelPosition({ left, top, width });
  }

  function close() {
    setIsOpen(false);
    setPanelPosition(null);
  }

  function open() {
    setHighlightedIndex(selectedIndex);
    setIsOpen(true);
    updatePanelPosition();
  }

  function handleTriggerClick() {
    if (isOpen) {
      close();
      return;
    }

    open();
  }

  function selectValue(nextValue: string) {
    const option = options.find((item) => item.value === nextValue);
    if (option?.disabled) {
      return;
    }

    onChange(nextValue);
    close();
    triggerRef.current?.focus();
  }

  function moveHighlight(direction: 1 | -1) {
    if (options.length === 0) return;

    setHighlightedIndex((current) => {
      const base = current >= 0 ? current : selectedIndex;

      for (let step = 1; step <= options.length; step += 1) {
        const next = (base + direction * step + options.length) % options.length;
        if (!options[next]?.disabled) {
          return next;
        }
      }

      return base;
    });
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      moveHighlight(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }
      moveHighlight(-1);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (!isOpen) {
        open();
        return;
      }

      const option = options[highlightedIndex];
      if (option && !option.disabled) {
        selectValue(option.value);
      }
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) {
        close();
      }
    }

    function handleViewportChange() {
      updatePanelPosition();
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, options.length, selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={rootRef} className={`custom-select ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        className="custom-select-trigger"
        data-open={isOpen}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="custom-select-trigger-labels">
          <span className="custom-select-trigger-value">
            {selectedOption?.icon ? (
              <span className="custom-select-option-icon">
                {selectedOption.icon}
              </span>
            ) : null}
            <span>{selectedOption?.label ?? placeholder}</span>
          </span>
        </span>
        <ChevronDown size={16} className="custom-select-trigger-icon" />
      </button>

      {isOpen && panelStyle
        ? createPortal(
            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="custom-select-panel"
              style={panelStyle}
            >
              <div className="custom-select-list">
                {options.map((option, index) => {
                  const isSelected = option.value === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <button
                      key={option.value}
                      ref={(node) => {
                        optionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled}
                      disabled={option.disabled}
                      className="custom-select-option"
                      data-selected={isSelected}
                      data-disabled={option.disabled}
                      data-highlighted={isHighlighted}
                      onClick={() => selectValue(option.value)}
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setHighlightedIndex(index);
                        }
                      }}
                    >
                      <span className="custom-select-option-copy">
                        <span className="custom-select-option-label">
                          {option.icon ? (
                            <span className="custom-select-option-icon">
                              {option.icon}
                            </span>
                          ) : null}
                          {option.label}
                        </span>
                        {option.badgeLabel ? (
                          <span className="custom-select-option-badge">
                            {option.badgeLabel}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check size={14} className="custom-select-option-check" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
