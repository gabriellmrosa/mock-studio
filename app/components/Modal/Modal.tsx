"use client";

import "./Modal.css";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * O modal de leitura: um título (com um sobretítulo opcional), o ✕ de fechar e
 * um corpo que rola. Não conhece o conteúdo — créditos, novidades, o que vier —
 * e é o mesmo para todos, para que se pareçam e se comportem igual: Esc e o
 * clique fora fecham, o foco fica preso dentro e volta a quem o abriu, e o fundo
 * não rola.
 *
 * Diferente do `Dialog`, que é para uma decisão (botões de ação no rodapé, e
 * cancelar): aqui só se lê, e a única saída é fechar.
 */
export default function Modal({
  children,
  closeLabel,
  eyebrow,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  /** O nome do ✕ para leitores de tela (ex.: "Fechar créditos"). */
  closeLabel: string;
  eyebrow?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();

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
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className="modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            {eyebrow ? <p className="modal-eyebrow">{eyebrow}</p> : null}
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
          >
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
