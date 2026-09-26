"use client";

import "./AlertDialog.css";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export type AlertDialogAction = {
  label: string;
  onClick: () => void;
  /** `primary` é a ação recomendada e recebe o foco ao abrir. */
  variant?: "primary" | "secondary";
};

type AlertDialogProps = {
  actions: AlertDialogAction[];
  cancelLabel: string;
  description: string;
  isOpen: boolean;
  onCancel: () => void;
  title: string;
};

/**
 * Confirmação curta que interrompe um fluxo. Segue o CreditsModal no portal,
 * no overlay e no Esc, mas é `alertdialog`: o foco vai para a ação principal
 * e clicar fora conta como cancelar — nunca como confirmar.
 */
export default function AlertDialog({
  actions,
  cancelLabel,
  description,
  isOpen,
  onCancel,
  title,
}: AlertDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;

    primaryRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="alert-dialog-overlay" onClick={onCancel} role="presentation">
      <div
        className="alert-dialog"
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId} className="alert-dialog-title">
          {title}
        </h2>
        <p id={descriptionId} className="alert-dialog-description">
          {description}
        </p>

        <div className="alert-dialog-actions">
          <button
            type="button"
            className="alert-dialog-button alert-dialog-button-ghost"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          {actions.map((action) => (
            <button
              key={action.label}
              ref={action.variant === "primary" ? primaryRef : undefined}
              type="button"
              className={`alert-dialog-button alert-dialog-button-${
                action.variant ?? "secondary"
              }`}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
