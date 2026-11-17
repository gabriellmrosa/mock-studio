import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { STICKER_LABELS_PT_BR } from "./sticker-labels";
import {
  STICKER_CATEGORY_IDS,
  STICKER_CATEGORY_NAMES_EN_US,
  STICKER_CATEGORY_NAMES_PT_BR,
  STICKERS,
  getStickerCategory,
  getStickerLabel,
  getStickerThumbUrl,
  getStickerUrl,
  isAnimatedSticker,
  isStickerId,
} from "./stickers";

const FOLDER = join(process.cwd(), "public", "stickers");
const ALL_IDS = STICKER_CATEGORY_IDS.flatMap((category) => STICKERS[category]);
const STATIC_IDS = ALL_IDS.filter((id) => !isAnimatedSticker(id));
const ANIMATED_IDS = ALL_IDS.filter(isAnimatedSticker);

describe("sticker catalog", () => {
  it("has a file for every id, and an id for every file", () => {
    const files = readdirSync(FOLDER)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.replace(/\.svg$/, ""));

    expect(STATIC_IDS.filter((id) => !existsSync(join(FOLDER, `${id}.svg`)))).toEqual([]);
    expect(files.filter((file) => !STATIC_IDS.includes(file))).toEqual([]);
  });

  it("has a Lottie and a still image for every animated sticker, and no strays", () => {
    const folder = join(FOLDER, "animated");
    const names = ANIMATED_IDS.map((id) => id.replace(/^animated-/, ""));
    const lotties = readdirSync(folder).filter((file) => file.endsWith(".json"));
    const stills = readdirSync(folder).filter((file) => file.endsWith(".svg"));

    expect(names.filter((name) => !existsSync(join(folder, `${name}.json`)))).toEqual([]);
    expect(names.filter((name) => !existsSync(join(folder, `${name}.svg`)))).toEqual([]);
    expect(lotties.filter((file) => !names.includes(file.replace(/\.json$/, "")))).toEqual([]);
    expect(stills.filter((file) => !names.includes(file.replace(/\.svg$/, "")))).toEqual([]);
  });

  it("has the animated stickers in their own category, apart from the still ones", () => {
    expect(STICKERS.animados.every(isAnimatedSticker)).toBe(true);
    expect(STATIC_IDS.length + ANIMATED_IDS.length).toBe(ALL_IDS.length);
    expect(ANIMATED_IDS.length).toBeGreaterThan(0);
  });

  it("keeps every id unique across categories (what a template stores)", () => {
    expect(new Set(ALL_IDS).size).toBe(ALL_IDS.length);
  });

  it("names every sticker and every category in both languages", () => {
    expect(ALL_IDS.filter((id) => !STICKER_LABELS_PT_BR[id])).toEqual([]);
    expect(Object.keys(STICKER_LABELS_PT_BR).filter((id) => !ALL_IDS.includes(id))).toEqual([]);
    expect(Object.keys(STICKER_CATEGORY_NAMES_PT_BR)).toEqual([...STICKER_CATEGORY_IDS]);
    expect(Object.keys(STICKER_CATEGORY_NAMES_EN_US)).toEqual([...STICKER_CATEGORY_IDS]);
  });

  it("has no category without stickers", () => {
    expect(STICKER_CATEGORY_IDS.filter((category) => STICKERS[category].length === 0)).toEqual([]);
  });

  it("only accepts ids from the catalog", () => {
    expect(isStickerId("red-heart")).toBe(true);
    expect(isStickerId("nope")).toBe(false);
    expect(isStickerId(undefined)).toBe(false);
    expect(isStickerId("../../etc/passwd")).toBe(false);
  });

  it("finds the file and the category of a sticker", () => {
    expect(getStickerUrl("fire")).toBe("/stickers/fire.svg");
    expect(getStickerUrl("animated-fire")).toBe("/stickers/animated/fire.json");
    expect(getStickerThumbUrl("animated-fire")).toBe("/stickers/animated/fire.svg");
    expect(getStickerThumbUrl("fire")).toBe("/stickers/fire.svg");
    expect(getStickerCategory("fire")).toBe("classicos");
    expect(getStickerCategory("keycap-1")).toBe("numerais");
    expect(getStickerCategory("nope")).toBeNull();
  });

  it("names a sticker in the language of the interface, with the id as English", () => {
    expect(getStickerLabel("red-heart", STICKER_LABELS_PT_BR)).toBe("Coração vermelho");
    expect(getStickerLabel("red-heart", null)).toBe("Red heart");
  });
});
