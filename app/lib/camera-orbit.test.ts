import {
  isSameOrbit,
  DEFAULT_CAMERA_ORBIT,
  isOrbit,
  lerpOrbit,
  lookAtToOrbit,
  normalizeOrbit,
  orbitToLookAt,
} from "./camera-orbit";

const near = (actual: number[], expected: number[]) =>
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 6));

describe("orbitToLookAt", () => {
  it("puts the default camera in front of the target, on +Z", () => {
    const { position, target } = orbitToLookAt(DEFAULT_CAMERA_ORBIT);

    near(position, [0, 0, 5]);
    expect(target).toEqual([0, 0, 0]);
  });

  it("goes round to the side and behind with the azimuth", () => {
    near(orbitToLookAt({ ...DEFAULT_CAMERA_ORBIT, azimuth: 90 }).position, [5, 0, 0]);
    near(orbitToLookAt({ ...DEFAULT_CAMERA_ORBIT, azimuth: 180 }).position, [0, 0, -5]);
    near(orbitToLookAt({ ...DEFAULT_CAMERA_ORBIT, azimuth: 360 }).position, [0, 0, 5]);
  });

  it("looks from above with a positive elevation", () => {
    const { position } = orbitToLookAt({ ...DEFAULT_CAMERA_ORBIT, elevation: 90 });

    near(position, [0, 5, 0]);
  });

  it("orbits around a target that is not the origin", () => {
    const { position } = orbitToLookAt({
      ...DEFAULT_CAMERA_ORBIT,
      targetX: 10,
      targetY: 2,
      targetZ: -3,
    });

    near(position, [10, 2, 2]);
  });
});

describe("lookAtToOrbit", () => {
  it("is the inverse of orbitToLookAt, with the azimuth in (-180, 180]", () => {
    const orbit = {
      azimuth: 40,
      distance: 7,
      elevation: 25,
      fov: 50,
      targetX: 1,
      targetY: -2,
      targetZ: 3,
    };
    const { position, target } = orbitToLookAt(orbit);
    const back = lookAtToOrbit(position, target, 50);

    (Object.keys(orbit) as (keyof typeof orbit)[]).forEach((key) =>
      expect(back[key]).toBeCloseTo(orbit[key], 6),
    );
  });

  it("wraps a full turn back into range", () => {
    const { position, target } = orbitToLookAt({ ...DEFAULT_CAMERA_ORBIT, azimuth: 370 });

    expect(lookAtToOrbit(position, target, 45).azimuth).toBeCloseTo(10, 6);
  });
});

describe("lerpOrbit", () => {
  it("does not take the short way: 0 to 360 is a whole turn", () => {
    const half = lerpOrbit(
      DEFAULT_CAMERA_ORBIT,
      { ...DEFAULT_CAMERA_ORBIT, azimuth: 360 },
      0.5,
    );

    expect(half.azimuth).toBe(180);
  });

  it("blends the distance, the elevation, the lens and the target", () => {
    const mid = lerpOrbit(
      DEFAULT_CAMERA_ORBIT,
      { azimuth: 0, distance: 15, elevation: 20, fov: 85, targetX: 4, targetY: 0, targetZ: 0 },
      0.5,
    );

    expect(mid).toMatchObject({ distance: 10, elevation: 10, fov: 65, targetX: 2 });
  });
});

describe("normalizeOrbit and isOrbit", () => {
  it("fixes what comes from outside and keeps it inside the limits", () => {
    expect(normalizeOrbit(undefined)).toEqual(DEFAULT_CAMERA_ORBIT);
    expect(normalizeOrbit({ elevation: 500, fov: 500, distance: -3 })).toMatchObject({
      distance: 0.001,
      elevation: 85,
      fov: 90,
    });
    expect(normalizeOrbit({ fov: 1 }).fov).toBe(15);
  });

  it("only takes an orbit made of numbers", () => {
    expect(isOrbit(DEFAULT_CAMERA_ORBIT)).toBe(true);
    expect(isOrbit({ ...DEFAULT_CAMERA_ORBIT, fov: "45" })).toBe(false);
    expect(isOrbit(null)).toBe(false);
  });
});

describe("isSameOrbit", () => {
  it("treats the round-trip error through the camera as the same orbit", () => {
    const orbit = { ...DEFAULT_CAMERA_ORBIT, azimuth: -2.02658582089552, distance: 1249.3246684274166 };

    expect(
      isSameOrbit({ ...orbit, azimuth: -2.0265858208955203, distance: 1249.3246684274163 }, orbit),
    ).toBe(true);
  });

  it("sees a real change in any field", () => {
    expect(isSameOrbit({ ...DEFAULT_CAMERA_ORBIT, targetX: 1 }, DEFAULT_CAMERA_ORBIT)).toBe(false);
    expect(isSameOrbit({ ...DEFAULT_CAMERA_ORBIT, fov: 46 }, DEFAULT_CAMERA_ORBIT)).toBe(false);
  });
});

