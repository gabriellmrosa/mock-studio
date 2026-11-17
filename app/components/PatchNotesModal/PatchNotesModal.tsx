"use client";

import "./PatchNotesModal.css";
import type { AppCopy, Locale } from "../../lib/i18n";
import { PATCH_NOTES } from "../../lib/patch-notes";
import Modal from "../Modal/Modal";

/** "17 de novembro de 2026", no idioma da interface. O meio-dia evita o fuso. */
function formatDate(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

/**
 * As novidades por versão, no `Modal` de leitura, numa linha do tempo vertical:
 * um ponto por versão numa linha contínua, a mais nova em cima. Só aparece para quem abre
 * "Novidades" no menu — nada avisa que há uma versão nova.
 */
export default function PatchNotesModal({
  copy,
  isOpen,
  locale,
  onClose,
}: {
  copy: AppCopy;
  isOpen: boolean;
  locale: Locale;
  onClose: () => void;
}) {
  return (
    <Modal
      closeLabel={copy.closeLabel}
      eyebrow={copy.patchNotesEyebrow}
      isOpen={isOpen}
      title={copy.patchNotesTitle}
      onClose={onClose}
    >
      <ol className="patch-notes">
        {PATCH_NOTES.map((note) => (
          <li key={note.version} className="patch-notes-version">
            <header className="patch-notes-header">
              <span className="patch-notes-number">v{note.version}</span>
              <time className="patch-notes-date" dateTime={note.date}>
                {formatDate(note.date, locale)}
              </time>
            </header>
            <ul className="patch-notes-items">
              {note.items.map((item) => (
                <li key={item.title["en-US"]} className="patch-notes-item">
                  <span className="patch-notes-item-title">{item.title[locale]}</span>
                  <span className="patch-notes-item-description">
                    {item.description[locale]}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
