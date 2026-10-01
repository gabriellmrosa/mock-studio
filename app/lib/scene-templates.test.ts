import {
  applySceneTemplate,
  createSceneTemplate,
  getNextTemplateName,
  getTemplateSnapshot,
  getTemplatesForMode,
  loadTemplates,
  persistTemplates,
  removeTemplate,
  renameTemplate,
  upsertTemplate,
  type SceneTemplate,
} from "./scene-templates";
import { createSceneObject, getPlaceholderImageUrl } from "./scene-objects";
import { captureTransform, insertKeyframe } from "./scene-motion";

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

/** Cena com dois keyframes no primeiro objeto (0s e 1,5s). */
function buildAnimatedScene() {
  const [first, second] = buildScene();
  let animated = {
    ...first,
    keyframes: insertKeyframe(first, 0).keyframes,
  };

  animated = {
    ...animated,
    keyframes: insertKeyframe(animated, 1500).keyframes.map((keyframe) =>
      keyframe.timeMs === 1500
        ? {
            ...keyframe,
            easing: "ease-out" as const,
            transform: { ...keyframe.transform, positionX: 4 },
          }
        : keyframe,
    ),
  };

  return [animated, second];
}

function storeRaw(templates: unknown[]) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ templates, version: 1 }),
  );
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

  describe("static and motion templates", () => {
    it("keeps keyframes out of static templates", () => {
      const template = createSceneTemplate({
        name: "Template 1",
        objects: buildAnimatedScene(),
      });

      expect(template.mode).toBe("static");
      expect(template.objects[0]).not.toHaveProperty("keyframes");
      expect(applySceneTemplate(template)[0].keyframes).toEqual([]);
    });

    it("round-trips keyframes through a motion template with fresh ids", () => {
      const scene = buildAnimatedScene();
      const template = createSceneTemplate({
        mode: "motion",
        name: "Template 1",
        objects: scene,
      });

      expect(template.objects[0].keyframes?.[0]).not.toHaveProperty("id");
      expect(persistTemplates([template])).toBe(true);

      const [loaded] = loadTemplates();
      const first = applySceneTemplate(loaded)[0];
      const again = applySceneTemplate(loaded)[0];

      expect(loaded.mode).toBe("motion");
      expect(first.keyframes.map((keyframe) => keyframe.timeMs)).toEqual([
        0, 1500,
      ]);
      expect(first.keyframes[1]).toMatchObject({ easing: "ease-out" });
      expect(first.keyframes[1].transform.positionX).toBe(4);
      // Aplicar duas vezes não pode repetir ids: a timeline os procura na cena.
      expect(first.keyframes[0].id).not.toBe(again.keyframes[0].id);
      expect(first.keyframes[0].id).not.toBe(scene[0].keyframes[0].id);
    });

    it("keeps a keyframe's cubic-bezier curve", () => {
      const [first, second] = buildAnimatedScene();
      const curved = {
        ...first,
        keyframes: first.keyframes.map((keyframe, index) =>
          index === 1
            ? {
                ...keyframe,
                bezier: [0.3, 1.4, 0.6, 1] as [number, number, number, number],
                easing: "cubic-bezier" as const,
              }
            : keyframe,
        ),
      };

      persistTemplates([
        createSceneTemplate({
          mode: "motion",
          name: "Curve",
          objects: [curved, second],
        }),
      ]);

      const [loaded] = loadTemplates();
      const rebuilt = applySceneTemplate(loaded)[0].keyframes[1];

      expect(rebuilt).toMatchObject({
        bezier: [0.3, 1.4, 0.6, 1],
        easing: "cubic-bezier",
      });
    });

    it("reads templates saved before modes existed as static", () => {
      const legacy = createSceneTemplate({
        name: "Legacy",
        objects: buildScene(),
      }) as Partial<SceneTemplate>;

      delete legacy.mode;
      storeRaw([legacy]);

      const [loaded] = loadTemplates();

      expect(loaded.mode).toBe("static");
    });

    it("drops only the animation of an object with corrupted keyframes", () => {
      const template = createSceneTemplate({
        mode: "motion",
        name: "Template 1",
        objects: buildAnimatedScene(),
      });

      storeRaw([
        {
          ...template,
          objects: [
            {
              ...template.objects[0],
              keyframes: [{ easing: "wobble", timeMs: 0, transform: {} }],
            },
            template.objects[1],
          ],
        },
      ]);

      const [loaded] = loadTemplates();

      expect(loaded.name).toBe("Template 1");
      expect(loaded.objects[0].keyframes).toEqual([]);
    });

    it("lists and numbers each mode's templates on their own", () => {
      const templates = [
        createSceneTemplate({ name: "Template 1", objects: buildScene() }),
        createSceneTemplate({
          mode: "motion",
          name: "Template 1",
          objects: buildScene(),
        }),
        createSceneTemplate({ name: "Template 2", objects: buildScene() }),
      ];

      const motion = getTemplatesForMode(templates, "motion");

      expect(getTemplatesForMode(templates, "static")).toHaveLength(2);
      expect(motion).toHaveLength(1);
      expect(getNextTemplateName(motion)).toBe("Template 2");
    });

    it("fingerprints only what the mode's template would store", () => {
      const scene = buildAnimatedScene();
      const withImage = [{ ...scene[0], imageUrl: "data:other" }, scene[1]];
      const keyframesMoved = [
        {
          ...scene[0],
          keyframes: scene[0].keyframes.map((keyframe) => ({
            ...keyframe,
            transform: { ...captureTransform(scene[0]), positionX: 9 },
          })),
        },
        scene[1],
      ];

      const staticBase = getTemplateSnapshot(scene, "static", null);
      const motionBase = getTemplateSnapshot(scene, "motion", null);

      // Imagens nunca entram no template, então não contam como alteração.
      expect(getTemplateSnapshot(withImage, "static", null)).toBe(staticBase);
      // Keyframes só importam para o ambiente de Movimento.
      expect(getTemplateSnapshot(keyframesMoved, "static", null)).toBe(
        staticBase,
      );
      expect(getTemplateSnapshot(keyframesMoved, "motion", null)).not.toBe(
        motionBase,
      );
      expect(getTemplateSnapshot(scene, "static", "#fff")).not.toBe(staticBase);
    });
  });

  describe("opacity", () => {
    it("keeps the object's opacity and every keyframe's", () => {
      const [first, second] = buildAnimatedScene();
      const template = createSceneTemplate({
        mode: "motion",
        name: "Template 1",
        objects: [{ ...first, opacity: 0.4 }, second],
      });
      const [rebuilt] = applySceneTemplate(template);

      expect(rebuilt.opacity).toBe(0.4);
      expect(rebuilt.keyframes[0].transform.opacity).toBe(1);
    });

    it("opens templates saved before opacity at 100%", () => {
      const template = createSceneTemplate({
        mode: "motion",
        name: "Older",
        objects: buildAnimatedScene(),
      });
      // Como um template salvo antes da opacidade: sem o campo em lugar nenhum.
      const older = JSON.parse(JSON.stringify(template), (key, value) =>
        key === "opacity" ? undefined : value,
      );

      storeRaw([older]);

      const [loaded] = loadTemplates();
      const [rebuilt] = applySceneTemplate(loaded);

      // Os keyframes antigos continuam válidos — não somem por faltar um campo.
      expect(rebuilt.keyframes).toHaveLength(2);
      expect(rebuilt.opacity).toBe(1);
      expect(rebuilt.keyframes.every((keyframe) => keyframe.transform.opacity === 1)).toBe(true);
    });
  });

  describe("video size", () => {
    const frame = { height: 412, width: 648 };

    it("stores the video size in motion templates only", () => {
      const motion = createSceneTemplate({
        frame,
        mode: "motion",
        name: "Template 1",
        objects: buildScene(),
      });
      const still = createSceneTemplate({
        frame,
        name: "Template 1",
        objects: buildScene(),
      });

      expect(motion.frame).toEqual(frame);
      expect(still).not.toHaveProperty("frame");
    });

    it("reloads it, and older motion templates load without one", () => {
      const motion = createSceneTemplate({
        frame,
        mode: "motion",
        name: "Sized",
        objects: buildScene(),
      });
      const older = createSceneTemplate({
        mode: "motion",
        name: "Older",
        objects: buildScene(),
      });

      storeRaw([motion, { ...older, frame: { width: "wide" } }]);

      const [sized, loadedOlder] = loadTemplates();

      expect(sized.frame).toEqual(frame);
      // Sem um tamanho válido, o app usa o padrão ao aplicar.
      expect(loadedOlder).not.toHaveProperty("frame");
    });

    it("counts a size change as unsaved only in Motion", () => {
      const scene = buildScene();

      expect(getTemplateSnapshot(scene, "motion", null, frame)).not.toBe(
        getTemplateSnapshot(scene, "motion", null, { height: 1080, width: 1920 }),
      );
      expect(getTemplateSnapshot(scene, "static", null, frame)).toBe(
        getTemplateSnapshot(scene, "static", null),
      );
    });
  });
});
