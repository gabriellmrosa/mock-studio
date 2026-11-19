"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  createUndoHistory,
  recordUndo,
  redoStep,
  undoStep,
  type UndoHistory,
} from "./undo-history";

/**
 * Quanto tempo sem mudança encerra uma ação. Um arrasto (de slider, keyframe,
 * cor) muda a cena dezenas de vezes por segundo; agrupadas, viram uma ação só,
 * e desfazer volta ao de antes do arrasto, não um pixel.
 */
export const UNDO_BURST_MS = 500;

/** Mesmos campos, cada um o mesmo valor (por referência: o estado é imutável). */
function isSameSnapshot<T extends object>(a: T, b: T) {
  return (Object.keys(a) as Array<keyof T>).every((key) => a[key] === b[key]);
}

/**
 * Desfazer e refazer da cena. Observa o estado (`snapshot`, um objeto com as
 * partes da cena) e grava o de antes de cada ação; `restore` devolve um estado
 * guardado. Cada modo tem o seu histórico — Foto e Vídeo são cenas separadas —
 * e a troca de modo não é uma ação: só muda de histórico.
 */
export function useUndoHistory<T extends object>({
  mode,
  restore,
  snapshot,
}: {
  mode: string;
  restore: (state: T) => void;
  snapshot: T;
}) {
  const histories = useRef(new Map<string, UndoHistory<T>>());
  // O último estado parado (fim da última ação): é o "antes" da próxima.
  const committed = useRef(snapshot);
  const latest = useRef(snapshot);
  const lastMode = useRef(mode);
  // A ação em andamento (mudanças seguidas), que um temporizador encerra.
  const burstTimer = useRef<number | null>(null);
  // O estado que um desfazer ou refazer acabou de pôr: não é uma ação nova.
  const restoring = useRef<T | null>(null);

  latest.current = snapshot;

  const getHistory = () => histories.current.get(lastMode.current) ?? createUndoHistory<T>();

  const finishBurst = useCallback(() => {
    if (burstTimer.current !== null) {
      window.clearTimeout(burstTimer.current);
      burstTimer.current = null;
    }

    committed.current = latest.current;
  }, []);

  useEffect(() => {
    // Outro modo, outra cena: começa dele, sem gravar a troca.
    if (mode !== lastMode.current) {
      finishBurst();
      lastMode.current = mode;
      committed.current = snapshot;
      return;
    }

    if (restoring.current && isSameSnapshot(snapshot, restoring.current)) {
      restoring.current = null;
      committed.current = snapshot;
      return;
    }

    if (isSameSnapshot(snapshot, committed.current)) {
      return;
    }

    // Primeira mudança de uma ação: guarda o de antes.
    if (burstTimer.current === null) {
      histories.current.set(mode, recordUndo(getHistory(), committed.current));
    } else {
      window.clearTimeout(burstTimer.current);
    }

    burstTimer.current = window.setTimeout(() => {
      burstTimer.current = null;
      committed.current = latest.current;
    }, UNDO_BURST_MS);
    // `getHistory` lê só refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finishBurst, mode, snapshot]);

  useEffect(
    () => () => {
      if (burstTimer.current !== null) {
        window.clearTimeout(burstTimer.current);
      }
    },
    [],
  );

  const step = useCallback(
    (direction: "redo" | "undo") => {
      // Uma ação em andamento termina antes: desfazer volta ao começo dela.
      finishBurst();

      const history = histories.current.get(lastMode.current) ?? createUndoHistory<T>();
      const result =
        direction === "undo"
          ? undoStep(history, latest.current)
          : redoStep(history, latest.current);

      if (!result) {
        return false;
      }

      histories.current.set(lastMode.current, result.history);
      restoring.current = result.state;
      restore(result.state);

      return true;
    },
    [finishBurst, restore],
  );

  return {
    redo: useCallback(() => step("redo"), [step]),
    undo: useCallback(() => step("undo"), [step]),
  };
}
