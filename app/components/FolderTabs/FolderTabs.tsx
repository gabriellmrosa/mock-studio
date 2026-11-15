"use client";

import "./FolderTabs.css";
import type { ReactNode } from "react";
import {
  SegmentedTabs,
  type SubTabItem,
} from "../EditorPrimitives/EditorPrimitives";

/**
 * Abas "de pasta", no estilo das abas do Chrome: a selecionada sobe um degrau,
 * tem os cantos de cima arredondados e "sai para fora" nos de baixo, ligando-se
 * ao painel logo abaixo (`FolderTabPanel`) como se as duas peças fossem uma só.
 * Veio do dashboard do Cartami (`.admin-tabs`), adaptado aos tokens daqui.
 *
 * É um `SegmentedTabs` com outra roupa — o mesmo papel `tablist`/`tab`, o
 * mesmo teclado (setas, Home, End) — para a escolha exclusiva ter uma lógica
 * só. Use com um `FolderTabPanel` embaixo: sem ele a aba selecionada não tem
 * onde se ligar.
 */
export function FolderTabs<T extends string>({
  ariaLabel,
  idPrefix,
  items,
  onChange,
  value,
}: {
  ariaLabel: string;
  /** Liga cada aba ao `FolderTabPanel` de mesmo prefixo. */
  idPrefix: string;
  items: SubTabItem<T>[];
  onChange: (id: T) => void;
  value: T;
}) {
  return (
    <SegmentedTabs
      ariaLabel={ariaLabel}
      className="folder-tabs"
      idPrefix={idPrefix}
      items={items}
      value={value}
      onChange={onChange}
    />
  );
}

/** O conteúdo da aba selecionada, na mesma superfície que ela. */
export function FolderTabPanel({
  activeId,
  children,
  idPrefix,
}: {
  activeId: string;
  children: ReactNode;
  idPrefix: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel`}
      aria-labelledby={`${idPrefix}-tab-${activeId}`}
      className="folder-tab-panel"
    >
      {children}
    </div>
  );
}
