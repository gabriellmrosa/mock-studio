import { buildNextDeviceColors, isCustomDeviceTheme } from "./device-colors";
import { DEVICE_MODELS } from "../models/device-models";

describe("buildNextDeviceColors", () => {
  it("preserves previous custom changes across sequential notebook updates", () => {
    const model = DEVICE_MODELS.notebook;
    const afterBackCover = buildNextDeviceColors({
      currentColors: model.themes[model.defaultTheme],
      hex: "#aa0000",
      model,
      part: "screenBackCover",
    });

    const afterBezel = buildNextDeviceColors({
      currentColors: afterBackCover,
      hex: "#00aa00",
      model,
      part: "screenBezel",
    });

    expect(afterBezel.screenBackCover).toBe("#aa0000");
    expect(afterBezel.screenBezel).toBe("#00aa00");
  });

  it("preserves customized notebook parts when the primary color changes", () => {
    const model = DEVICE_MODELS.notebook;
    const customColors = {
      ...model.themes[model.defaultTheme],
      screenBezel: "#112233",
      touchpad: "#445566",
    };

    const nextColors = buildNextDeviceColors({
      currentColors: customColors,
      hex: "#778899",
      model,
      part: "keyboardBaseOuter",
    });

    expect(nextColors.keyboardBaseOuter).toBe("#778899");
    expect(nextColors.screenBezel).toBe("#112233");
    expect(nextColors.touchpad).toBe("#445566");
  });
});

describe("isCustomDeviceTheme", () => {
  const model = DEVICE_MODELS.duo;

  it("is false while the colors are the theme's own", () => {
    expect(isCustomDeviceTheme(model, "night-sky", model.themes["night-sky"])).toBe(false);
  });

  it("is true once any part was painted by hand", () => {
    const colors = { ...model.themes["night-sky"], frame: "#123456" };

    expect(isCustomDeviceTheme(model, "night-sky", colors)).toBe(true);
  });

  it("is true for a theme the model doesn't have", () => {
    expect(isCustomDeviceTheme(model, "nope", model.themes["night-sky"])).toBe(true);
  });
});

describe("Duo themes", () => {
  const model = DEVICE_MODELS.duo;

  it("give a color to every part the Inspector can edit", () => {
    // Uma parte sem cor no tema ficaria "Personalizada" para sempre, e
    // a edição dela não teria de onde partir.
    for (const [id, theme] of Object.entries(model.themes)) {
      for (const key of model.customizableColorKeys) {
        expect([id, key, typeof theme[key]]).toEqual([id, key, "string"]);
      }
    }
  });

  it("leaves no theme looking edited by hand", () => {
    for (const id of Object.keys(model.themes)) {
      expect(isCustomDeviceTheme(model, id, model.themes[id])).toBe(false);
    }
  });

  it("start the highlights in the frame's own color", () => {
    for (const theme of Object.values(model.themes)) {
      expect(theme.frameHighlight).toBe(theme.frame);
    }
  });
});
