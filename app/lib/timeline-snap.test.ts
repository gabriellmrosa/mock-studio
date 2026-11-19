import { snapDelta } from "./timeline-snap";

const step = (ms: number) => Math.round(ms / 50) * 50;

describe("snapDelta", () => {
  it("lands the end of a clip exactly on a nearby keyframe, off the 50 ms grid", () => {
    // O clipe termina em 14.638 s (duração do arquivo); o keyframe está em 14.600.
    const result = snapDelta({
      edgesMs: [14_638],
      fallback: step,
      rawDeltaMs: -30,
      targetsMs: [14_600],
      thresholdMs: 20,
    });

    expect(14_638 + result.deltaMs).toBe(14_600);
    expect(result.guideMs).toBe(14_600);
  });

  it("lands exactly on the target, with no floating-point leftover", () => {
    // O arrasto vem de pixels, então o deslocamento cru tem casas decimais:
    // somar e subtrair deixava 30.000000000000004 em vez de 30, e um keyframe
    // um fio depois (ou antes) do fim da cena.
    const result = snapDelta({
      edgesMs: [50],
      fallback: step,
      rawDeltaMs: -17.889999999994824,
      targetsMs: [30],
      thresholdMs: 20,
    });

    expect(50 + result.deltaMs).toBe(30);
  });

  it("falls back to the usual step when nothing is near", () => {
    expect(
      snapDelta({
        edgesMs: [1_000],
        fallback: step,
        rawDeltaMs: 120,
        targetsMs: [5_000],
        thresholdMs: 20,
      }),
    ).toEqual({ deltaMs: 100, guideMs: null });
  });

  it("uses whichever edge of the item is closest to a target", () => {
    // Um clipe de 1 s a 3 s: o fim está mais perto do alvo em 3.010.
    const result = snapDelta({
      edgesMs: [1_000, 3_000],
      fallback: step,
      rawDeltaMs: 0,
      targetsMs: [990, 3_005],
      thresholdMs: 20,
    });

    expect(result.deltaMs).toBe(5);
    expect(result.guideMs).toBe(3_005);
  });
});
