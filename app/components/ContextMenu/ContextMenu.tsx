"use client";

import "./ContextMenu.css";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight } from "lucide-react";
import { IconButton } from "../EditorPrimitives/EditorPrimitives";

const TOP_END_MENU_GAP = 16;

export type ContextMenuActionItem = {
  type: "action";
  badgeLabel?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

export type ContextMenuSubmenuItem = {
  type: "submenu";
  label: string;
  options: Array<{
    label: string;
    value: string;
    checked?: boolean;
    onClick: () => void;
  }>;
};

export type ContextMenuItem = ContextMenuActionItem | ContextMenuSubmenuItem;

type ContextMenuProps = {
  items: ContextMenuItem[];
  panelPlacement?: "bottom-start" | "top-end";
  panelClassName?: string;
  triggerAriaLabel: string;
  triggerClassName?: string;
  triggerContentClassName?: string;
  triggerContent?: ReactNode;
  triggerDisabled?: boolean;
  triggerIcon: ReactNode;
  triggerStopPropagation?: boolean;
  triggerTitle: string;
};

type PanelPosition = { top: number; left: number };

export default function ContextMenu({
  items,
  panelPlacement = "bottom-start",
  panelClassName,
  triggerAriaLabel,
  triggerClassName,
  triggerContentClassName,
  triggerContent,
  triggerDisabled = false,
  triggerIcon,
  triggerStopPropagation = false,
  triggerTitle,
}: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(
    null,
  );
  const [isPanelPositionResolved, setIsPanelPositionResolved] = useState(false);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(
    null,
  );
  const [submenuTop, setSubmenuTop] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function close() {
    setIsOpen(false);
    setPanelPosition(null);
    setIsPanelPositionResolved(false);
    setActiveSubmenuIndex(null);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node;
      const inRoot = rootRef.current?.contains(target) ?? false;
      const inPanel = panelRef.current?.contains(target) ?? false;
      if (!inRoot && !inPanel) {
        close();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", close, true);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function handleTriggerClick() {
    if (isOpen) {
      close();
    } else {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) {
        setPanelPosition(
          panelPlacement === "top-end"
            ? { top: rect.top, left: rect.right }
            : { top: rect.bottom + 4, left: rect.left },
        );
      }
      setIsOpen(true);
      setIsPanelPositionResolved(panelPlacement === "bottom-start");
      setActiveSubmenuIndex(null);
    }
  }

  useLayoutEffect(() => {
    if (!isOpen || panelPlacement !== "top-end" || !panelRef.current || !panelPosition) {
      return;
    }

    const triggerRect = rootRef.current?.getBoundingClientRect();
    if (!triggerRect) {
      return;
    }

    const panelRect = panelRef.current.getBoundingClientRect();
    const nextTop = triggerRect.top - panelRect.height - TOP_END_MENU_GAP;
    const nextLeft = triggerRect.right - panelRect.width;

    if (nextTop !== panelPosition.top || nextLeft !== panelPosition.left) {
      setPanelPosition({ top: nextTop, left: nextLeft });
      return;
    }

    if (!isPanelPositionResolved) {
      setIsPanelPositionResolved(true);
    }
  }, [isOpen, isPanelPositionResolved, panelPlacement, panelPosition]);

  function handleTriggerButtonClick(event?: React.MouseEvent<HTMLButtonElement>) {
    if (triggerStopPropagation) {
      event?.stopPropagation();
    }

    handleTriggerClick();
  }

  function openSubmenu(index: number, rowEl: HTMLButtonElement) {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (panelRef.current) {
      const panelRect = panelRef.current.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();
      setSubmenuTop(rowRect.top - panelRect.top);
    }

    setActiveSubmenuIndex(index);
  }

  function scheduleCloseSubmenu() {
    closeTimerRef.current = setTimeout(() => {
      setActiveSubmenuIndex(null);
    }, 280);
  }

  function cancelCloseSubmenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function handleOptionClick(action: () => void) {
    action();
    close();
  }

  const activeSubmenuItem =
    activeSubmenuIndex !== null ? items[activeSubmenuIndex] : null;
  const submenuOptions =
    activeSubmenuItem?.type === "submenu" ? activeSubmenuItem.options : null;

  const panel =
    isOpen && panelPosition
      ? createPortal(
          <div
            ref={panelRef}
            className={`context-menu-panel ${panelClassName ?? ""}`.trim()}
            style={
              {
                top: panelPosition.top,
                left: panelPosition.left,
                visibility: isPanelPositionResolved ? "visible" : "hidden",
              }
            }
            onMouseEnter={cancelCloseSubmenu}
            onMouseLeave={scheduleCloseSubmenu}
          >
            {items.map((item, index) => {
              if (item.type === "action") {
                return (
                  <button
                    key={index}
                    type="button"
                    className={`context-menu-row${item.variant === "danger" ? " context-menu-row-danger" : ""}${item.disabled ? " context-menu-row-disabled" : ""}`}
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.disabled) {
                        return;
                      }

                      handleOptionClick(item.onClick);
                    }}
                  >
                    <span className="context-menu-row-label">{item.label}</span>
                    {item.badgeLabel ? (
                      <span className="context-menu-row-badge">{item.badgeLabel}</span>
                    ) : null}
                  </button>
                );
              }

              return (
                <button
                  key={index}
                  type="button"
                  className={`context-menu-row${activeSubmenuIndex === index ? " context-menu-row-active" : ""}`}
                  onMouseEnter={(e) => openSubmenu(index, e.currentTarget)}
                >
                  <span className="context-menu-row-label">{item.label}</span>
                  <ChevronRight size={12} className="context-menu-row-chevron" />
                </button>
              );
            })}

            {submenuOptions && (
              <div
                className="context-submenu-panel"
                style={{ top: submenuTop }}
                onMouseEnter={cancelCloseSubmenu}
              >
                {submenuOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className="context-menu-row"
                    onClick={() => handleOptionClick(opt.onClick)}
                  >
                    <span className="context-menu-row-label">{opt.label}</span>
                    {opt.checked && (
                      <Check size={12} className="context-menu-check" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="context-menu-root">
      {triggerContent ? (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={triggerAriaLabel}
          disabled={triggerDisabled}
          title={triggerTitle}
          className={triggerContentClassName}
          onClick={handleTriggerButtonClick}
        >
          {triggerContent}
        </button>
      ) : (
        <IconButton
          aria-expanded={isOpen}
          aria-label={triggerAriaLabel}
          title={triggerTitle}
          disabled={triggerDisabled}
          active={isOpen}
          className={triggerClassName}
          onClick={handleTriggerButtonClick}
        >
          {triggerIcon}
        </IconButton>
      )}
      {panel}
    </div>
  );
}
