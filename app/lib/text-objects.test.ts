import {
  DEFAULT_TEXT,
  MAX_TEXT_FONT_SIZE,
  MAX_TEXT_LENGTH,
  MIN_TEXT_FONT_SIZE,
  createTextObject,
  normalizeSceneText,
} from "./text-objects";
import {
  createSceneObject,
  getActiveScreenVideos,
  getSequentialSpawnTransform,
  isDeviceObject,
  isTextObject,
} from "./scene-objects";
import {
  captureTransform,
  getObjectMotionEnd,
  insertKeyframe,
} from "./scene-motion";
import { isTextFontId } from "./text-fonts";

describe("normalizeSceneText", () => {
  it("fills what is missing with the defaults", () => {
    expect(normalizeSceneText(undefined)).toEqual(DEFAULT_TEXT);
    expect(normalizeSceneText({ content: "Olá" })).toEqual({
      ...DEFAULT_TEXT,
      content: "Olá",
    });
  });

  it("keeps the numbers inside their limits", () => {
    expect(normalizeSceneText({ fontSize: 1 }).fontSize).toBe(MIN_TEXT_FONT_SIZE);
    expect(normalizeSceneText({ fontSize: 99999 }).fontSize).toBe(
      MAX_TEXT_FONT_SIZE,
    );
    expect(normalizeSceneText({ lineHeight: 0 }).lineHeight).toBeGreaterThan(0);
    // NaN e Infinity vindos de um link corrompido não chegam ao render.
    expect(normalizeSceneText({ fontSize: Number.NaN }).fontSize).toBe(
      DEFAULT_TEXT.fontSize,
    );
    expect(normalizeSceneText({ letterSpacing: Infinity }).letterSpacing).toBe(
      DEFAULT_TEXT.letterSpacing,
    );
  });

  it("cuts the content at the length limit", () => {
    const { content } = normalizeSceneText({
      content: "a".repeat(MAX_TEXT_LENGTH + 50),
    });

    expect(content).toHaveLength(MAX_TEXT_LENGTH);
  });

  it("falls back on an unknown font, weight, alignment or color", () => {
    const text = normalizeSceneText({
      align: "justify" as never,
      color: "red",
      fontId: "comic-sans" as never,
      weight: "heavy" as never,
    });

    expect(text.fontId).toBe(DEFAULT_TEXT.fontId);
    expect(text.weight).toBe(DEFAULT_TEXT.weight);
    expect(text.align).toBe(DEFAULT_TEXT.align);
    expect(text.color).toBe(DEFAULT_TEXT.color);
    expect(normalizeSceneText({ color: "#ABCDEF" }).color).toBe("#abcdef");
  });

  it("treats a missing or invalid width as fit (no wrapping)", () => {
    expect(normalizeSceneText({}).maxWidth).toBeNull();
    expect(normalizeSceneText({ maxWidth: Number.NaN }).maxWidth).toBeNull();
    expect(normalizeSceneText({ maxWidth: 5 }).maxWidth).toBeGreaterThan(5);
  });
});

describe("text objects", () => {
  it("is born facing the camera, not turned 180 degrees like the devices", () => {
    const object = createTextObject({ content: "Olá", name: "Texto 1" });

    expect(object.kind).toBe("text");
    expect(object.rotationY).toBe(0);
    expect(object.opacity).toBe(1);
    expect(object).not.toHaveProperty("foldAngle");
    expect(createSceneObject({ name: "Phone" }).rotationY).toBe(180);
  });

  it("tells devices and texts apart", () => {
    const text = createTextObject({ content: "x", name: "T" });
    const device = createSceneObject({ name: "D" });

    expect(isTextObject(text)).toBe(true);
    expect(isDeviceObject(text)).toBe(false);
    expect(isDeviceObject(device)).toBe(true);
  });

  it("has no screen, so no video", () => {
    expect(
      getActiveScreenVideos(createTextObject({ content: "x", name: "T" })),
    ).toEqual([]);
  });

  it("captures a pose without the fold angle", () => {
    const pose = captureTransform(createTextObject({ content: "x", name: "T" }));

    expect(pose).not.toHaveProperty("foldAngle");
    expect(pose.scale).toBe(1);
  });

  it("ends at its last keyframe", () => {
    const text = createTextObject({ content: "x", name: "T" });
    const withKeyframes = {
      ...text,
      keyframes: insertKeyframe(text, 2500).keyframes,
    };

    expect(getObjectMotionEnd(withKeyframes)).toBe(2500);
  });

  it("is left out of the spawn position of the devices", () => {
    const text = createTextObject({ content: "x", name: "T" });
    const alone = getSequentialSpawnTransform([], "smartphone");

    expect(getSequentialSpawnTransform([text], "smartphone")).toEqual(alone);
  });
});

describe("text fonts", () => {
  it("recognizes only the fonts in the catalog", () => {
    expect(isTextFontId("inter")).toBe(true);
    expect(isTextFontId("comic-sans")).toBe(false);
    expect(isTextFontId(undefined)).toBe(false);
  });
});
