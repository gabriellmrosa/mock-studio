"use client";

import "../Dialog/Dialog.css";
import "./ImportTemplateModal.css";
import { useId, useState, type FormEvent } from "react";
import type { AppCopy } from "../../lib/i18n";
import Modal from "../Modal/Modal";

/**
 * Importar um template pelo código que alguém compartilhou: o `Modal` explica o
 * que acontece e o que não vai no código, e tem um campo para colar. Quem abre
 * decide o que importar (`onImport` devolve `false` se o código não vale); aqui
 * só se mostra o erro e se fecha ao dar certo.
 */
export default function ImportTemplateModal({
  copy,
  isOpen,
  onClose,
  onImport,
}: {
  copy: AppCopy;
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => Promise<boolean>;
}) {
  const fieldId = useId();
  const [text, setText] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  function close() {
    setText("");
    setHasError(false);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsWorking(true);

    const imported = await onImport(text);

    setIsWorking(false);

    if (imported) {
      close();
    } else {
      setHasError(true);
    }
  }

  return (
    <Modal
      closeLabel={copy.closeLabel}
      isOpen={isOpen}
      title={copy.importTemplate}
      onClose={close}
    >
      <form className="import-template" onSubmit={handleSubmit}>
        <p className="import-template-text">{copy.importTemplateIntro}</p>
        <p className="import-template-text import-template-note">
          {copy.importTemplateNote}
        </p>
        <label className="import-template-label" htmlFor={fieldId}>
          {copy.importTemplateFieldLabel}
        </label>
        <textarea
          id={fieldId}
          className="editor-input import-template-field"
          aria-describedby={hasError ? `${fieldId}-error` : undefined}
          aria-invalid={hasError}
          placeholder={copy.importTemplatePlaceholder}
          rows={4}
          spellCheck={false}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setHasError(false);
          }}
        />
        {hasError ? (
          <p id={`${fieldId}-error`} className="import-template-error" role="alert">
            {copy.importTemplateInvalid}
          </p>
        ) : null}
        <button
          type="submit"
          className="dialog-button dialog-button-primary import-template-submit"
          disabled={text.trim() === "" || isWorking}
        >
          {copy.importTemplateSubmit}
        </button>
      </form>
    </Modal>
  );
}
