import {
  DEFAULT_TEMPLATES,
  loadTemplatesWithDefaults,
} from "./default-templates";
import {
  createSceneObject,
  isAudioObject,
  isDeviceObject,
  isImageObject,
} from "./scene-objects";
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
      const objects = applySceneTemplate(template);
      expect(objects.length).toBeGreaterThan(0);

      // Nenhum default pode referenciar arquivos pessoais de tela ou música.
      for (const object of objects) {
        expect(isAudioObject(object)).toBe(false);
        if (isDeviceObject(object)) {
          expect(object.pendingScreen).toBeNull();
          expect(object.pendingOuterScreen).toBeNull();
        }
      }
    }

    // O template de vídeo inclui o logo SVG embutido do Mock Studio.
    const [videoTemplate] = getTemplatesForMode(seeded, "motion");
    const logoObject = applySceneTemplate(videoTemplate).find(
      (object) => isImageObject(object) && object.name === "Mock Studio",
    );
    expect(logoObject && isImageObject(logoObject)).toBe(true);
    if (logoObject && isImageObject(logoObject)) {
      expect(logoObject.image.url).toBe("/brand/logo-mockstudio.svg");
      expect(logoObject.image.isVector).toBe(true);
    }
  });

  it("uses localized names when seeding", () => {
    const ptTemplates = loadTemplatesWithDefaults("pt-BR");

    expect(ptTemplates.map((template) => template.name)).toEqual([
      "Exemplo de foto",
      "Exemplo de vídeo",
    ]);

    window.localStorage.clear();

    const enTemplates = loadTemplatesWithDefaults("en-US");

    expect(enTemplates.map((template) => template.name)).toEqual([
      "Photo example",
      "Video example",
    ]);
  });

  it("migrates untouched legacy default names without touching user-renamed ones", () => {
    const initial = loadTemplatesWithDefaults("pt-BR");
    const [photoDefault, videoDefault] = initial;

    // Simula um navegador que recebeu os nomes da 3.3.0 e renomeou só o de vídeo.
    expect(
      persistTemplates([
        { ...photoDefault, name: "Vitrine de produto" },
        { ...videoDefault, name: "Meu vídeo" },
      ]),
    ).toBe(true);

    const reloaded = loadTemplatesWithDefaults("pt-BR");

    expect(reloaded.map((template) => template.name)).toEqual([
      "Exemplo de foto",
      "Meu vídeo",
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

  it("preserves an overwritten legacy video default even when the user kept its original name", () => {
    const userWork = createSceneTemplate({
      mode: "motion",
      name: "Exemplo de vídeo",
      objects: [createSceneObject({ deletable: false, name: "My Custom Phone" })],
    });
    // Simula quem sobrepôs o antigo default mantendo o mesmo id e nome.
    const overwrittenLegacy = { ...userWork, id: "default-video-product-launch" };
    expect(persistTemplates([overwrittenLegacy])).toBe(true);

    const loaded = loadTemplatesWithDefaults("pt-BR");
    const preserved = loaded.find((t) => t.id === "default-video-product-launch");
    const newShowcase = loaded.find((t) => t.id === "default-video-showcase");

    expect(preserved).toBeDefined();
    expect(preserved?.objects[0].name).toBe("My Custom Phone");
    expect(newShowcase).toBeDefined();
  });
});
