import {
  DEFAULT_CANVAS_GRID,
  getGridLineColors,
  isDefaultCanvasGrid,
  normalizeCanvasGrid,
} from "./canvas-grid";

describe("getGridLineColors", () => {
  it("keeps the automatic colors as they always were: light lines on a dark background", () => {
    expect(getGridLineColors("#2e2b28", DEFAULT_CANVAS_GRID)).toEqual({
      cell: "#555555",
      section: "#888888",
    });
  });

  it("goes dark on a light background", () => {
    expect(getGridLineColors("#f2ebe0", DEFAULT_CANVAS_GRID)).toEqual({
      cell: "#888888",
      section: "#555555",
    });
  });

  it("uses the chosen color for the sections, and a softer one for the cells", () => {
    expect(getGridLineColors("#000000", { color: "#ff0000", opacity: 1 })).toEqual({
      cell: "#800000",
      section: "#ff0000",
    });
  });

  it("blends the lines into the background by the opacity", () => {
    const half = getGridLineColors("#000000", { color: "#ffffff", opacity: 0.5 });

    expect(half.section).toBe("#808080");
  });

  it("hides the lines at zero opacity, whatever their color", () => {
    expect(getGridLineColors("#2e2b28", { color: "#ffffff", opacity: 0 })).toEqual({
      cell: "#2e2b28",
      section: "#2e2b28",
    });
  });
});

describe("normalizeCanvasGrid", () => {
  it("falls back to the default for anything that is not a grid", () => {
    expect(normalizeCanvasGrid(undefined)).toEqual(DEFAULT_CANVAS_GRID);
    expect(normalizeCanvasGrid("x")).toEqual(DEFAULT_CANVAS_GRID);
    expect(normalizeCanvasGrid({ color: "red", opacity: "a" })).toEqual(DEFAULT_CANVAS_GRID);
  });

  it("keeps a valid color (lowercased) and clamps the opacity", () => {
    expect(normalizeCanvasGrid({ color: "#AABBCC", opacity: 3 })).toEqual({
      color: "#aabbcc",
      opacity: 1,
    });
    expect(normalizeCanvasGrid({ color: null, opacity: -1 }).opacity).toBe(0);
  });

  it("knows the default", () => {
    expect(isDefaultCanvasGrid(DEFAULT_CANVAS_GRID)).toBe(true);
    expect(isDefaultCanvasGrid({ color: "#ffffff", opacity: 1 })).toBe(false);
    expect(isDefaultCanvasGrid({ color: null, opacity: 0.4 })).toBe(false);
  });
});
