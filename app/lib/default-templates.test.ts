import {
  DEFAULT_TEMPLATES,
  loadTemplatesWithDefaults,
} from "./default-templates";
import { createSceneObject } from "./scene-objects";
import {
  applySceneTemplate,
  createSceneTemplate,
  getTemplatesForMode,
  isValidTemplate,
  loadTemplates,
  persistTemplates,
  removeTemplate,
  renameTemplate,
} from "./scene-templates";

describe("default templates", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("ships one valid static template and one valid motion template", () => {
    const seeded = loadTemplatesWithDefaults("en-US");

    expect(seeded).toHaveLength(DEFAULT_TEMPLATES.length);
    expect(getTemplatesForMode(seeded, "static")).toHaveLength(1);
    expect(getTemplatesForMode(seeded, "motion")).toHaveLength(1);

    for (const template of seeded) {
      expect(isValidTemplate(template)).toBe(true);
      expect(applySceneTemplate(template).length).toBeGreaterThan(0);
    }
  });

  it("uses localized names when seeding", () => {
    const ptTemplates = loadTemplatesWithDefaults("pt-BR");

    expect(ptTemplates.map((template) => template.name)).toEqual([
      "Vitrine de produto",
      "Lançamento de produto",
    ]);

    window.localStorage.clear();

    const enTemplates = loadTemplatesWithDefaults("en-US");

    expect(enTemplates.map((template) => template.name)).toEqual([
      "Product Showcase",
      "Product Launch",
    ]);
  });

  it("delivers defaults to existing users without losing their templates", () => {
    const existing = createSceneTemplate({
      mode: "static",
      name: "My custom setup",
      objects: [createSceneObject({ deletable: false, name: "Smartphone" })],
    });

    expect(persistTemplates([existing])).toBe(true);

    const loaded = loadTemplatesWithDefaults("en-US");

    expect(loaded).toHaveLength(1 + DEFAULT_TEMPLATES.length);
    expect(loaded[0].id).toBe(existing.id);
    expect(loaded[0].name).toBe("My custom setup");
  });

  it("does not bring back a default template after the user deletes or renames it", () => {
    const initial = loadTemplatesWithDefaults("en-US");
    const [photoDefault, videoDefault] = initial;

    const afterDelete = removeTemplate(initial, photoDefault.id);
    const afterRename = renameTemplate(
      afterDelete,
      videoDefault.id,
      "Custom Launch",
    );

    expect(persistTemplates(afterRename)).toBe(true);

    const reloaded = loadTemplatesWithDefaults("en-US");

    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]).toMatchObject({
      id: videoDefault.id,
      name: "Custom Launch",
    });
    expect(loadTemplates()).toHaveLength(1);
  });
});
