"use client";

import "./ContextMenu.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

export default function ContextMenu({ items, trigger }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenuIndex, setActiveSubmenuIndex] = useState<number | null>(null);
  const [submenuTop, setSubmenuTop] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function close() {
    setIsOpen(false);
    setActiveSubmenuIndex(null);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
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

  return (
    <div ref={rootRef} className="context-menu-root">
      {/* eslint-disable-next-line react-hooks/refs */}
      {trigger({ open: isOpen, onClick: handleTriggerClick })}

      {isOpen && (
        <div
          ref={panelRef}
          className="context-menu-panel"
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
        </div>
      )}
    </div>
  );
}
