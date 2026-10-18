/**
 * @jest-environment node
 */
import { createSceneLink, decodeSceneLink, readSceneLinkHash } from "./scene-link";
import { createSceneObject } from "./scene-objects";
import { insertKeyframe } from "./scene-motion";
import { createSceneTemplate } from "./scene-templates";

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
