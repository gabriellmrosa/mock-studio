import { existsSync } from "node:fs";
import path from "node:path";
import {
  TEXT_FONTS,
  TEXT_FONT_IDS,
  TEXT_WEIGHT_NAMES,
  getNearestWeight,
  getTextFontUrl,
} from "./text-fonts";

describe("text font weights", () => {
  it("has a file in public/fonts for every weight of every font", () => {
    for (const id of TEXT_FONT_IDS) {
      for (const weight of TEXT_FONTS[id].weights) {
        const file = path.join(process.cwd(), "public", getTextFontUrl(id, weight));

        expect({ id, weight, exists: existsSync(file) }).toEqual({
          id,
          weight,
          exists: true,
        });
      }
    }
  });

  it("names every weight a font can have", () => {
    for (const id of TEXT_FONT_IDS) {
      for (const weight of TEXT_FONTS[id].weights) {
        expect(TEXT_WEIGHT_NAMES[weight]).toBeTruthy();
      }
    }
  });

  it("keeps a weight the font has", () => {
    expect(getNearestWeight("inter", 300)).toBe(300);
    expect(getNearestWeight("playfair-display", 900)).toBe(900);
  });

  it("moves a weight the font lacks to its nearest neighbor", () => {
    // A Playfair começa no 400 e a Oswald no 200.
    expect(getNearestWeight("playfair-display", 100)).toBe(400);
    expect(getNearestWeight("oswald", 100)).toBe(200);
    expect(getNearestWeight("oswald", 900)).toBe(700);
  });

  it("goes to the heavier neighbor on a tie", () => {
    // 450 está a 50 do 400 e do 500.
    expect(getNearestWeight("inter", 450)).toBe(500);
  });

  it("reads the regular and bold of templates saved before the weights", () => {
    expect(getNearestWeight("inter", "regular")).toBe(400);
    expect(getNearestWeight("inter", "bold")).toBe(700);
  });

  it("falls back on Regular for anything else, including prototype property names", () => {
    expect(getNearestWeight("inter", "heavy")).toBe(400);
    expect(getNearestWeight("inter", "toString")).toBe(400);
    expect(getNearestWeight("inter", "constructor")).toBe(400);
    expect(getNearestWeight("inter", undefined)).toBe(400);
    expect(getNearestWeight("inter", Number.NaN)).toBe(400);
  });

  it("points the file URL at the nearest weight, so a bad value never 404s", () => {
    expect(getTextFontUrl("oswald", 100)).toBe("/fonts/oswald-200.woff");
    expect(getTextFontUrl("inter", 700)).toBe("/fonts/inter-700.woff");
  });
});
