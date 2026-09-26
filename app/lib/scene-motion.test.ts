import { createSceneObject } from "./scene-objects";
import {
  MAX_KEYFRAMES,
  addKeyframe,
  applyEasing,
  captureTransform,
  getMotionDuration,
  hasMotion,
  moveKeyframe,
  removeKeyframe,
  resolveKeyframeTransform,
  sampleMotion,
  startMotion,
  updateKeyframe,
} from "./scene-motion";

function makeObject() {
  return createSceneObject({ id: "object-1", name: "Object 1" });
}

function withMotion() {
  const object = makeObject();

  return { ...object, keyframes: startMotion(object) };
}

describe("scene-motion", () => {
  it("starts motion with two keyframes copied from the static pose", () => {
    const object = { ...makeObject(), positionX: 4 };
    const keyframes = startMotion(object);

    expect(keyframes).toHaveLength(2);
    expect(keyframes[0].transform).toEqual(captureTransform(object));
    expect(keyframes[1].transform).toEqual(captureTransform(object));
  });

  it("keeps the first keyframe independent from the static pose", () => {
    const object = withMotion();
    // Mexer no objeto parado não pode arrastar o keyframe junto.
    const moved = { ...object, positionX: 12 };

    expect(resolveKeyframeTransform(moved, 0).positionX).toBe(0);
    expect(moved.positionX).toBe(12);
  });

  it("caps the keyframe count", () => {
    let object = withMotion();

    for (let i = 0; i < 10; i += 1) {
      object = { ...object, keyframes: addKeyframe(object) };
    }

    expect(object.keyframes).toHaveLength(MAX_KEYFRAMES);
  });

  it("turns motion off when removing would leave a single keyframe", () => {
    const object = withMotion();
    const next = removeKeyframe(object.keyframes, object.keyframes[1].id);

    expect(next).toEqual([]);
    expect(hasMotion({ ...object, keyframes: next })).toBe(false);
  });

  it("drops the removed keyframe and keeps the rest untouched", () => {
    let object = withMotion();
    object = { ...object, keyframes: addKeyframe(object) };

    const next = removeKeyframe(object.keyframes, object.keyframes[0].id);

    expect(next).toHaveLength(2);
    expect(next.map((keyframe) => keyframe.id)).toEqual([
      object.keyframes[1].id,
      object.keyframes[2].id,
    ]);
  });

  it("sums only the segments that follow the first keyframe", () => {
    const object = withMotion();
    const keyframes = updateKeyframe(object.keyframes, object.keyframes[1].id, {
      durationMs: 1200,
    });

    expect(getMotionDuration(keyframes)).toBe(1200);
  });

  it("interpolates between the resting pose and the next keyframe", () => {
    const base = makeObject();
    const object = {
      ...base,
      positionX: 0,
      keyframes: [
        {
          durationMs: 0,
          easing: "linear" as const,
          id: "a",
          transform: { ...captureTransform(base), positionX: 0 },
        },
        {
          durationMs: 1000,
          easing: "linear" as const,
          id: "b",
          transform: { ...captureTransform(base), positionX: 10 },
        },
      ],
    };

    expect(sampleMotion(object, 0)?.positionX).toBe(0);
    expect(sampleMotion(object, 500)?.positionX).toBeCloseTo(5);
    expect(sampleMotion(object, 1000)?.positionX).toBeCloseTo(10);
  });

  it("holds the last pose past the end instead of looping", () => {
    const base = makeObject();
    const object = {
      ...base,
      keyframes: [
        {
          durationMs: 0,
          easing: "linear" as const,
          id: "a",
          transform: captureTransform(base),
        },
        {
          durationMs: 500,
          easing: "linear" as const,
          id: "b",
          transform: { ...captureTransform(base), scale: 3 },
        },
      ],
    };

    expect(sampleMotion(object, 99999)?.scale).toBe(3);
  });

  it("swaps a keyframe with its neighbour, poses and all", () => {
    const base = makeObject();
    const keyframes = [
      {
        durationMs: 800,
        easing: "linear" as const,
        id: "a",
        transform: { ...captureTransform(base), positionX: 1 },
      },
      {
        durationMs: 1200,
        easing: "ease-out" as const,
        id: "b",
        transform: { ...captureTransform(base), positionX: 9 },
      },
    ];

    const next = moveKeyframe(keyframes, "b", -1);

    expect(next?.map((keyframe) => keyframe.id)).toEqual(["b", "a"]);
    expect(next?.[0].transform.positionX).toBe(9);
    expect(next?.[1].transform.positionX).toBe(1);
  });

  it("carries duration and easing along with the keyframe", () => {
    const object = withMotion();
    const keyframes = updateKeyframe(object.keyframes, object.keyframes[1].id, {
      durationMs: 1200,
      easing: "ease-out",
    });

    const next = moveKeyframe(keyframes, keyframes[1].id, -1);

    expect(next?.[0].durationMs).toBe(1200);
    expect(next?.[0].easing).toBe("ease-out");
  });

  it("refuses to move past either end", () => {
    const { keyframes } = withMotion();

    expect(moveKeyframe(keyframes, keyframes[0].id, -1)).toBeNull();
    expect(moveKeyframe(keyframes, keyframes[1].id, 1)).toBeNull();
    expect(moveKeyframe(keyframes, "inexistente", 1)).toBeNull();
  });

  it("returns null for objects without motion", () => {
    expect(sampleMotion(makeObject(), 100)).toBeNull();
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
});
