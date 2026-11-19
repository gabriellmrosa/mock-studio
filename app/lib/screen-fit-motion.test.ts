import { createKeyframe, type Keyframe, type MotionTransform } from "./scene-motion";
import { DEFAULT_SCREEN_FIT } from "./scene-objects";
import {
  hasScreenFitMotion,
  normalizeAnimatedScreenFit,
  sampleScreenFit,
  splitScreenFitPatch,
  withCapturedScreenFits,
  withKeyframeScreenFit,
} from "./screen-fit-motion";

const POSE: MotionTransform = {
  opacity: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scale: 1,
};
const file = { ...DEFAULT_SCREEN_FIT, cropTop: 0.1, zoom: 1 };

function keyframe(timeMs: number, extra: Partial<MotionTransform> = {}): Keyframe {
  return { ...createKeyframe(timeMs, { ...POSE, ...extra }), easing: "linear" };
}

describe("screen framing over time", () => {
  it("uses the file's framing while no keyframe has its own", () => {
    const keyframes = [keyframe(0), keyframe(1000)];

    expect(hasScreenFitMotion(keyframes, "main")).toBe(false);
    expect(sampleScreenFit(keyframes, 500, "main", file)).toEqual(file);
  });

  it("slides zoom, position and background from the file's framing to a keyframe's", () => {
    const keyframes = [
      keyframe(0),
      keyframe(1000, {
        screenFit: { background: "#000000", panX: 0, panY: -1, zoom: 2 },
      }),
    ];
    const middle = sampleScreenFit(keyframes, 500, "main", file);

    expect(middle.zoom).toBeCloseTo(1.5);
    expect(middle.panY).toBeCloseTo(-0.5);
    expect(middle.background).toBe("#808080");
    // O corte é do arquivo: não anima.
    expect(middle.cropTop).toBe(0.1);
  });

  it("keeps each Duo screen apart", () => {
    const keyframes = [
      keyframe(0, { outerScreenFit: { background: "#ffffff", panX: 0, panY: 0, zoom: 3 } }),
    ];

    expect(sampleScreenFit(keyframes, 0, "main", file).zoom).toBe(1);
    expect(sampleScreenFit(keyframes, 0, "outer", file).zoom).toBe(3);
  });

  it("writes only what animates into a keyframe, starting from what it shows", () => {
    const edited = withKeyframeScreenFit(keyframe(0), "main", file, {
      cropTop: 0.3,
      zoom: 2,
    });

    expect(edited.transform.screenFit).toEqual({
      background: "#ffffff",
      panX: 0,
      panY: 0,
      zoom: 2,
    });
  });

  it("sends the crop to the file and the rest to the keyframe", () => {
    expect(splitScreenFitPatch({ cropTop: 0.2, panX: 0.5 })).toEqual({
      animated: { panX: 0.5 },
      file: { cropTop: 0.2 },
    });
  });

  it("gives a keyframe added mid-way the framing on screen at that instant", () => {
    const keyframes = [
      keyframe(0),
      keyframe(1000, { screenFit: { background: "#ffffff", panX: 0, panY: 0, zoom: 3 } }),
    ];
    const added = withCapturedScreenFits(keyframe(500), keyframes, { main: file });

    expect(added.transform.screenFit?.zoom).toBeCloseTo(2);
  });

  it("reads a stored framing inside the limits, and drops a broken one", () => {
    expect(
      normalizeAnimatedScreenFit({ background: "#ABCDEF", panX: 5, panY: 0, zoom: 99 }),
    ).toEqual({ background: "#abcdef", panX: 1, panY: 0, zoom: 3 });
    expect(normalizeAnimatedScreenFit({ zoom: 1 })).toBeNull();
  });
});
