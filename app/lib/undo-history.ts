/**
 * Histórico de desfazer e refazer: os estados de antes (`past`, o mais recente
 * no fim) e os desfeitos (`future`, o mais recente no fim). Puro: quem decide
 * o que é um estado e quando gravar é o `useUndoHistory`.
 */
export type UndoHistory<T> = { future: T[]; past: T[] };

/** Quantas ações voltam. A cena inteira por ação: cem bastam e não pesam. */
export const UNDO_LIMIT = 100;

export function createUndoHistory<T>(): UndoHistory<T> {
  return { future: [], past: [] };
}

/** Uma ação nova: guarda o estado de antes e esquece o que tinha sido desfeito. */
export function recordUndo<T>(history: UndoHistory<T>, before: T): UndoHistory<T> {
  return { future: [], past: [...history.past, before].slice(-UNDO_LIMIT) };
}

/** Volta um passo: devolve o estado a restaurar, ou `null` sem nada para desfazer. */
export function undoStep<T>(
  history: UndoHistory<T>,
  current: T,
): { history: UndoHistory<T>; state: T } | null {
  const state = history.past[history.past.length - 1];

  if (state === undefined) {
    return null;
  }

  return {
    history: { future: [...history.future, current], past: history.past.slice(0, -1) },
    state,
  };
}

/** Refaz o último desfeito, ou `null` sem nada para refazer. */
export function redoStep<T>(
  history: UndoHistory<T>,
  current: T,
): { history: UndoHistory<T>; state: T } | null {
  const state = history.future[history.future.length - 1];

  if (state === undefined) {
    return null;
  }

  return {
    history: {
      future: history.future.slice(0, -1),
      past: [...history.past, current].slice(-UNDO_LIMIT),
    },
    state,
  };
}

/**
 * Qual atalho uma tecla é: desfazer (Cmd/Ctrl+Z), refazer (Cmd/Ctrl+Shift+Z,
 * e Ctrl+Y, o do Windows) ou nenhum.
 */
export function getUndoShortcut(event: {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  shiftKey: boolean;
}): "redo" | "undo" | null {
  if (event.altKey || !(event.metaKey || event.ctrlKey)) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }

  return key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey ? "redo" : null;
}

/** Tipos de `<input>` em que se digita texto, e que têm o próprio desfazer. */
const TEXT_INPUT_TYPES = new Set(["", "email", "number", "password", "search", "tel", "text", "url"]);

/**
 * Se o foco está num campo de texto: lá o Cmd/Ctrl+Z é do campo (desfaz o que
 * foi digitado), não da cena. Slider, cor e caixa de seleção não têm desfazer
 * próprio: depois de arrastar um slider o foco fica nele, e o atalho tem de
 * desfazer o arrasto.
 */
export function isTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || target.tagName === "TEXTAREA") {
    return true;
  }

  return (
    target instanceof HTMLInputElement &&
    TEXT_INPUT_TYPES.has((target.getAttribute("type") ?? "").toLowerCase())
  );
}
