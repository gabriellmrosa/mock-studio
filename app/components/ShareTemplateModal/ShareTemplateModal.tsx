"use client";

import "../Dialog/Dialog.css";
import "../ImportTemplateModal/ImportTemplateModal.css";
import { useEffect, useId, useState } from "react";
import { Check } from "lucide-react";
import { copyPendingText } from "../../lib/browser";
import type { AppCopy } from "../../lib/i18n";
import Modal from "../Modal/Modal";

/**
 * O par do "Importar template": explica o que se compartilha e o que não vai
 * junto, mostra o código num campo só de leitura e o copia num botão. Quem abre
 * gera o código (`code`, `null` com o modal fechado); aqui só se mostra e se
 * copia. O retorno da cópia fica no próprio botão, que é onde se está olhando.
 *
 * Quem o usa dá uma `key` que muda com o código, para o aviso de "copiado" não
 * passar de uma abertura para outra.
 */
export default function ShareTemplateModal({
  code,
  copy,
  onClose,
}: {
  code: string | null;
  copy: AppCopy;
  onClose: () => void;
}) {
  const fieldId = useId();
  const [status, setStatus] = useState<"copied" | "error" | "idle">("idle");

  useEffect(() => {
    if (status === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setStatus("idle"), 2500);

    return () => window.clearTimeout(timeout);
  }, [status]);

  return (
    <Modal
      closeLabel={copy.closeLabel}
      isOpen={code !== null}
      title={copy.shareTemplate}
      onClose={onClose}
    >
      <div className="import-template">
        <p className="import-template-text">{copy.shareTemplateIntro}</p>
        <p className="import-template-text import-template-note">
          {copy.shareTemplateNote}
        </p>
        <p className="import-template-text">{copy.shareTemplateNext}</p>
        <label className="import-template-label" htmlFor={fieldId}>
          {copy.shareTemplateCodeLabel}
        </label>
        <textarea
          id={fieldId}
          className="editor-input import-template-field"
          readOnly
          rows={4}
          spellCheck={false}
          value={code ?? ""}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className="dialog-button dialog-button-primary import-template-submit share-template-copy"
          aria-live="polite"
          onClick={() => {
            copyPendingText(Promise.resolve(code ?? ""))
              .then(() => setStatus("copied"))
              .catch(() => setStatus("error"));
          }}
        >
          {status === "copied" ? <Check size={13} aria-hidden /> : null}
          {status === "copied"
            ? copy.templateCodeCopied
            : status === "error"
              ? copy.templateCodeCopyError
              : copy.shareTemplateCopy}
        </button>
      </div>
    </Modal>
  );
}
