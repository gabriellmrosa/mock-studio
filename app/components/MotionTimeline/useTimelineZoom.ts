"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/** 1 = a cena inteira cabe na largura; 40 = cerca de 1/40 dela. */
export const MIN_TIMELINE_ZOOM = 1;
export const MAX_TIMELINE_ZOOM = 40;
/** Quanto cada clique em − / + multiplica o zoom. */
export const TIMELINE_ZOOM_STEP = 1.5;

/** Intervalos possíveis entre marcas da régua, do mais fino ao mais largo. */
const TICK_STEPS_MS = [100, 200, 500, 1000, 2000, 5000, 10000];
/**
 * Espaço mínimo entre marcas. Além de caber o rótulo, deixa a régua calma:
 * sem zoom, segundos inteiros; as frações aparecem ao aproximar.
 */
const MIN_TICK_SPACING_PX = 80;
/** A pinça manda deltas pequenos e frequentes: isto é a "força" dela. */
const PINCH_SENSITIVITY = 0.01;

export function clampTimelineZoom(zoom: number) {
  return Math.min(MAX_TIMELINE_ZOOM, Math.max(MIN_TIMELINE_ZOOM, zoom));
}

/**
 * Intervalo da régua para uma escala: o mais fino em que as marcas ainda
 * ficam legíveis. Com zoom, décimos de segundo; sem, segundos ou mais.
 */
export function getTickStepMs(pxPerMs: number) {
  return (
    TICK_STEPS_MS.find((step) => step * pxPerMs >= MIN_TICK_SPACING_PX) ??
    TICK_STEPS_MS[TICK_STEPS_MS.length - 1]
  );
}

/** Rótulo de uma marca: com décimo só quando a régua é mais fina que 1 s. */
export function formatTick(timeMs: number, stepMs: number) {
  return stepMs < 1000
    ? `${(timeMs / 1000).toFixed(1)}s`
    : `${Math.round(timeMs / 1000)}s`;
}

type Anchor = {
  /** Posição do ponto ancorado no eixo, de 0 a 1. */
  ratio: number;
  /** Onde ele estava na janela visível, em px a partir da borda esquerda. */
  offsetX: number;
};

/**
 * Zoom horizontal da timeline. A área das trilhas fica `zoom` vezes mais
 * larga que a janela, dentro de um contêiner com rolagem: como tudo nela é
 * posicionado em porcentagem do eixo, keyframes, clipes e playhead escalam
 * sozinhos.
 *
 * Todo zoom é ancorado num ponto — o do cursor na pinça, o do playhead nos
 * botões —, que fica parado na tela enquanto o resto abre ou fecha em volta.
 *
 * Pinça no trackpad: o Chrome e o Edge a entregam como `wheel` com
 * `ctrlKey`; o Safari, como eventos `gesture*`. Os dois são interceptados
 * só dentro da timeline — fora dela a pinça continua sendo o zoom da página.
 */
export function useTimelineZoom(
  /** Se a área das trilhas está na tela (sem objetos, a timeline mostra um aviso). */
  hasLanes: boolean,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(MIN_TIMELINE_ZOOM);
  const [viewportWidth, setViewportWidth] = useState(0);
  // O zoom mais recente, antes do React renderizar: eventos de pinça chegam
  // vários por quadro e precisam somar.
  const zoomRef = useRef(zoom);
  const anchorRef = useRef<Anchor | null>(null);

  function zoomTo(next: number, clientX?: number) {
    const viewport = viewportRef.current;
    const clamped = clampTimelineZoom(next);

    if (!viewport || clamped === zoomRef.current) {
      return;
    }

    // Vários passos antes de um render (a pinça) mantêm a mesma âncora: a
    // rolagem ainda não foi corrigida para o zoom anterior.
    if (!anchorRef.current) {
      const rect = viewport.getBoundingClientRect();
      const x = clientX ?? rect.left + viewport.clientWidth / 2;
      const offsetX = x - rect.left;

      anchorRef.current = {
        offsetX,
        ratio:
          (viewport.scrollLeft + offsetX) /
          (viewport.clientWidth * zoomRef.current),
      };
    }

    zoomRef.current = clamped;
    setZoom(clamped);
  }

  // Depois que a área ganhou a largura nova, rola para a âncora voltar ao
  // mesmo ponto da tela — antes da pintura, para não pular.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = anchorRef.current;

    anchorRef.current = null;

    if (!viewport || !anchor) {
      return;
    }

    viewport.scrollLeft =
      anchor.ratio * viewport.clientWidth * zoom - anchor.offsetX;
  }, [zoom]);

  const handleWheel = useEffectEvent((event: WheelEvent) => {
    // Sem ctrl é rolagem comum (vertical, ou horizontal no trackpad).
    if (!event.ctrlKey) {
      return;
    }

    event.preventDefault();
    zoomTo(
      zoomRef.current * Math.exp(-event.deltaY * PINCH_SENSITIVITY),
      event.clientX,
    );
  });

  const gestureBaseRef = useRef(MIN_TIMELINE_ZOOM);

  const handleGesture = useEffectEvent(
    (event: Event & { clientX?: number; scale?: number }) => {
      event.preventDefault();

      if (event.type === "gesturestart") {
        gestureBaseRef.current = zoomRef.current;
        return;
      }

      zoomTo(gestureBaseRef.current * (event.scale ?? 1), event.clientX);
    },
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    // Não passivo: só assim o preventDefault segura o zoom da página.
    const options = { passive: false } as const;
    const onWheel = (event: WheelEvent) => handleWheel(event);
    const onGesture = (event: Event) => handleGesture(event);

    viewport.addEventListener("wheel", onWheel, options);
    viewport.addEventListener("gesturestart", onGesture, options);
    viewport.addEventListener("gesturechange", onGesture, options);

    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => setViewportWidth(viewport.clientWidth));

    observer?.observe(viewport);
    setViewportWidth(viewport.clientWidth);

    return () => {
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("gesturestart", onGesture);
      viewport.removeEventListener("gesturechange", onGesture);
      observer?.disconnect();
    };
  }, [hasLanes]);

  /**
   * Rola para deixar um ponto do eixo (0 a 1) à vista, perto da esquerda —
   * o playhead durante o play, que senão sairia da tela com zoom.
   */
  function reveal(ratio: number) {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const x = ratio * viewport.clientWidth * zoomRef.current - viewport.scrollLeft;

    if (x < 0 || x > viewport.clientWidth * 0.9) {
      viewport.scrollLeft =
        ratio * viewport.clientWidth * zoomRef.current -
        viewport.clientWidth * 0.1;
    }
  }

  return { reveal, viewportRef, viewportWidth, zoom, zoomTo };
}
