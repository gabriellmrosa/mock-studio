import { findFrameIndex, getLoopTime } from "./animated-image";

describe("getLoopTime", () => {
  it("goes round and round", () => {
    expect(getLoopTime(0, 1000)).toBe(0);
    expect(getLoopTime(1000, 1000)).toBe(0);
    expect(getLoopTime(2500, 1000)).toBe(500);
  });

  it("applies the speed before looping", () => {
    expect(getLoopTime(600, 1000, 2)).toBe(200);
    expect(getLoopTime(1000, 1000, 0.5)).toBe(500);
  });

  it("answers a negative instant (scrubbing back) inside the loop", () => {
    expect(getLoopTime(-250, 1000)).toBe(750);
  });

  it("holds the start when there is no duration", () => {
    expect(getLoopTime(500, 0)).toBe(0);
    expect(getLoopTime(500, NaN)).toBe(0);
  });
});

describe("findFrameIndex", () => {
  // Quadros de 100, 50 e 200 ms: terminam em 100, 150 e 350.
  const ends = [100, 150, 350];

  it("takes the frame that is showing at the instant", () => {
    expect(findFrameIndex(ends, 0)).toBe(0);
    expect(findFrameIndex(ends, 99)).toBe(0);
    expect(findFrameIndex(ends, 100)).toBe(1);
    expect(findFrameIndex(ends, 149)).toBe(1);
    expect(findFrameIndex(ends, 150)).toBe(2);
    expect(findFrameIndex(ends, 349)).toBe(2);
  });

  it("stays on the last frame when the instant overshoots", () => {
    expect(findFrameIndex(ends, 9999)).toBe(2);
  });

  it("works with a single frame", () => {
    expect(findFrameIndex([100], 50)).toBe(0);
  });
});
