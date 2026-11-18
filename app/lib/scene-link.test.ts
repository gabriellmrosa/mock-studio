/**
 * @jest-environment node
 */
import {
  createSceneCode,
  createSceneLink,
  decodeSceneLink,
  extractSceneLink,
  readSceneLinkHash,
} from "./scene-link";
import { createSceneObject } from "./scene-objects";
import { insertKeyframe } from "./scene-motion";
import { createSceneTemplate } from "./scene-templates";
import { createTextObject } from "./text-objects";
import { createImageObject } from "./image-objects";

function createMotionTemplate() {
  const base = createSceneObject({ id: "object-1", name: "Phone" });
  const first = { ...base, keyframes: insertKeyframe(base, 0).keyframes };
  const object = {
    ...first,
    keyframes: insertKeyframe(first, 1500).keyframes,
    positionX: 0.4,
  };

  return createSceneTemplate({
    backgroundColor: "#123456",
    camera: { position: [1, 2, 3], target: [0, 0, 0] },
    frame: { height: 1350, width: 1080 },
    mode: "motion",
    name: "My scene",
    objects: [object],
  });
}

describe("scene link", () => {
  it("carries the whole scene through the URL hash", async () => {
    const template = createMotionTemplate();
    const url = await createSceneLink(template, "https://mock.studio/?lang=pt#old");

    expect(url.startsWith("https://mock.studio/?lang=pt#scene=")).toBe(true);

    const decoded = await decodeSceneLink(readSceneLinkHash(new URL(url).hash)!);

    expect(decoded).toEqual({
      ...template,
      createdAt: expect.any(Number),
      id: expect.any(String),
    });
    // Quem abre ganha um template novo, não o id de quem mandou.
    expect(decoded!.id).not.toBe(template.id);
  });

  it("carries a text with its style, accents and line breaks", async () => {
    const template = createSceneTemplate({
      name: "Com texto",
      objects: [
        createSceneObject({ id: "phone", name: "Phone", deletable: false }),
        createTextObject({
          content: "Lançamento\nçãõ — 2026",
          name: "Título",
          text: { fontId: "playfair-display", weight: 700, maxWidth: 600 },
        }),
      ],
    });
    const url = await createSceneLink(template, "https://mock.studio/");
    const decoded = await decodeSceneLink(readSceneLinkHash(new URL(url).hash)!);

    expect(decoded!.objects[1]).toEqual(template.objects[1]);
  });

  it("carries an image as its placeholder: the proportion, never the file", async () => {
    const template = createSceneTemplate({
      name: "Com imagem",
      objects: [
        createSceneObject({ id: "phone", name: "Phone", deletable: false }),
        createImageObject({
          image: { aspect: 1.5, name: "foto.png", url: "blob:foto" },
          name: "Foto",
        }),
      ],
    });
    const url = await createSceneLink(template, "https://mock.studio/");
    const decoded = await decodeSceneLink(readSceneLinkHash(new URL(url).hash)!);

    expect(decoded!.objects[1]).toEqual(template.objects[1]);
    expect(decoded!.objects[1]).toMatchObject({ kind: "image", aspect: 1.5 });
    expect(url).not.toContain("foto");
  });

  it("stays short enough to paste anywhere", async () => {
    const url = await createSceneLink(createMotionTemplate(), "https://mock.studio/");

    expect(url.length).toBeLessThan(2000);
  });

  it("ignores addresses without a scene", () => {
    expect(readSceneLinkHash("")).toBeNull();
    expect(readSceneLinkHash("#other")).toBeNull();
    expect(readSceneLinkHash("#scene=abc")).toBe("abc");
  });

  it("rejects a cut or corrupted link instead of opening half a scene", async () => {
    const url = await createSceneLink(createMotionTemplate(), "https://mock.studio/");
    const encoded = readSceneLinkHash(new URL(url).hash)!;

    expect(await decodeSceneLink(encoded.slice(0, encoded.length / 2))).toBeNull();
    expect(await decodeSceneLink("not-a-scene")).toBeNull();
  });
});

describe("extractSceneLink", () => {
  it("takes what comes after #scene= from a whole address", () => {
    expect(extractSceneLink("https://mock.studio/app/#scene=abc_DEF-123")).toBe(
      "abc_DEF-123",
    );
  });

  it("accepts just the content, and ignores the spaces and line breaks around it", () => {
    expect(extractSceneLink("  abc_DEF-123\n")).toBe("abc_DEF-123");
  });

  it("refuses an empty text and one with characters the format never uses", () => {
    expect(extractSceneLink("   ")).toBeNull();
    expect(extractSceneLink("https://mock.studio/")).toBeNull();
    expect(extractSceneLink("#scene=abc def")).toBeNull();
  });

  it("opens what createSceneLink made, address and all", async () => {
    const template = createMotionTemplate();
    const link = await createSceneLink(template, "https://mock.studio/");
    const decoded = await decodeSceneLink(extractSceneLink(link)!);

    expect(decoded?.name).toBe("My scene");
  });
});

describe("createSceneCode", () => {
  it("is only the content: no address, nothing before it", async () => {
    const code = await createSceneCode(createMotionTemplate());

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code).not.toContain("http");
  });

  it("is what follows #scene= in the link, and opens back as the same scene", async () => {
    const template = createMotionTemplate();
    const code = await createSceneCode(template);
    const link = await createSceneLink(template, "https://mock.studio/");

    expect(link).toBe(`https://mock.studio/#scene=${code}`);
    expect((await decodeSceneLink(code))?.name).toBe("My scene");
  });
});
