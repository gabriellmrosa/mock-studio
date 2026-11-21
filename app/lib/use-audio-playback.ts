"use client";

import { useEffect, useRef } from "react";
import { getSceneAudios } from "./audio-objects";
import { stopAudioPlayback, syncAudioPlayback } from "./audio-files";
import { getPlaybackTimeMs } from "./scene-motion";
import type { SceneObject } from "./scene-objects";

/**
 * Toca a música da cena junto com o play do Vídeo, no mesmo relógio das poses
 * (`getPlaybackTimeMs`). Parado, ela fica muda: arrastar o playhead não toca
 * nada, para não virar ruído (decisão do usuário).
 *
 * Roda num `requestAnimationFrame` próprio só enquanto toca, fora do canvas: o
 * som não depende do 3D. Com a aba em segundo plano o rAF para, mas o `<audio>`
 * segue tocando sozinho; só a correção de escorregão espera a aba voltar.
 */
export function useAudioPlayback({
  objects,
  sceneDurationMs,
  startedAt,
}: {
  objects: SceneObject[];
  sceneDurationMs: number;
  /** Instante (Date.now) do zero do play; `null` = parado. */
  startedAt: number | null;
}) {
  // O quadro lê sempre a cena de agora (mudar o volume tocando vale na hora)
  // sem reiniciar o laço a cada render.
  const sceneRef = useRef({ objects, sceneDurationMs });

  useEffect(() => {
    sceneRef.current = { objects, sceneDurationMs };
  }, [objects, sceneDurationMs]);

  useEffect(() => {
    if (startedAt === null) {
      return;
    }

    let frame = 0;

    const tick = () => {
      const { objects, sceneDurationMs } = sceneRef.current;

      syncAudioPlayback(
        getSceneAudios(objects),
        getPlaybackTimeMs(startedAt, Date.now(), sceneDurationMs),
        sceneDurationMs,
      );
      frame = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(frame);
      stopAudioPlayback();
    };
  }, [startedAt]);
}
