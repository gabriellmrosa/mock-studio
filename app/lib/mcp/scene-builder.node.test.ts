/**
 * @jest-environment node
 */

import { decodeSceneLink, extractSceneLink } from "../scene-link";
import {
  isCameraObject,
  isDeviceObject,
  isImageObject,
  isTextObject,
} from "../scene-objects";
import { applySceneTemplate } from "../scene-templates";
import {
  buildScene,
  listCatalog,
  McpValidationError,
  SCREENS_UPLOAD_NOTE,
} from "./index";

describe("MCP scene core (pure Node)", () => {
  describe("listCatalog", () => {
    it("returns devices, fonts, stickers, layouts, animations, and frames without DOM or Three.js", () => {
      expect(typeof window).toBe("undefined");

      const catalog = listCatalog();

      expect(catalog.devices).toHaveLength(7);
      expect(catalog.devices.find((d) => d.id === "duo")).toMatchObject({
        supportsBezelToggle: true,
        supportsFinish: true,
        supportsFold: true,
      });
      expect(catalog.fonts.map((f) => f.id)).toContain("inter");
      expect(catalog.builtinImages).toContain("mock-studio-logo");
      expect(catalog.layouts).toEqual(["single", "side-by-side", "trio", "duo-hero"]);
      expect(catalog.animations).toEqual(["none", "fade-in", "rise", "orbit", "duo-open"]);
      expect(catalog.frames).toEqual(["16:9", "1:1", "4:5", "9:16"]);
      expect(catalog.note).toBe(SCREENS_UPLOAD_NOTE);
    });

    it("filters stickers by query ignoring accents and case", () => {
      const filtered = listCatalog({ stickerQuery: "SPARKLES" });
      const allIds = Object.values(filtered.stickers).flat();

      expect(allIds).toContain("sparkles");
      expect(allIds.every((id) => id.includes("sparkles"))).toBe(true);
    });
  });

  describe("buildScene round-trip", () => {
    it("builds a semantic trio motion scene and survives encode -> decode -> apply intact", async () => {
      const result = await buildScene(
        {
          animation: "rise",
          background: {
            color: "#121212",
            gradient: { angle: 135, color: "#1e1b4b" },
            style: "flat",
          },
          builtinImages: [{ assetId: "mock-studio-logo", name: "Brand Logo" }],
          devices: [
            { model: "smartphone", name: "Center", theme: "black" },
            { model: "smartphone", name: "Left", theme: "gray" },
            { model: "smartphone", name: "Right", color: "#3b82f6" },
          ],
          durationMs: 5000,
          frame: "9:16",
          layout: "trio",
          name: "Launch Trio",
          stickers: [{ id: "sparkles", name: "Sparkles" }],
          texts: [{ content: "New Release", font: "inter", size: 64, weight: 700 }],
        },
        { baseUrl: "http://localhost:3000/" },
      );

      expect(result.warnings).toEqual([]);
      expect(result.note).toBe(SCREENS_UPLOAD_NOTE);
      expect(result.summary).toMatchObject({
        durationMs: 5000,
        mode: "motion",
        name: "Launch Trio",
      });
      expect(result.url).toBe(`http://localhost:3000/#scene=${result.code}`);
      expect(extractSceneLink(result.url)).toBe(result.code);

      // Ida e volta completa pelo mesmo decodificador do editor.
      const decoded = await decodeSceneLink(result.code);
      expect(decoded).not.toBeNull();
      expect(decoded?.mode).toBe("motion");
      expect(decoded?.frame).toEqual({ height: 1920, width: 1080 });
      expect(decoded?.backgroundColor).toBe("#121212");

      const objects = applySceneTemplate(decoded!);
      const devices = objects.filter(isDeviceObject);
      const texts = objects.filter(isTextObject);
      const images = objects.filter(isImageObject);

      expect(devices).toHaveLength(3);
      expect(devices[0].name).toBe("Center");
      expect(devices[0].deviceTheme).toBe("black");
      // Público rotationY 0° vira 180° interno para encarar a câmera.
      expect(devices[0].rotationY).toBe(180);
      expect(devices[1].positionX).toBeLessThan(0);
      expect(devices[2].positionX).toBeGreaterThan(0);
      expect(devices[2].deviceTheme).toBe("custom");
      expect(devices[0].keyframes.length).toBeGreaterThanOrEqual(2);

      expect(texts).toHaveLength(1);
      expect(texts[0].text.content).toBe("New Release");
      // Texto mantém rotationY 0° (não soma +180°).
      expect(texts[0].rotationY).toBe(0);

      expect(images).toHaveLength(2);
      expect(images.find((i) => i.name === "Brand Logo")?.image.url).toBe(
        "/brand/logo-mockstudio.svg",
      );
      expect(images.find((i) => i.name === "Sparkles")?.image.stickerId).toBe("sparkles");
    });

    it("generates Duo opening keyframes for duo-open animation", async () => {
      const result = await buildScene({
        animation: "duo-open",
        devices: [{ model: "duo", name: "Foldable" }],
        durationMs: 3000,
      });

      const decoded = await decodeSceneLink(result.code);
      const [duo] = applySceneTemplate(decoded!).filter(isDeviceObject);

      expect(duo.modelId).toBe("duo");
      expect(duo.keyframes[0].transform.foldAngle).toBe(0);
      expect(duo.keyframes[1].transform.foldAngle).toBe(180);
    });

    it("generates Camera orbit keyframes for orbit animation", async () => {
      const result = await buildScene({
        animation: "orbit",
        devices: [{ model: "notebook" }],
      });

      const decoded = await decodeSceneLink(result.code);
      const cameras = applySceneTemplate(decoded!).filter(isCameraObject);

      expect(cameras).toHaveLength(1);
      expect(cameras[0].keyframes).toHaveLength(2);
      expect(cameras[0].keyframes[0].transform.orbit?.azimuth).toBe(-22);
      expect(cameras[0].keyframes[1].transform.orbit?.azimuth).toBe(22);
    });

    it("reports non-fatal warnings for unknown stickers or unknown themes", async () => {
      const result = await buildScene({
        devices: [{ model: "smartphone", theme: "neon-purple" }],
        stickers: [{ id: "does-not-exist" }],
      });

      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toContain("neon-purple");
      expect(result.warnings[1]).toContain("does-not-exist");

      const decoded = await decodeSceneLink(result.code);
      expect(decoded).not.toBeNull();
      expect(applySceneTemplate(decoded!).filter(isDeviceObject)).toHaveLength(1);
    });
  });

  describe("input validation", () => {
    it("rejects empty scenes, invalid models, and invalid hex colors with clear errors", async () => {
      await expect(buildScene({})).rejects.toThrow(McpValidationError);
      await expect(buildScene({ devices: [{ model: "iphone99" }] })).rejects.toThrow(
        /Valid models:/,
      );
      await expect(
        buildScene({
          background: { color: "not-a-hex" },
          devices: [{ model: "smartphone" }],
        }),
      ).rejects.toThrow(/hex color/i);
      await expect(
        buildScene({
          devices: Array.from({ length: 21 }, () => ({ model: "smartphone" })),
        }),
      ).rejects.toThrow(/exceeding the limit/i);
    });

    it("rejects inherited Object.prototype names and overly long names", async () => {
      await expect(
        buildScene({ devices: [{ model: "toString" as never }] }),
      ).rejects.toThrow(McpValidationError);
      await expect(
        buildScene({
          texts: [{ content: "Hi", font: "constructor" as never }],
        }),
      ).rejects.toThrow(McpValidationError);
      await expect(
        buildScene({
          devices: [{ model: "smartphone" }],
          name: "x".repeat(81),
        }),
      ).rejects.toThrow(/maximum of 80 characters/i);
      await expect(
        buildScene({
          devices: [{ model: "smartphone", name: "y".repeat(81) }],
        }),
      ).rejects.toThrow(/maximum of 80 characters/i);

      // theme e builtinImages com nomes de protótipo viram aviso não-fatal, nunca crash.
      const res = await buildScene({
        builtinImages: [{ assetId: "constructor" as never }],
        devices: [{ model: "smartphone", theme: "toString" }],
      });
      expect(res.warnings).toHaveLength(2);
      expect(res.warnings[0]).toContain("toString");
      expect(res.warnings[1]).toContain("constructor");
    });
  });
});
