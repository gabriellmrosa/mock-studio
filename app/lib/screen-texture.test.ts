import { getCoverUvTransform } from "./screen-texture";

describe("getCoverUvTransform", () => {
  it("keeps the full frame when the proportions already match", () => {
    const { offset, repeat } = getCoverUvTransform(1080, 1920, 540, 960);

    expect(offset[0]).toBeCloseTo(0);
    expect(offset[1]).toBeCloseTo(0);
    expect(repeat[0]).toBeCloseTo(1);
    expect(repeat[1]).toBeCloseTo(1);
  });

  it("crops the sides of a source wider than the screen, centered", () => {
    // 2000×1000 numa tela quadrada: sobra metade da largura.
    const { offset, repeat } = getCoverUvTransform(2000, 1000, 500, 500);

    expect(repeat[0]).toBeCloseTo(0.5);
    expect(repeat[1]).toBeCloseTo(1);
    expect(offset[0]).toBeCloseTo(0.25);
    expect(offset[1]).toBeCloseTo(0);
  });

  it("crops top and bottom of a source taller than the screen", () => {
    // Gravação de iPhone (1179×2556) na tela do Smartphone (421×896).
    const { offset, repeat } = getCoverUvTransform(1179, 2556, 421, 896);

    expect(repeat[0]).toBeCloseTo(1);
    expect(repeat[1]).toBeLessThan(1);
    expect(repeat[1]).toBeGreaterThan(0.97);
    expect(offset[1]).toBeCloseTo((1 - repeat[1]) / 2);
  });
});
