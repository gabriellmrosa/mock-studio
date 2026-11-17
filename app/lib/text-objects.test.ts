import {
  DEFAULT_TEXT,
  MAX_TEXT_FONT_SIZE,
  MAX_TEXT_LENGTH,
  MIN_TEXT_FONT_SIZE,
  createTextObject,
  duplicateTextObject,
  isDefaultTextPose,
  normalizeSceneText,
  resetTextObject,
  toRenderableText,
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
  createKeyframe,
  getObjectMotionEnd,
  insertKeyframe,
  sampleMotion,
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
    // O campo de cor aceita #rgb: vira #rrggbb, não cai no padrão.
    expect(normalizeSceneText({ color: "#F80" }).color).toBe("#ff8800");
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

describe("toRenderableText", () => {
  it("keeps Portuguese and English, with accents and common punctuation", () => {
    const text = "Lançamento — “ação” é 5€… ÀÉÎÕÜ\nsegunda linha";

    expect(toRenderableText(text)).toBe(text);
  });

  it("turns what the fonts do not have into a question mark, one per character", () => {
    expect(toRenderableText("Olá 日本 😀")).toBe("Olá ?? ?");
  });

  it("normalizes line breaks", () => {
    expect(toRenderableText("a\r\nb\rc")).toBe("a\nb\nc");
  });
});

describe("duplicating and resetting a text", () => {
  it("duplicates it offset, with its own id, keyframes and text", () => {
    const source = {
      ...createTextObject({ content: "Olá", name: "Título", id: "a" }),
      keyframes: insertKeyframe(
        createTextObject({ content: "x", name: "T" }),
        500,
      ).keyframes,
      positionX: 1,
    };
    const copy = duplicateTextObject({ name: "Título copy", source });

    expect(copy.id).not.toBe("a");
    expect(copy.positionX).toBeGreaterThan(1);
    expect(copy.positionY).toBeLessThan(source.positionY);
    expect(copy.text).toEqual(source.text);
    expect(copy.text).not.toBe(source.text);
    expect(copy.keyframes[0].id).not.toBe(source.keyframes[0].id);
  });

  it("knows when the pose is the default and resets it", () => {
    const text = createTextObject({ content: "x", name: "T" });
    const moved = { ...text, positionX: 2, rotationZ: 30, opacity: 0.4 };

    expect(isDefaultTextPose(text)).toBe(true);
    expect(isDefaultTextPose(moved)).toBe(false);

    const reset = resetTextObject(moved);

    expect(isDefaultTextPose(reset)).toBe(true);
    // O que ele diz e como se vê não é pose: o reset não toca.
    expect(reset.text).toEqual(moved.text);
  });
});

describe("text weight in the model", () => {
  it("brings the weight of an old template (regular, bold) to the numeric scale", () => {
    expect(normalizeSceneText({ weight: "bold" as never }).weight).toBe(700);
    expect(normalizeSceneText({ weight: "regular" as never }).weight).toBe(400);
  });

  it("moves the weight to one the new font has when the font changes", () => {
    const thin = normalizeSceneText({ fontId: "inter", weight: 100 });

    expect(thin.weight).toBe(100);
    expect(normalizeSceneText({ ...thin, fontId: "playfair-display" }).weight).toBe(400);
  });
});


describe("text style in keyframes", () => {
  function textWithKeyframes() {
    const base = createTextObject({
      content: "Hi",
      name: "T",
      text: { color: "#000000", letterSpacing: 0 },
    });
    const first = createKeyframe(0, captureTransform(base), "linear");
    const last = createKeyframe(
      1000,
      { ...captureTransform(base), letterSpacing: 0.2, textColor: "#ffffff" },
      "linear",
    );

    return { ...base, keyframes: [first, last] };
  }

  it("captures the text color and letter spacing, which devices never have", () => {
    const text = createTextObject({ content: "Hi", name: "T" });

    expect(captureTransform(text)).toMatchObject({
      letterSpacing: text.text.letterSpacing,
      textColor: text.text.color,
    });
    expect(captureTransform(createSceneObject({ id: "d", name: "D" }))).not.toHaveProperty(
      "textColor",
    );
  });

  it("blends color and letter spacing between keyframes", () => {
    const mid = sampleMotion(textWithKeyframes(), 500);

    expect(mid?.textColor).toBe("#808080");
    expect(mid?.letterSpacing).toBeCloseTo(0.1);
  });

  it("leaves them out when no keyframe has them", () => {
    const device = createSceneObject({ id: "d", name: "D" });
    const keyframes = [createKeyframe(0, captureTransform(device))];

    expect(sampleMotion({ ...device, keyframes }, 0)).not.toHaveProperty(
      "textColor",
    );
  });

  it("holds the value when only one side has it", () => {
    const text = textWithKeyframes();
    const keyframes = [
      {
        ...text.keyframes[0],
        transform: { ...text.keyframes[0].transform, textColor: undefined },
      },
      text.keyframes[1],
    ];

    expect(sampleMotion({ ...text, keyframes }, 500)?.textColor).toBe("#ffffff");
  });
});
