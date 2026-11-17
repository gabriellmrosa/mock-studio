"use client";

import "./StickerPicker.css";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppCopy } from "../../lib/i18n";
import {
  STICKER_CATEGORY_IDS,
  STICKERS,
  getStickerLabel,
  getStickerThumbUrl,
  type StickerCategoryId,
} from "../../lib/stickers";
import CustomSelect from "../CustomSelect/CustomSelect";
import Dialog from "../Dialog/Dialog";

/** Tira o acento e a caixa: "coração" acha "Coração vermelho" e "coracao". */
function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * A grade de stickers: uma categoria por vez e uma busca que vale para o
 * acervo todo (em qualquer idioma da interface, pelo nome mostrado e pelo id).
 * Serve a "+ Sticker" (cria um objeto) e a "Trocar sticker" (muda o do
 * objeto); quem a abre decide o que fazer com a escolha.
 */
export default function StickerPicker({
  copy,
  isOpen,
  onCancel,
  onPick,
}: {
  copy: AppCopy;
  isOpen: boolean;
  onCancel: () => void;
  onPick: (stickerId: string) => void;
}) {
  const [category, setCategory] = useState<StickerCategoryId>(
    STICKER_CATEGORY_IDS[0],
  );
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const term = fold(query.trim());

    if (!term) {
      return STICKERS[category];
    }

    return STICKER_CATEGORY_IDS.flatMap((id) => STICKERS[id]).filter(
      (stickerId) =>
        fold(getStickerLabel(stickerId, copy.stickerLabels)).includes(term) ||
        stickerId.includes(term),
    );
  }, [category, copy.stickerLabels, query]);

  return (
    <Dialog
      actions={[]}
      cancelLabel={copy.dialogCancel}
      className="sticker-picker"
      isOpen={isOpen}
      onCancel={onCancel}
      title={copy.stickerPickerTitle}
    >
      <div className="sticker-picker-filters">
        <label className="sticker-picker-search">
          <Search aria-hidden size={14} />
          <input
            aria-label={copy.stickerSearchLabel}
            autoComplete="off"
            className="sticker-picker-search-input"
            placeholder={copy.stickerSearchLabel}
            spellCheck={false}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="sticker-picker-category">
          <CustomSelect
            ariaLabel={copy.stickerCategoryLabel}
            options={STICKER_CATEGORY_IDS.map((id) => ({
              label: copy.stickerCategoryNames[id] ?? id,
              value: id,
            }))}
            value={category}
            onChange={(value) => setCategory(value as StickerCategoryId)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="sticker-picker-empty">{copy.stickerNone}</p>
      ) : (
        <ul className="sticker-picker-grid">
          {visible.map((stickerId) => {
            const label = getStickerLabel(stickerId, copy.stickerLabels);

            return (
              <li key={stickerId}>
                <button
                  type="button"
                  aria-label={label}
                  className="sticker-picker-item"
                  title={label}
                  onClick={() => onPick(stickerId)}
                >
                  {/* Arte do acervo, de um arquivo estático nosso: o <img> basta. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    height={48}
                    loading="lazy"
                    src={getStickerThumbUrl(stickerId)}
                    width={48}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="sticker-picker-count">
        {visible.length} {copy.stickerCount}
      </p>
    </Dialog>
  );
}
