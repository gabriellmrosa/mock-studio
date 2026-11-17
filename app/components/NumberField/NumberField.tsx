"use client";

import "./NumberField.css";
import { useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * Campo numérico compacto, como os do painel de tipografia dos editores de
 * design: um ícone à frente, o número e, se for o caso, a unidade. Substitui o
 * par slider + número onde o slider só ocuparia uma linha a mais (entrelinha,
 * tamanho, largura). Digita-se o valor; as setas andam um passo (com Shift,
 * dez); o valor só vale ao sair do campo ou no Enter, e o Esc desfaz.
 *
 * `scale` separa o que se guarda do que se mostra: o espaço entre letras é
 * guardado em frações do corpo (0,05) e mostrado em % (5). Limites e passo são
 * os do valor guardado.
 *
 * Sem `emptyLabel` o campo nunca fica vazio. Com ele, vazio é um valor (`null`),
 * mostrado como esse rótulo — a largura "Auto" do texto, por exemplo.
 */
export default function NumberField({
  ariaLabel,
  emptyLabel,
  icon,
  max,
  min,
  onChange,
  scale = 1,
  step = 1,
  suffix,
  value,
}: {
  ariaLabel: string;
  emptyLabel?: string;
  icon: ReactNode;
  max: number;
  min: number;
  onChange: (value: number | null) => void;
  scale?: number;
  step?: number;
  suffix?: string;
  value: number | null;
}) {
  // Enquanto se digita, vale o que está escrito; fora disso, o valor formatado.
  const [draft, setDraft] = useState<string | null>(null);

  function format(stored: number) {
    const shown = stored * scale;

    // Sem `lang` no documento (ainda sem idioma escolhido), o do navegador: uma
    // etiqueta vazia faria o Intl lançar um erro.
    const lang =
      typeof document === "undefined"
        ? undefined
        : document.documentElement.lang || undefined;

    return new Intl.NumberFormat(lang, {
      maximumFractionDigits: 2,
      useGrouping: false,
    }).format(shown);
  }

  function parse(text: string): number | null {
    const parsed = Number(text.trim().replace(",", "."));

    return text.trim() !== "" && Number.isFinite(parsed) ? parsed : null;
  }

  /** O que se escreveu, já dentro dos limites e na unidade guardada. */
  function toStored(shown: number) {
    const stored = Math.round((shown / scale) * 10000) / 10000;

    return Math.min(max, Math.max(min, stored));
  }

  function commit(text: string) {
    setDraft(null);

    if (text.trim() === "" && emptyLabel !== undefined) {
      onChange(null);

      return;
    }

    const parsed = parse(text);

    // O que não é número volta ao que estava.
    if (parsed !== null) {
      onChange(toStored(parsed));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      commit(event.currentTarget.value);
      event.currentTarget.blur();

      return;
    }

    if (event.key === "Escape") {
      setDraft(null);
      event.currentTarget.blur();

      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();

    const current =
      parse(event.currentTarget.value) ?? (value === null ? min : value * scale);
    const direction = event.key === "ArrowUp" ? 1 : -1;
    const next = toStored(
      current + direction * step * scale * (event.shiftKey ? 10 : 1),
    );

    setDraft(format(next));
    onChange(next);
  }

  return (
    <label className="number-field" title={ariaLabel}>
      <span aria-hidden className="number-field-icon">
        {icon}
      </span>
      <input
        aria-label={ariaLabel}
        className="number-field-input"
        inputMode="decimal"
        placeholder={emptyLabel}
        type="text"
        value={draft ?? (value === null ? "" : format(value))}
        onBlur={(event) => commit(event.target.value)}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => {
          setDraft(event.target.value);
          event.target.select();
        }}
        onKeyDown={handleKeyDown}
      />
      {suffix ? (
        <span aria-hidden className="number-field-suffix">
          {suffix}
        </span>
      ) : null}
    </label>
  );
}
