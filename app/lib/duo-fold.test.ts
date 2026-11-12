import { getDuoFoldPose } from "./duo-fold";

describe("getDuoFoldPose", () => {
  it("leaves the open device flat and centered on the hinge", () => {
    const pose = getDuoFoldPose(180, 280, 10);

    expect(pose.coverRotation).toBeCloseTo(0);
    expect(pose.shiftX).toBeCloseTo(0);
    expect(pose.shiftZ).toBeCloseTo(0);
  });

  it("folds the cover all the way over and re-centers the closed device", () => {
    const pose = getDuoFoldPose(0, 280, 10);

    expect(pose.coverRotation).toBeCloseTo(Math.PI);
    // Fechado ele ocupa só a metade da base: volta meia metade para o centro.
    expect(pose.shiftX).toBeCloseTo(-140);
    expect(pose.shiftZ).toBeCloseTo(-10);
  });

  it("stands the cover upright at 90°", () => {
    const pose = getDuoFoldPose(90, 280, 10);

    expect(pose.coverRotation).toBeCloseTo(Math.PI / 2);
    expect(pose.shiftX).toBeCloseTo(-70);
  });

  it("clamps the angle to what the hinge allows", () => {
    expect(getDuoFoldPose(400, 280, 10)).toEqual(getDuoFoldPose(180, 280, 10));
    expect(getDuoFoldPose(-30, 280, 10)).toEqual(getDuoFoldPose(0, 280, 10));
  });
});
