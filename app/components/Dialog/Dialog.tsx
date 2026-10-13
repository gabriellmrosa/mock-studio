"use client";

import "./Dialog.css";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type DialogAction = {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  /** `primary` é a ação principal — no máximo uma — e recebe o foco ao abrir. */
  variant?: "primary" | "secondary";
};

type DialogProps = {
  actions: DialogAction[];
  cancelLabel: string;
  children?: ReactNode;
  className?: string;
  description?: string;
  /**
   * `false` para um trabalho em curso (ex.: exportar um vídeo): Esc e clique
   * fora não fazem nada, e só o botão de cancelar interrompe — um toque sem
   * querer não joga fora minutos de trabalho.
   */
  dismissible?: boolean;
  /** No rodapé, à esquerda das ações (ex.: um checkbox que vale para a ação). */
  footerStart?: ReactNode;
  isOpen: boolean;
  onCancel: () => void;
  /**
   * `alertdialog` para confirmações que interrompem um fluxo; `dialog` para
   * uma tarefa com conteúdo próprio (ex.: configurar e exportar).
   */
  role?: "alertdialog" | "dialog";
  title: string;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialog central com máscara: isola a atenção numa decisão, como os painéis
 * finais dos apps de criação — primeiro se configura, depois se confirma.
 * Cancelar fica sempre à esquerda das ações, e a principal é a última.
 *
 * Esc e clique fora contam como cancelar, nunca como confirmar (ou nada,
 * com `dismissible={false}`). Um Esc que
 * outro controle já tratou (um select aberto, que fecha a lista) não fecha o
 * dialog. O Tab fica preso dentro dele, e o foco volta para quem o abriu.
 */
export default function Dialog({
  actions,
  cancelLabel,
  children,
  className = "",
  description,
  dismissible = true,
  footerStart,
  isOpen,
  onCancel,
  role = "dialog",
  title,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;

    (primaryRef.current ?? panelRef.current)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();

        if (dismissible) {
          onCancel();
        }

        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [dismissible, isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="dialog-overlay"
      onClick={dismissible ? onCancel : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`dialog ${className}`.trim()}
        onClick={(event) => event.stopPropagation()}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <h2 id={titleId} className="dialog-title">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="dialog-description">
            {description}
          </p>
        ) : null}

        {children ? <div className="dialog-body">{children}</div> : null}

        <div className="dialog-footer">
          {footerStart ? (
            <div className="dialog-footer-start">{footerStart}</div>
          ) : null}
          <div className="dialog-actions">
            <button
              type="button"
              className="dialog-button dialog-button-ghost"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            {actions.map((action) => (
              <button
                key={action.label}
                ref={action.variant === "primary" ? primaryRef : undefined}
                type="button"
                className={`dialog-button dialog-button-${
                  action.variant ?? "secondary"
                }`}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
