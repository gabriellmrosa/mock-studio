import {
  DEFAULT_SCREEN_FIT,
  createSceneObject,
  duplicateSceneObject,
  getScreenVideoTime,
} from "./scene-objects";
import {
  DEFAULT_BEZIER,
  applyEasing,
  captureTransform,
  clampBezier,
  solveCubicBezier,
  createKeyframe,
  findKeyframeAt,
  getObjectMotionEnd,
  getSceneMotionDuration,
  hasMotion,
  insertKeyframe,
  moveKeyframeTo,
  removeKeyframe,
  sampleMotion,
  shiftKeyframes,
  updateKeyframe,
  type EasingId,
} from "./scene-motion";

function makeObject() {
  return createSceneObject({ id: "object-1", name: "Object 1" });
}

/** Objeto com keyframes em X nos instantes dados: [[timeMs, positionX], ...]. */
function withKeyframes(
  points: Array<[number, number]>,
  easing: EasingId = "linear",
) {
  const base = makeObject();

  return {
    ...base,
    keyframes: points.map(([timeMs, positionX], index) => ({
      easing,
      id: `k${index}`,
      timeMs,
      transform: { ...captureTransform(base), positionX },
    })),
  };
}

describe("scene-motion", () => {
  it("creates the first keyframe from the static pose", () => {
    const object = { ...makeObject(), positionX: 4 };
    const { id, keyframes } = insertKeyframe(object, 1200);

    expect(keyframes).toHaveLength(1);
    expect(keyframes[0].id).toBe(id);
    expect(keyframes[0].timeMs).toBe(1200);
    expect(keyframes[0].transform).toEqual(captureTransform(object));
  });

  it("treats a single keyframe as motion that holds its pose", () => {
    const object = withKeyframes([[500, 7]]);

    expect(hasMotion(object)).toBe(true);
    expect(sampleMotion(object, 0)?.positionX).toBe(7);
    expect(sampleMotion(object, 9999)?.positionX).toBe(7);
  });

  it("inserts mid-segment with the interpolated pose, so nothing jumps", () => {
    const object = withKeyframes([
      [0, 0],
      [1000, 10],
    ]);
    const { id, keyframes } = insertKeyframe(object, 500);

    expect(keyframes.map((keyframe) => keyframe.id)).toEqual(["k0", id, "k1"]);
    expect(keyframes[1].transform.positionX).toBeCloseTo(5);
  });

  it("reuses the keyframe already sitting at that instant", () => {
    const object = withKeyframes([
      [0, 0],
      [1000, 10],
    ]);
    const result = insertKeyframe(object, 1000);

    expect(result.id).toBe("k1");
    expect(result.keyframes).toBe(object.keyframes);
    expect(findKeyframeAt(object.keyframes, 1000)?.id).toBe("k1");
    expect(findKeyframeAt(object.keyframes, 999)).toBeNull();
  });

  it("keeps the first keyframe independent from the static pose", () => {
    const object = withKeyframes([[0, 0]]);
    // Mexer no objeto parado não pode arrastar o keyframe junto.
    const moved = { ...object, positionX: 12 };

    expect(sampleMotion(moved, 0)?.positionX).toBe(0);
  });

  it("has no keyframe limit", () => {
    let object = makeObject();

    for (let i = 0; i < 12; i += 1) {
      object = { ...object, keyframes: insertKeyframe(object, i * 100).keyframes };
    }

    expect(object.keyframes).toHaveLength(12);
  });

  it("can remove down to one keyframe or none", () => {
    const object = withKeyframes([
      [0, 0],
      [1000, 10],
    ]);
    const one = removeKeyframe(object.keyframes, "k1");

    expect(one.map((keyframe) => keyframe.id)).toEqual(["k0"]);
    expect(removeKeyframe(one, "k0")).toEqual([]);
  });

  it("reorders by time when a keyframe is dragged past its neighbour", () => {
    const object = withKeyframes([
      [0, 1],
      [1000, 9],
    ]);
    const next = moveKeyframeTo(object.keyframes, "k0", 1500);

    expect(next.map((keyframe) => keyframe.id)).toEqual(["k1", "k0"]);
    expect(next[1].transform.positionX).toBe(1);
    expect(next[1].timeMs).toBe(1500);
  });

  it("never moves a keyframe before zero", () => {
    const object = withKeyframes([[500, 0]]);

    expect(moveKeyframeTo(object.keyframes, "k0", -300)[0].timeMs).toBe(0);
  });

  it("shifts the whole track keeping the gaps, stopping at zero", () => {
    const object = withKeyframes([
      [400, 0],
      [1000, 10],
    ]);

    expect(
      shiftKeyframes(object.keyframes, 250).map((keyframe) => keyframe.timeMs),
    ).toEqual([650, 1250]);
    expect(
      shiftKeyframes(object.keyframes, -900).map((keyframe) => keyframe.timeMs),
    ).toEqual([0, 600]);
  });

  it("changes the easing of the segment that arrives at a keyframe", () => {
    const object = withKeyframes([
      [0, 0],
      [1000, 10],
    ]);
    const eased = {
      ...object,
      keyframes: updateKeyframe(object.keyframes, "k1", { easing: "ease-in" }),
    };

    expect(sampleMotion(object, 250)?.positionX).toBeCloseTo(2.5);
    expect(sampleMotion(eased, 250)?.positionX).toBeCloseTo(0.625);
  });

  it("interpolates between keyframes on absolute time", () => {
    const object = withKeyframes([
      [500, 0],
      [1500, 10],
    ]);

    // Antes do primeiro keyframe o objeto segura a pose dele...
    expect(sampleMotion(object, 0)?.positionX).toBe(0);
    expect(sampleMotion(object, 500)?.positionX).toBe(0);
    // ...e o movimento acontece entre os dois instantes.
    expect(sampleMotion(object, 1000)?.positionX).toBeCloseTo(5);
    expect(sampleMotion(object, 1500)?.positionX).toBeCloseTo(10);
  });

  it("animates opacity like the rest of the pose, holding it before the first keyframe", () => {
    const base = makeObject();
    const object = {
      ...base,
      keyframes: [
        { easing: "linear" as const, id: "a", timeMs: 1000, transform: { ...captureTransform(base), opacity: 0 } },
        { easing: "linear" as const, id: "b", timeMs: 2000, transform: { ...captureTransform(base), opacity: 1 } },
      ],
    };

    // Um objeto que "entra" em 1 s: invisível antes, segurando o primeiro
    // keyframe, e aparecendo no trecho até o segundo.
    expect(sampleMotion(object, 0)?.opacity).toBe(0);
    expect(sampleMotion(object, 1500)?.opacity).toBeCloseTo(0.5);
    expect(sampleMotion(object, 2000)?.opacity).toBe(1);
  });

  it("holds the last pose past the end instead of looping", () => {
    const object = withKeyframes([
      [0, 0],
      [500, 3],
    ]);

    expect(sampleMotion(object, 99999)?.positionX).toBe(3);
  });

  it("returns null for objects without keyframes", () => {
    expect(sampleMotion(makeObject(), 100)).toBeNull();
    expect(hasMotion(makeObject())).toBe(false);
  });

  it("takes the scene duration from whichever keyframe comes last", () => {
    const short = withKeyframes([
      [0, 0],
      [800, 1],
    ]);
    const late = withKeyframes([
      [2000, 0],
      [2800, 1],
    ]);

    expect(getObjectMotionEnd(late)).toBe(2800);
    expect(getSceneMotionDuration([short, late])).toBe(2800);
    expect(getSceneMotionDuration([makeObject()])).toBe(0);
  });

  it("gives duplicated objects their own keyframe ids", () => {
    const source = withKeyframes([
      [0, 0],
      [1000, 10],
    ]);
    const copy = duplicateSceneObject({
      name: "Object 2",
      objects: [source],
      source,
    });

    expect(copy.keyframes.map((keyframe) => keyframe.timeMs)).toEqual([0, 1000]);
    expect(copy.keyframes[0].id).not.toBe(source.keyframes[0].id);
  });

  it("rounds keyframe times to whole milliseconds", () => {
    expect(createKeyframe(12.6, captureTransform(makeObject())).timeMs).toBe(13);
  });

  it("clamps easing input and keeps the endpoints exact", () => {
    for (const easing of ["linear", "ease-in", "ease-out", "ease-in-out"] as const) {
      expect(applyEasing(easing, -1)).toBe(0);
      expect(applyEasing(easing, 0)).toBe(0);
      expect(applyEasing(easing, 1)).toBe(1);
      expect(applyEasing(easing, 2)).toBe(1);
    }
  });

  it("eases in slower than linear at the start", () => {
    expect(applyEasing("ease-in", 0.25)).toBeLessThan(0.25);
    expect(applyEasing("ease-out", 0.25)).toBeGreaterThan(0.25);
  });

  describe("cubic-bezier", () => {
    it("matches the CSS curve at known points", () => {
      // Valores de referência do cubic-bezier() dos navegadores.
      expect(solveCubicBezier([0, 0, 1, 1], 0.3)).toBeCloseTo(0.3, 4);
      expect(solveCubicBezier(DEFAULT_BEZIER, 0.5)).toBeCloseTo(0.8024, 3);
      expect(solveCubicBezier([0.42, 0, 1, 1], 0.5)).toBeCloseTo(0.3153, 3);
    });

    it("keeps the endpoints exact and allows overshoot in between", () => {
      const overshoot = [0.3, 1.5, 0.7, 1.5] as const;

      expect(applyEasing("cubic-bezier", 0, [...overshoot])).toBe(0);
      expect(applyEasing("cubic-bezier", 1, [...overshoot])).toBe(1);
      expect(applyEasing("cubic-bezier", 0.6, [...overshoot])).toBeGreaterThan(1);
    });

    it("drives sampling with the keyframe's own curve", () => {
      const object = withKeyframes([
        [0, 0],
        [1000, 10],
      ]);
      const curved = {
        ...object,
        keyframes: updateKeyframe(object.keyframes, "k1", {
          bezier: [0.42, 0, 1, 1],
          easing: "cubic-bezier",
        }),
      };

      expect(sampleMotion(curved, 500)?.positionX).toBeCloseTo(3.153, 2);
    });

    it("clamps x to the unit interval and y to the overshoot range", () => {
      expect(clampBezier([-0.2, -3, 1.4, 9])).toEqual([0, -0.5, 1, 1.5]);
    });
  });

  describe("screen video", () => {
    const video = {
      durationMs: 4000,
      fit: { ...DEFAULT_SCREEN_FIT },
      name: "recording.mp4",
      startMs: 1000,
      url: "blob:x",
    };

    it("holds the first frame before the start and the last after the end", () => {
      expect(getScreenVideoTime(video, 0)).toBe(0);
      expect(getScreenVideoTime(video, 2500)).toBe(1500);
      expect(getScreenVideoTime(video, 99999)).toBe(4000);
    });

    it("extends the scene to the end of the video", () => {
      const object = {
        ...withKeyframes([
          [0, 0],
          [2000, 1],
        ]),
        screenSource: "video" as const,
        screenVideo: video,
      };

      expect(getObjectMotionEnd(object)).toBe(5000);
    });

    it("ignores a stored video while the screen shows the image", () => {
      const object = {
        ...withKeyframes([[2000, 1]]),
        screenSource: "image" as const,
        screenVideo: video,
      };

      expect(getObjectMotionEnd(object)).toBe(2000);
    });
  });
});
