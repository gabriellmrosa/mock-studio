/**
 * @jest-environment node
 */

import {
  DEVICE_MODEL_CATALOG,
  DEVICE_MODEL_IDS,
  MODELS_WITH_FINISH,
} from "../models/device-catalog";
import {
  createImageObject,
  getBuiltinAssetImage,
  getStickerImage,
} from "./image-objects";
import {
  createSceneCode,
  createSceneLink,
  decodeSceneLink,
  extractSceneLink,
} from "./scene-link";
import { createKeyframe } from "./scene-motion";
import {
  createSceneObject,
  isDeviceObject,
  isImageObject,
  isTextObject,
  type SceneObject,
} from "./scene-objects";
import { DEFAULT_OBJECT_TRANSFORM } from "./scene-presets";
import {
  applySceneTemplate,
  createSceneTemplate,
  isValidTemplate,
  normalizeTemplate,
} from "./scene-templates";
import { STICKERS } from "./stickers";
import { TEXT_FONTS } from "./text-fonts";
import { createTextObject } from "./text-objects";

describe("neutral scene core (pure Node environment)", () => {
  it("runs with no DOM, no window, and without loading three or react", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const loadedModules = Object.keys(require.cache);
    expect(loadedModules.some((path) => path.includes("/three/"))).toBe(false);
    expect(loadedModules.some((path) => path.includes("@react-three"))).toBe(false);
    expect(loadedModules.some((path) => path.includes("/react/"))).toBe(false);
  });

  it("exposes the full device, sticker, and font catalogs in Node", () => {
    expect(DEVICE_MODEL_IDS).toEqual([
      "smartphone",
      "smartphone2",
      "smartphone3",
      "smartwatch",
      "notebook",
      "tablet",
      "duo",
    ]);
    expect(MODELS_WITH_FINISH).toEqual(["duo", "smartwatch"]);
    for (const id of DEVICE_MODEL_IDS) {
      const model = DEVICE_MODEL_CATALOG[id];
      expect(model.themes[model.defaultTheme]).toBeDefined();
      expect(model.spawnFootprintWidth).toBeGreaterThan(0);
    }
    expect(Object.values(STICKERS).flat().length).toBeGreaterThan(100);
    expect(Object.keys(TEXT_FONTS).length).toBeGreaterThan(0);
  });

  it("builds, normalizes, encodes, and decodes a full motion scene link in pure Node", async () => {
    const phone = createSceneObject({
      deletable: false,
      modelId: "smartphone",
      name: "iPhone",
    });
    phone.keyframes = [
      createKeyframe(0, { ...DEFAULT_OBJECT_TRANSFORM, opacity: 0, positionX: -1 }),
      createKeyframe(1500, { ...DEFAULT_OBJECT_TRANSFORM, opacity: 1, positionX: 0 }),
    ];

    const duo = createSceneObject({
      modelId: "duo",
      name: "Duo",
    });
    duo.keyframes = [
      createKeyframe(0, { ...DEFAULT_OBJECT_TRANSFORM, foldAngle: 0 }),
      createKeyframe(2000, { ...DEFAULT_OBJECT_TRANSFORM, foldAngle: 180 }),
    ];

    const title = createTextObject({
      content: "Mock Studio",
      name: "Title",
    });
    const sticker = createImageObject({
      image: getStickerImage("sparkles"),
      name: "Sparkles",
    });
    const logo = createImageObject({
      image: getBuiltinAssetImage("mock-studio-logo"),
      name: "Logo",
    });

    const objects: SceneObject[] = [phone, duo, title, sticker, logo];
    const template = normalizeTemplate(
      createSceneTemplate({
        backgroundColor: "#121212",
        mode: "motion",
        name: "Node Launch",
        objects,
      }),
    );

    expect(isValidTemplate(template)).toBe(true);

    const code = await createSceneCode(template);
    const link = await createSceneLink(template, "https://www.mockstudio.app.br/");
    expect(link).toBe(`https://www.mockstudio.app.br/#scene=${code}`);
    expect(extractSceneLink(link)).toBe(code);

    const decoded = await decodeSceneLink(code);
    expect(decoded).not.toBeNull();
    expect(decoded?.mode).toBe("motion");
    expect(decoded?.name).toBe("Node Launch");

    const rebuilt = applySceneTemplate(decoded!);
    expect(rebuilt.filter(isDeviceObject)).toHaveLength(2);
    expect(rebuilt.filter(isTextObject)).toHaveLength(1);
    expect(rebuilt.filter(isImageObject)).toHaveLength(2);
    expect(
      rebuilt.find((o) => isImageObject(o) && o.name === "Logo"),
    ).toMatchObject({
      image: { assetId: "mock-studio-logo", url: "/brand/logo-mockstudio.svg" },
    });
  });
});
