import {
  applySceneTemplate,
  createSceneTemplate,
  getNextTemplateName,
  loadTemplates,
  persistTemplates,
  removeTemplate,
  renameTemplate,
  upsertTemplate,
  type SceneTemplate,
} from "./scene-templates";
import { createSceneObject, getPlaceholderImageUrl } from "./scene-objects";

const STORAGE_KEY = "mock-photo-templates";

function buildScene() {
  return [
    {
      ...createSceneObject({
        deletable: false,
        id: "base-object",
        modelId: "smartphone",
        name: "Object 1",
      }),
      imageUrl: "data:image/png;base64,AAAA",
      positionX: 1.5,
      rotationZ: 35,
      scale: 1.4,
    },
    {
      ...createSceneObject({
        id: "second-object",
        modelId: "tablet",
        name: "Object 2",
      }),
      showTabletBezel: false,
    },
  ];
}

describe("scene-templates", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("captures the scene composition without the uploaded image", () => {
    const template = createSceneTemplate({
      backgroundColor: "#123456",
      camera: { position: [1, 2, 3], target: [0, 0, 0] },
      name: "Template 1",
      objects: buildScene(),
    });

    expect(template.name).toBe("Template 1");
    expect(template.backgroundColor).toBe("#123456");
    expect(template.camera).toEqual({ position: [1, 2, 3], target: [0, 0, 0] });
    expect(template.objects).toHaveLength(2);
    expect(template.objects[0]).not.toHaveProperty("imageUrl");
    expect(template.objects[0]).not.toHaveProperty("id");
    expect(template.objects[0]).toMatchObject({
      modelId: "smartphone",
      name: "Object 1",
      positionX: 1.5,
      rotationZ: 35,
      scale: 1.4,
    });
    expect(template.objects[1]).toMatchObject({
      modelId: "tablet",
      showTabletBezel: false,
    });
  });

  it("rebuilds scene objects from a template with placeholder screens", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: buildScene(),
    });

    const objects = applySceneTemplate(template);

    expect(objects).toHaveLength(2);
    expect(objects[0].imageUrl).toBe(getPlaceholderImageUrl("smartphone"));
    expect(objects[1].imageUrl).toBe(getPlaceholderImageUrl("tablet"));
    expect(objects[0]).toMatchObject({
      modelId: "smartphone",
      positionX: 1.5,
      rotationZ: 35,
      scale: 1.4,
    });
    expect(objects[1].showTabletBezel).toBe(false);
  });

  it("keeps the first rebuilt object non-deletable and assigns fresh ids", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: buildScene(),
    });

    const objects = applySceneTemplate(template);

    expect(objects[0].deletable).toBe(false);
    expect(objects[1].deletable).toBe(true);
    expect(objects[0].id).not.toBe("base-object");
    expect(objects[1].id).not.toBe("second-object");
    expect(objects[0].id).not.toBe(objects[1].id);
  });

  it("persists and reloads templates", () => {
    const template = createSceneTemplate({
      backgroundColor: "#2e2b28",
      name: "Template 1",
      objects: buildScene(),
    });

    expect(persistTemplates([template])).toBe(true);

    const loaded = loadTemplates();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Template 1");
    expect(loaded[0].backgroundColor).toBe("#2e2b28");
    expect(loaded[0].objects).toHaveLength(2);
  });

  it("returns no templates when stored data is corrupted", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-json");

    expect(loadTemplates()).toEqual([]);
  });

  it("ignores stored data from a different schema version", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: buildScene(),
    });

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ templates: [template], version: 99 }),
    );

    expect(loadTemplates()).toEqual([]);
  });

  it("drops templates pointing to unknown models", () => {
    const valid = createSceneTemplate({
      name: "Valid",
      objects: buildScene(),
    });
    const invalid = {
      ...createSceneTemplate({ name: "Invalid", objects: buildScene() }),
      objects: [{ ...valid.objects[0], modelId: "ghost-device" }],
    } as unknown as SceneTemplate;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ templates: [valid, invalid], version: 1 }),
    );

    const loaded = loadTemplates();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Valid");
  });

  it("adds a new template and replaces an existing one by id", () => {
    const first = createSceneTemplate({ name: "Template 1", objects: buildScene() });
    const second = createSceneTemplate({ name: "Template 2", objects: buildScene() });

    const added = upsertTemplate([first], second);
    expect(added).toHaveLength(2);

    const replaced = upsertTemplate(added, { ...first, name: "Renamed" });
    expect(replaced).toHaveLength(2);
    expect(replaced[0].name).toBe("Renamed");
  });

  it("renames and removes templates", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: buildScene(),
    });

    expect(renameTemplate([template], template.id, "Home screens")[0].name).toBe(
      "Home screens",
    );
    expect(renameTemplate([template], template.id, "   ")[0].name).toBe(
      "Template 1",
    );
    expect(removeTemplate([template], template.id)).toEqual([]);
  });

  it("names new templates sequentially", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: buildScene(),
    });

    expect(getNextTemplateName([])).toBe("Template 1");
    expect(getNextTemplateName([template])).toBe("Template 2");
  });
});
