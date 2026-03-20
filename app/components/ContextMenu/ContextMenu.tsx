"use client";

import "./ContextMenu.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight } from "lucide-react";

export type ContextMenuActionItem = {
  type: "action";
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
  trigger: (props: { open: boolean; onClick: () => void }) => ReactNode;
};

type PanelPosition = { top: number; left: number };

export default function ContextMenu({ items, trigger }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(
    null,
  );
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
        setPanelPosition({ top: rect.bottom + 4, left: rect.left });
      }
      setIsOpen(true);
      setActiveSubmenuIndex(null);
    }
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
            className="context-menu-panel"
            style={{ top: panelPosition.top, left: panelPosition.left }}
            onMouseEnter={cancelCloseSubmenu}
            onMouseLeave={scheduleCloseSubmenu}
          >
            {items.map((item, index) => {
              if (item.type === "action") {
                return (
                  <button
                    key={index}
                    type="button"
                    className={`context-menu-row${item.variant === "danger" ? " context-menu-row-danger" : ""}`}
                    onClick={() => handleOptionClick(item.onClick)}
                  >
                    <span className="context-menu-row-label">{item.label}</span>
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
      {trigger({ open: isOpen, onClick: handleTriggerClick })}
      {panel}
    </div>
  );
}
