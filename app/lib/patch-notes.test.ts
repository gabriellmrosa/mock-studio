import packageJson from "../../package.json";
import { PATCH_NOTES, compareVersions } from "./patch-notes";

describe("patch notes", () => {
  it("are never behind the version of the app", () => {
    // Uma versão nova sem nota aqui quebra este teste: a nota entra antes do
    // `npm version`, então vale a mais nova ser igual ou maior.
    expect(compareVersions(PATCH_NOTES[0].version, packageJson.version)).toBeGreaterThanOrEqual(0);
  });

  it("go from the newest version to the oldest, with no repeats", () => {
    for (let index = 1; index < PATCH_NOTES.length; index += 1) {
      expect(compareVersions(PATCH_NOTES[index - 1].version, PATCH_NOTES[index].version)).toBeGreaterThan(0);
    }
  });

  it("have a valid version and a real date for each entry", () => {
    for (const note of PATCH_NOTES) {
      expect(note.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(`${note.date}T12:00:00`).getTime())).toBe(false);
    }
  });

  it("do not go back in time as the versions go up", () => {
    for (let index = 1; index < PATCH_NOTES.length; index += 1) {
      expect(PATCH_NOTES[index - 1].date >= PATCH_NOTES[index].date).toBe(true);
    }
  });

  it("have at least one item per version, each with a title and a description in both languages", () => {
    for (const note of PATCH_NOTES) {
      expect(note.items.length).toBeGreaterThan(0);

      for (const item of note.items) {
        for (const locale of ["pt-BR", "en-US"] as const) {
          expect(item.title[locale].trim()).not.toBe("");
          expect(item.description[locale].trim()).not.toBe("");
        }
      }
    }
  });

  it("keep the titles short and unique inside a version (the title is the key)", () => {
    for (const note of PATCH_NOTES) {
      const titles = note.items.map((item) => item.title["en-US"]);

      expect(new Set(titles).size).toBe(titles.length);
      expect(titles.every((title) => title.length <= 40)).toBe(true);
    }
  });
});

describe("compareVersions", () => {
  it("compares number by number, not as text", () => {
    expect(compareVersions("2.10.0", "2.9.0")).toBeGreaterThan(0);
    expect(compareVersions("2.2.0", "2.2.0")).toBe(0);
    expect(compareVersions("1.9.9", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("2.2.1", "2.2.0")).toBeGreaterThan(0);
  });
});
