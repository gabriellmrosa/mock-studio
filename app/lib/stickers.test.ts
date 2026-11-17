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
  getStickerUrl,
  isStickerId,
} from "./stickers";

const FOLDER = join(process.cwd(), "public", "stickers");
const ALL_IDS = STICKER_CATEGORY_IDS.flatMap((category) => STICKERS[category]);

describe("sticker catalog", () => {
  it("has a file for every id, and an id for every file", () => {
    const files = readdirSync(FOLDER)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.replace(/\.svg$/, ""));

    expect(ALL_IDS.filter((id) => !existsSync(join(FOLDER, `${id}.svg`)))).toEqual([]);
    expect(files.filter((file) => !ALL_IDS.includes(file))).toEqual([]);
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
    expect(getStickerCategory("fire")).toBe("classicos");
    expect(getStickerCategory("keycap-1")).toBe("numerais");
    expect(getStickerCategory("nope")).toBeNull();
  });

  it("names a sticker in the language of the interface, with the id as English", () => {
    expect(getStickerLabel("red-heart", STICKER_LABELS_PT_BR)).toBe("Coração vermelho");
    expect(getStickerLabel("red-heart", null)).toBe("Red heart");
  });
});
