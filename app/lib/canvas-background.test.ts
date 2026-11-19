import {
  DEFAULT_CANVAS_BACKGROUND,
  getCanvasBackgroundCss,
  getDefaultGradientColor,
  getGradientLine,
  hasFloorGrid,
  mergeCanvasBackground,
  normalizeCanvasBackground,
  toStoredCanvasBackground,
} from "./canvas-background";

describe("canvas background", () => {
  it("reads anything unknown as the floor, as scenes always were", () => {
    expect(normalizeCanvasBackground(undefined)).toEqual(DEFAULT_CANVAS_BACKGROUND);
    expect(normalizeCanvasBackground({ style: "nope" })).toEqual(DEFAULT_CANVAS_BACKGROUND);
  });

  it("keeps a valid flat gradient and drops a broken one", () => {
    expect(
      normalizeCanvasBackground({
        gradient: { angle: 90, color: "#FF0000" },
        style: "flat",
      }),
    ).toEqual({ gradient: { angle: 90, color: "#ff0000" }, style: "flat" });
    expect(
      normalizeCanvasBackground({ gradient: { angle: 90, color: "red" }, style: "flat" }),
    ).toEqual({ gradient: null, style: "flat" });
    expect(
      normalizeCanvasBackground({ gradient: { angle: -90, color: "#000000" }, style: "flat" })
        .gradient?.angle,
    ).toBe(270);
  });

  it("stores nothing for the floor, so a forgotten gradient isn't an unsaved change", () => {
    expect(
      toStoredCanvasBackground({
        gradient: { angle: 45, color: "#000000" },
        style: "floor",
      }),
    ).toBeNull();
    expect(toStoredCanvasBackground({ gradient: null, style: "flat" })).toEqual({
      gradient: null,
      style: "flat",
    });
  });

  it("merges a field at a time, keeping what the patch doesn't bring", () => {
    const current = { gradient: { angle: 45, color: "#000000" }, style: "flat" as const };

    // Só a cor, de um seletor com um render antigo: o ângulo de agora fica.
    expect(mergeCanvasBackground(current, { gradient: { color: "#ff0000" } })).toEqual({
      gradient: { angle: 45, color: "#ff0000" },
      style: "flat",
    });
    expect(mergeCanvasBackground(current, { gradient: null }).gradient).toBeNull();
    // Voltar ao chão deixa o degradê de lado.
    expect(mergeCanvasBackground(current, { style: "floor" })).toEqual(DEFAULT_CANVAS_BACKGROUND);
  });

  it("starts a gradient darker on a light color and lighter on a dark one", () => {
    expect(getDefaultGradientColor("#ffffff")).toBe("#b3b3b3");
    expect(getDefaultGradientColor("#000000")).toBe("#4d4d4d");
  });

  it("has floor lines only in the floor style", () => {
    expect(hasFloorGrid(DEFAULT_CANVAS_BACKGROUND)).toBe(true);
    expect(hasFloorGrid({ gradient: null, style: "flat" })).toBe(false);
  });

  it("draws a gradient only when flat", () => {
    const gradient = { angle: 180, color: "#000000" };

    expect(getCanvasBackgroundCss("#ffffff", { gradient, style: "flat" })).toBe(
      "linear-gradient(180deg, #ffffff, #000000)",
    );
    expect(getCanvasBackgroundCss("#ffffff", { gradient, style: "floor" })).toBe("#ffffff");
  });

  describe("gradient line, like CSS", () => {
    const close = (line: ReturnType<typeof getGradientLine>) =>
      Object.fromEntries(Object.entries(line).map(([key, value]) => [key, Math.round(value) + 0]));

    it("runs top to bottom at 180°, edge to edge", () => {
      expect(close(getGradientLine(200, 100, 180))).toEqual({ x0: 100, x1: 100, y0: 0, y1: 100 });
    });

    it("runs left to right at 90°", () => {
      expect(close(getGradientLine(200, 100, 90))).toEqual({ x0: 0, x1: 200, y0: 50, y1: 50 });
    });

    it("reaches past the corners on a diagonal, so they land on the ends", () => {
      // 45° num quadrado de 100: comprimento 100·√2, de canto a canto.
      expect(close(getGradientLine(100, 100, 45))).toEqual({ x0: 0, x1: 100, y0: 100, y1: 0 });
    });
  });
});
