import {
  createCameraKeyframe,
  createCameraObject,
  findCameraObject,
  withCameraObject,
} from "./camera-objects";
import { DEFAULT_CAMERA_ORBIT } from "./camera-orbit";
import { sampleMotion } from "./scene-motion";
import { createSceneObject } from "./scene-objects";

describe("camera object", () => {
  it("cannot be deleted and has no pose of its own", () => {
    const camera = createCameraObject({ name: "Camera" });

    expect(camera).toMatchObject({
      deletable: false,
      kind: "camera",
      keyframes: [],
      positionX: 0,
      rotationY: 0,
      scale: 1,
    });
  });

  it("finds the camera among the objects", () => {
    const camera = createCameraObject({ name: "Camera" });

    expect(findCameraObject([createSceneObject({ name: "P" }), camera])).toBe(camera);
    expect(findCameraObject([createSceneObject({ name: "P" })])).toBeNull();
  });

  it("gives a scene its camera once, and only when it is missing", () => {
    const phone = createSceneObject({ name: "P" });
    const withCamera = withCameraObject([phone], "Camera");

    expect(withCamera).toHaveLength(2);
    expect(withCameraObject(withCamera, "Camera")).toBe(withCamera);
  });
});

describe("camera keyframes", () => {
  it("hold the orbit and nothing of a pose", () => {
    const keyframe = createCameraKeyframe(500, { ...DEFAULT_CAMERA_ORBIT, azimuth: 40 });

    expect(keyframe.timeMs).toBe(500);
    expect(keyframe.transform.orbit?.azimuth).toBe(40);
    expect(keyframe.transform).toMatchObject({ positionX: 0, scale: 1, opacity: 1 });
  });

  it("move the camera between them, a full turn when the angle says so", () => {
    const camera = {
      ...createCameraObject({ name: "Camera" }),
      keyframes: [
        { ...createCameraKeyframe(0, DEFAULT_CAMERA_ORBIT), easing: "linear" as const },
        {
          ...createCameraKeyframe(1000, { ...DEFAULT_CAMERA_ORBIT, azimuth: 360, distance: 15 }),
          easing: "linear" as const,
        },
      ],
    };

    const half = sampleMotion(camera, 500)?.orbit;

    expect(half?.azimuth).toBe(180);
    expect(half?.distance).toBe(10);
  });

  it("hold the first orbit before and the last after", () => {
    const camera = {
      ...createCameraObject({ name: "Camera" }),
      keyframes: [
        createCameraKeyframe(500, { ...DEFAULT_CAMERA_ORBIT, azimuth: 10 }),
        createCameraKeyframe(1500, { ...DEFAULT_CAMERA_ORBIT, azimuth: 50 }),
      ],
    };

    expect(sampleMotion(camera, 0)?.orbit?.azimuth).toBe(10);
    expect(sampleMotion(camera, 9000)?.orbit?.azimuth).toBe(50);
  });
});
