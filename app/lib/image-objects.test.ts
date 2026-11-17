import {
  IMAGE_BASE_WIDTH,
  MAX_IMAGE_ASPECT,
  MIN_IMAGE_ASPECT,
  createImageObject,
  duplicateImageObject,
  getImageSize,
  getStickerImage,
  getSvgAspect,
  isDefaultImagePose,
  normalizeImageAspect,
  normalizeImageSpeed,
  MAX_IMAGE_SPEED,
  MIN_IMAGE_SPEED,
  resetImageObject,
} from "./image-objects";
import { createKeyframe, captureTransform } from "./scene-motion";

describe("image objects", () => {
  it("is born as an empty placeholder, facing the camera", () => {
    const image = createImageObject({ name: "Imagem 1" });

    expect(image).toMatchObject({
      kind: "image",
      image: { aspect: 1, name: null, url: null },
      rotationY: 0,
    });
    expect(isDefaultImagePose(image)).toBe(true);
  });

  it("keeps the width and gets the height from the proportion", () => {
    expect(getImageSize(1)).toEqual([IMAGE_BASE_WIDTH, IMAGE_BASE_WIDTH]);
    expect(getImageSize(2)).toEqual([IMAGE_BASE_WIDTH, IMAGE_BASE_WIDTH / 2]);
    expect(getImageSize(0.5)).toEqual([IMAGE_BASE_WIDTH, IMAGE_BASE_WIDTH * 2]);
  });

  it("keeps the proportion inside sane limits", () => {
    expect(normalizeImageAspect(1e9)).toBe(MAX_IMAGE_ASPECT);
    expect(normalizeImageAspect(0)).toBe(MIN_IMAGE_ASPECT);
    expect(normalizeImageAspect(NaN)).toBe(1);
    expect(normalizeImageAspect("2")).toBe(1);
    expect(createImageObject({ name: "x", image: { aspect: -3 } }).image.aspect).toBe(
      MIN_IMAGE_ASPECT,
    );
  });

  it("duplicates offset from the original, with its own keyframe ids", () => {
    const source = createImageObject({
      name: "Logo",
      image: { aspect: 2, url: "blob:logo" },
    });
    const withKeyframe = {
      ...source,
      keyframes: [createKeyframe(0, captureTransform(source))],
    };
    const copy = duplicateImageObject({ name: "Logo copy", source: withKeyframe });

    expect(copy.id).not.toBe(source.id);
    expect(copy.image).toEqual(source.image);
    expect(copy.image).not.toBe(source.image);
    expect(copy.positionX).toBeGreaterThan(source.positionX);
    expect(copy.keyframes[0].id).not.toBe(withKeyframe.keyframes[0].id);
  });

  it("resets only the pose, never the file", () => {
    const moved = {
      ...createImageObject({ name: "Logo", image: { url: "blob:logo" } }),
      positionX: 3,
      scale: 2,
    };

    expect(isDefaultImagePose(moved)).toBe(false);

    const reset = resetImageObject(moved);

    expect(isDefaultImagePose(reset)).toBe(true);
    expect(reset.image.url).toBe("blob:logo");
  });
});

describe("getSvgAspect", () => {
  it("reads the viewBox first", () => {
    expect(
      getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" width="10" height="10"/>'),
    ).toBe(3);
    expect(
      getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,50,100"/>'),
    ).toBe(0.5);
  });

  it("falls back to width and height", () => {
    expect(
      getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" width="200px" height="100"/>'),
    ).toBe(2);
  });

  it("gives up when the file declares no size or is not an svg", () => {
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg"/>')).toBeNull();
    expect(getSvgAspect("<html/>")).toBeNull();
    expect(getSvgAspect("not xml at all")).toBeNull();
  });
});

describe("sticker images", () => {
  it("is a square vector from the catalog, with the outline on", () => {
    expect(getStickerImage("fire")).toEqual({
      animation: null,
      aspect: 1,
      isVector: true,
      name: null,
      outline: true,
      speed: 1,
      stickerId: "fire",
      url: "/stickers/fire.svg",
    });
  });

  it("is a Lottie when the sticker is an animated one", () => {
    expect(getStickerImage("animated-fire")).toMatchObject({
      animation: "lottie",
      stickerId: "animated-fire",
      url: "/stickers/animated/fire.json",
    });
  });

  it("can be the image of a new object", () => {
    const sticker = createImageObject({ name: "Sticker 1", image: getStickerImage("fire") });

    expect(sticker.image.stickerId).toBe("fire");
    expect(sticker.image.outline).toBe(true);
  });
});

describe("normalizeImageSpeed", () => {
  it("keeps the speed between a quarter and four times", () => {
    expect(normalizeImageSpeed(1)).toBe(1);
    expect(normalizeImageSpeed(100)).toBe(MAX_IMAGE_SPEED);
    expect(normalizeImageSpeed(0)).toBe(MIN_IMAGE_SPEED);
    expect(normalizeImageSpeed(-2)).toBe(MIN_IMAGE_SPEED);
    expect(normalizeImageSpeed(NaN)).toBe(1);
    expect(normalizeImageSpeed("2")).toBe(1);
  });

  it("is clamped when an object is created", () => {
    expect(createImageObject({ name: "x", image: { speed: 99 } }).image.speed).toBe(
      MAX_IMAGE_SPEED,
    );
  });
});
