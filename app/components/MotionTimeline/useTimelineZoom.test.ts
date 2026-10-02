import {
  MAX_TIMELINE_ZOOM,
  clampTimelineZoom,
  formatTick,
  getTickStepMs,
} from "./useTimelineZoom";

describe("timeline zoom helpers", () => {
  it("keeps the zoom between the whole scene and 40×", () => {
    expect(clampTimelineZoom(0.2)).toBe(1);
    expect(clampTimelineZoom(3)).toBe(3);
    expect(clampTimelineZoom(999)).toBe(MAX_TIMELINE_ZOOM);
  });

  it("picks the finest ruler step that still leaves room for labels", () => {
    // 600 px para 5 s, sem zoom: segundos inteiros (120 px).
    expect(getTickStepMs(600 / 5000)).toBe(1000);
    // Com zoom de 2×, meio segundo já cabe (120 px a cada 500 ms).
    expect(getTickStepMs((600 * 2) / 5000)).toBe(500);
    // Com zoom de 10×, décimos de segundo (120 px a cada 100 ms).
    expect(getTickStepMs((600 * 10) / 5000)).toBe(100);
    // Cena longa sem zoom: marcas bem espaçadas.
    expect(getTickStepMs(600 / 60000)).toBe(10000);
  });

  it("labels fine ticks with a decimal and coarse ones without", () => {
    expect(formatTick(1500, 500)).toBe("1.5s");
    expect(formatTick(2000, 1000)).toBe("2s");
  });
});
