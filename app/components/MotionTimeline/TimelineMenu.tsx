"use client";

import "../ContextMenu/ContextMenu.css";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Painel flutuante da timeline, ancorado num ponto da tela: o cursor, no menu
 * de botão direito, ou um botão, no tamanho do vídeo. O ContextMenu do projeto
 * abre a partir de um botão gatilho com o próprio layout; aqui só
 * reaproveitamos o visual dele.
 */
export default function TimelineMenu({
  align = "start",
  ariaLabel,
  children,
  className,
  onClose,
  role = "menu",
  x,
  y,
}: {
  /** `end`: o painel termina em `x` em vez de começar nele. */
  align?: "start" | "end";
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
  /** `dialog` quando o painel tem campos, não só itens de menu. */
  role?: "menu" | "dialog";
  x: number;
  y: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // A timeline fica no rodapé: o menu costuma não caber abaixo do ponto.
  // Ajuste direto no DOM, antes da pintura, para não abrir e depois pular.
  useLayoutEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();
    const left = align === "end" ? x - rect.width : x;

    panel.style.left = `${Math.max(
      8,
      Math.min(left, window.innerWidth - rect.width - 8),
    )}px`;
    panel.style.top = `${
      y + rect.height > window.innerHeight - 8 ? y - rect.height : y
    }px`;
  }, [align, x, y, className]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", onClose);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={ariaLabel}
      className={`context-menu-panel motion-timeline-menu ${className ?? ""}`.trim()}
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}
