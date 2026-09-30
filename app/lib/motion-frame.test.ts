import {
  clampFrameSide,
  findMotionFramePreset,
  formatMotionFrameRatio,
  normalizeMotionFrame,
  resizeMotionFrame,
} from "./motion-frame";

describe("motion frame", () => {
  it("keeps sides even and within 64–3840 px", () => {
    expect(clampFrameSide(649)).toBe(650);
    expect(clampFrameSide(10)).toBe(64);
    expect(clampFrameSide(9999)).toBe(3840);
    expect(clampFrameSide(Number.NaN)).toBe(64);
  });

  it("changes one side freely when the ratio is not locked", () => {
    expect(
      resizeMotionFrame({ height: 1080, width: 1920 }, "width", 648, false),
    ).toEqual({ height: 1080, width: 648 });
  });

  it("carries the other side along when the ratio is locked", () => {
    expect(
      resizeMotionFrame({ height: 1080, width: 1920 }, "height", 720, true),
    ).toEqual({ height: 720, width: 1280 });
  });

  it("lets the other side's limit win, keeping the ratio", () => {
    // 9:16 com 3840 de altura pediria 6827 de largura: a largura trava no
    // máximo e a altura recua para manter a proporção.
    expect(
      resizeMotionFrame({ height: 1080, width: 1920 }, "height", 3840, true),
    ).toEqual({ height: 2160, width: 3840 });
  });

  it("names a preset ratio and shows any other as a decimal", () => {
    expect(formatMotionFrameRatio({ height: 720, width: 1280 }, "en-US")).toBe(
      "16:9",
    );
    expect(formatMotionFrameRatio({ height: 412, width: 648 }, "en-US")).toBe(
      "1.57:1",
    );
    expect(formatMotionFrameRatio({ height: 412, width: 648 }, "pt-BR")).toBe(
      "1,57:1",
    );
  });

  it("finds only exact presets", () => {
    expect(findMotionFramePreset({ height: 1350, width: 1080 })?.label).toBe(
      "4:5",
    );
    expect(findMotionFramePreset({ height: 720, width: 1280 })).toBeNull();
  });

  it("reads stored frames defensively", () => {
    expect(normalizeMotionFrame({ height: 411, width: 648 })).toEqual({
      height: 412,
      width: 648,
    });
    expect(normalizeMotionFrame({ width: 648 })).toBeNull();
    expect(normalizeMotionFrame("1920x1080")).toBeNull();
  });
});
