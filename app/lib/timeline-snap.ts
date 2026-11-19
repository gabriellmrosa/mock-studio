/**
 * O "ímã" da timeline, como o snapping do Premiere: ao arrastar, a borda que se
 * move gruda exatamente num ponto de outro item (um keyframe, a ponta de um
 * clipe, o playhead, o zero) quando passa a poucos pixels dele.
 *
 * Existe porque o passo do arrasto (`DRAG_STEP_MS`) não basta: o fim de um
 * clipe é o início mais a duração do arquivo, que nunca é redonda, então ele
 * andava de passo em passo por cima do keyframe sem nunca cair nele.
 *
 * A distância é em pixels, convertida para ms pelo zoom de agora: de perto, o
 * ímã pega um intervalo menor de tempo, e de longe, um maior — sempre o mesmo
 * tanto na tela.
 */
export const SNAP_DISTANCE_PX = 8;

export type SnapResult = {
  /** O deslocamento a aplicar, já grudado (ou no passo, se nada estava perto). */
  deltaMs: number;
  /** O ponto em que grudou, para a linha-guia; `null` se não grudou. */
  guideMs: number | null;
};

/**
 * Para um item cujas bordas estão em `edgesMs` antes do arrasto, o
 * deslocamento final: o que leva a borda mais perto de um alvo exatamente até
 * ele, se ela estiver a até `thresholdMs`; senão, o que `fallback` decidir (o
 * passo de sempre).
 */
export function snapDelta({
  edgesMs,
  fallback,
  rawDeltaMs,
  targetsMs,
  thresholdMs,
}: {
  edgesMs: number[];
  fallback: (rawDeltaMs: number) => number;
  rawDeltaMs: number;
  targetsMs: number[];
  thresholdMs: number;
}): SnapResult {
  let best: { distance: number; edge: number; target: number } | null = null;

  for (const edge of edgesMs) {
    const moved = edge + rawDeltaMs;

    for (const target of targetsMs) {
      const distance = Math.abs(target - moved);

      if (distance <= thresholdMs && (!best || distance < best.distance)) {
        best = { distance, edge, target };
      }
    }
  }

  // `alvo - borda`, e não `cru + (alvo - borda movida)`: o deslocamento cru
  // vem de pixels e tem casas decimais, e somar e tirar de novo deixava um
  // resto de ponto flutuante (30.000000000000004). Com a borda e o alvo em ms
  // inteiros, a borda cai exatamente no alvo — e um keyframe grudado no fim da
  // cena não fica um fio depois dele (o objeto sumiria no último quadro).
  return best
    ? { deltaMs: best.target - best.edge, guideMs: best.target }
    : { deltaMs: fallback(rawDeltaMs), guideMs: null };
}
