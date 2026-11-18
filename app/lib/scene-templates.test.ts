import {
  applySceneTemplate,
  createSceneTemplate,
  getNextTemplateName,
  getTemplateSnapshot,
  getTemplatesForMode,
  isValidTemplate,
  loadTemplates,
  persistTemplates,
  removeTemplate,
  renameTemplate,
  upsertTemplate,
  type SceneTemplate,
} from "./scene-templates";
import {
  createSceneObject,
  getPlaceholderImageUrl,
  isDeviceObject,
  isTextObject,
} from "./scene-objects";
import { captureTransform, createKeyframe, insertKeyframe } from "./scene-motion";
import { createTextObject } from "./text-objects";
import { createImageObject, getStickerImage } from "./image-objects";
import {
  createCameraKeyframe,
  createCameraObject,
  findCameraObject,
} from "./camera-objects";
import { DEFAULT_CAMERA_ORBIT } from "./camera-orbit";

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

function applyDevices(template: SceneTemplate) {
  return applySceneTemplate(template).filter(isDeviceObject);
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

    const objects = applyDevices(template);

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

    it("drops the animation when a keyframe carries a malformed text color", () => {
      const template = createSceneTemplate({
        mode: "motion",
        name: "Template 1",
        objects: buildAnimatedScene(),
      });
      const [first] = template.objects[0].keyframes ?? [];

      storeRaw([
        {
          ...template,
          objects: [
            {
              ...template.objects[0],
              keyframes: [
                {
                  ...first,
                  transform: { ...first.transform, textColor: "red" },
                },
              ],
            },
            template.objects[1],
          ],
        },
      ]);

      const [loaded] = loadTemplates();

      expect(loaded.objects[0].keyframes).toEqual([]);
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
      const [rebuilt] = applyDevices(template);

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

  describe("fold angle", () => {
    it("keeps how far a foldable is open, on the object and on keyframes", () => {
      const duo = {
        ...createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" }),
        foldAngle: 90,
      };
      const closed = createKeyframe(0, { ...captureTransform(duo), foldAngle: 0 });
      const template = createSceneTemplate({
        mode: "motion",
        name: "Template 1",
        objects: [{ ...duo, keyframes: [closed] }],
      });
      const [rebuilt] = applyDevices(template);

      expect(rebuilt.foldAngle).toBe(90);
      expect(rebuilt.keyframes[0].transform.foldAngle).toBe(0);
    });

    it("leaves it out of templates of devices that don't fold", () => {
      const template = createSceneTemplate({
        name: "Template 1",
        objects: [createSceneObject({ id: "object-1", name: "Object 1" })],
      });

      expect(template.objects[0]).not.toHaveProperty("foldAngle");
      expect(template.objects[0]).not.toHaveProperty("matteFinish");
      // Ao abrir, o objeto volta com os padrões: aberto e fosco.
      expect(applyDevices(template)[0].foldAngle).toBe(180);
      expect(applyDevices(template)[0].matteFinish).toBe(true);
    });

    it("keeps the watch's finish too, the other model that has one", () => {
      const template = createSceneTemplate({
        name: "Template 1",
        objects: [
          {
            ...createSceneObject({ id: "w-1", modelId: "smartwatch", name: "Watch" }),
            matteFinish: false,
          },
        ],
      });

      expect(template.objects[0]).not.toHaveProperty("foldAngle");
      expect(applyDevices(template)[0].matteFinish).toBe(false);
    });

    it("keeps the Duo's polished finish", () => {
      const template = createSceneTemplate({
        name: "Template 1",
        objects: [
          {
            ...createSceneObject({ id: "duo-1", modelId: "duo", name: "Duo" }),
            matteFinish: false,
          },
        ],
      });

      expect(applyDevices(template)[0].matteFinish).toBe(false);
    });
  });

  it("still opens templates saved with the old matte finish option", () => {
    const template = createSceneTemplate({
      name: "Older",
      objects: [createSceneObject({ id: "object-1", name: "Object 1" })],
    });
    // Como um template de antes da remoção: com o campo, ligado ou desligado.
    const older = {
      ...template,
      objects: template.objects.map((object) => ({ ...object, matteColors: false })),
    };

    storeRaw([older]);

    const [loaded] = loadTemplates();
    const [rebuilt] = applySceneTemplate(loaded);

    expect(rebuilt.name).toBe("Object 1");
    expect("matteColors" in rebuilt).toBe(false);
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

describe("text objects in templates", () => {
  function sceneWithText() {
    return [
      createSceneObject({ id: "phone", name: "Phone", deletable: false }),
      createTextObject({
        content: "Novo\nlançamento",
        id: "headline",
        name: "Título",
        text: { color: "#ff8800", fontId: "oswald", weight: 700 },
      }),
    ];
  }

  it("saves the text with its style and brings it back", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: sceneWithText(),
    });
    const [phone, text] = applySceneTemplate(template);

    expect(template.objects[1]).toMatchObject({
      kind: "text",
      text: { content: "Novo\nlançamento", color: "#ff8800", fontId: "oswald" },
    });
    // O aparelho não ganha `kind` no template: o formato de antes continua o mesmo.
    expect(template.objects[0]).not.toHaveProperty("kind");
    expect(isDeviceObject(phone)).toBe(true);
    expect(text).toMatchObject({ kind: "text", name: "Título", rotationY: 0 });
    expect(text.id).not.toBe("headline");
    expect(text.deletable).toBe(true);
  });

  it("carries the keyframes of a text in a motion template", () => {
    const [phone, text] = sceneWithText();
    const { keyframes } = insertKeyframe(text, 1000);
    const template = createSceneTemplate({
      mode: "motion",
      name: "Template 1",
      objects: [phone, { ...text, keyframes }],
    });
    const rebuilt = applySceneTemplate(template)[1];

    expect(rebuilt.keyframes).toHaveLength(1);
    expect(rebuilt.keyframes[0].timeMs).toBe(1000);
    expect(rebuilt.keyframes[0].id).not.toBe(keyframes[0].id);
  });

  it("puts the text back inside the limits when it comes from outside", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: sceneWithText(),
    });
    const text = template.objects[1];

    if (!("text" in text)) throw new Error("expected a text object");

    text.text = { ...text.text, fontSize: 1e9, fontId: "nope" as never };

    const rebuilt = applySceneTemplate(template)[1];

    expect(rebuilt).toMatchObject({ kind: "text" });
    expect((rebuilt as { text: { fontSize: number; fontId: string } }).text)
      .toMatchObject({ fontSize: 600, fontId: "inter" });
  });

  it("opens templates saved before the text existed", () => {
    const old = createSceneTemplate({
      name: "Template 1",
      objects: [createSceneObject({ name: "Phone" })],
    });

    expect(isValidTemplate(JSON.parse(JSON.stringify(old)))).toBe(true);
  });

  it("rejects a text object without its text", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: sceneWithText(),
    });
    const broken = JSON.parse(JSON.stringify(template));

    delete broken.objects[1].text;

    expect(isValidTemplate(broken)).toBe(false);
  });

  it("changes the snapshot when the text changes", () => {
    const [phone, text] = sceneWithText();

    if (!isTextObject(text)) throw new Error("expected a text object");

    const edited = { ...text, text: { ...text.text, content: "Outro" } };

    expect(getTemplateSnapshot([phone, text], "static", null)).not.toBe(
      getTemplateSnapshot([phone, edited], "static", null),
    );
  });
});

describe("image objects in templates", () => {
  function sceneWithImage() {
    return [
      createSceneObject({ id: "phone", name: "Phone", deletable: false }),
      createImageObject({
        id: "logo",
        image: { aspect: 3, isVector: true, name: "logo.svg", url: "blob:logo" },
        name: "Logo",
      }),
    ];
  }

  it("keeps the proportion but never the file", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: sceneWithImage(),
    });

    expect(template.objects[1]).toMatchObject({ kind: "image", aspect: 3, name: "Logo" });
    expect(JSON.stringify(template)).not.toContain("blob:logo");
    expect(JSON.stringify(template)).not.toContain("logo.svg");
  });

  it("brings it back as the placeholder, where it was and with the same proportion", () => {
    const moved = [
      sceneWithImage()[0],
      { ...sceneWithImage()[1], positionX: 2, scale: 1.5 },
    ];
    const template = createSceneTemplate({ name: "Template 1", objects: moved });
    const rebuilt = applySceneTemplate(template)[1];

    expect(rebuilt).toMatchObject({
      kind: "image",
      image: { aspect: 3, isVector: false, name: null, url: null },
      positionX: 2,
      scale: 1.5,
    });
    expect(rebuilt.id).not.toBe("logo");
  });

  it("carries the keyframes of an image in a motion template", () => {
    const [phone, image] = sceneWithImage();
    const { keyframes } = insertKeyframe(image, 1000);
    const template = createSceneTemplate({
      mode: "motion",
      name: "Template 1",
      objects: [phone, { ...image, keyframes }],
    });

    expect(applySceneTemplate(template)[1].keyframes).toHaveLength(1);
  });

  it("puts a wild proportion from outside back inside the limits", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: sceneWithImage(),
    });
    const image = template.objects[1];

    if (!("aspect" in image)) throw new Error("expected an image object");

    image.aspect = 1e9;

    expect(
      (applySceneTemplate(template)[1] as { image: { aspect: number } }).image.aspect,
    ).toBe(20);
  });

  it("drops a stored image object that has no proportion", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: sceneWithImage(),
    });

    localStorage.setItem(
      "mock-photo-templates",
      JSON.stringify({
        templates: [
          {
            ...template,
            objects: [template.objects[0], { ...template.objects[1], aspect: "wide" }],
          },
        ],
        version: 1,
      }),
    );

    expect(loadTemplates()).toEqual([]);
  });
});

describe("stickers in templates", () => {
  function sceneWithSticker(outline = true) {
    return [
      createSceneObject({ id: "phone", name: "Phone", deletable: false }),
      createImageObject({
        id: "rocket",
        image: { ...getStickerImage("rocket"), outline },
        name: "Sticker 1",
      }),
    ];
  }

  it("saves only the id of the sticker and brings it back with its art", () => {
    const template = createSceneTemplate({ name: "Template 1", objects: sceneWithSticker() });
    const rebuilt = applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>;

    expect(template.objects[1]).toMatchObject({ kind: "image", sticker: "rocket", outline: true });
    // Diferente de um arquivo enviado, o sticker é do app: volta com a arte.
    expect(rebuilt.image).toMatchObject({
      outline: true,
      stickerId: "rocket",
      url: "/stickers/rocket.svg",
    });
  });

  it("keeps the outline the user turned off", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: sceneWithSticker(false),
    });
    const rebuilt = applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>;

    expect(rebuilt.image.outline).toBe(false);
  });

  it("turns the outline on for a sticker saved without the field", () => {
    const template = createSceneTemplate({ name: "Template 1", objects: sceneWithSticker() });
    const saved = template.objects[1];

    if (!("sticker" in saved)) throw new Error("expected an image object");

    delete saved.outline;

    expect(
      (applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>).image.outline,
    ).toBe(true);
  });

  it("falls back to the empty space for a sticker this version does not know", () => {
    const template = createSceneTemplate({ name: "Template 1", objects: sceneWithSticker() });
    const saved = template.objects[1];

    if (!("sticker" in saved)) throw new Error("expected an image object");

    saved.sticker = "from-the-future";

    expect(
      (applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>).image,
    ).toMatchObject({ stickerId: null, url: null });
  });

  it("does not turn an uploaded image into a sticker", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: [
        createSceneObject({ id: "phone", name: "Phone", deletable: false }),
        createImageObject({ image: { name: "a.png", url: "blob:a" }, name: "Imagem 1" }),
      ],
    });

    expect(template.objects[1]).not.toHaveProperty("sticker");
    expect(
      (applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>).image,
    ).toMatchObject({ outline: false, stickerId: null, url: null });
  });
});

describe("animated images in templates", () => {
  it("brings an animated sticker back animated, at the speed the user set", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: [
        createSceneObject({ id: "phone", name: "Phone", deletable: false }),
        createImageObject({
          image: { ...getStickerImage("animated-fire"), speed: 2 },
          name: "Sticker 1",
        }),
      ],
    });
    const rebuilt = applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>;

    expect(template.objects[1]).toMatchObject({ sticker: "animated-fire", speed: 2 });
    expect(rebuilt.image).toMatchObject({
      animation: "lottie",
      speed: 2,
      url: "/stickers/animated/fire.json",
    });
  });

  it("does not write the default speed, and reads a saved one inside the limits", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: [
        createSceneObject({ id: "phone", name: "Phone", deletable: false }),
        createImageObject({ image: getStickerImage("animated-fire"), name: "Sticker 1" }),
      ],
    });
    const saved = template.objects[1];

    expect(saved).not.toHaveProperty("speed");

    if (!("sticker" in saved)) throw new Error("expected an image object");

    saved.speed = 1e9;

    expect(
      (applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>).image.speed,
    ).toBe(4);
  });

  it("brings an uploaded GIF back as the still empty space, keeping its speed", () => {
    const template = createSceneTemplate({
      name: "Template 1",
      objects: [
        createSceneObject({ id: "phone", name: "Phone", deletable: false }),
        createImageObject({
          image: { animation: "gif", name: "a.gif", speed: 0.5, url: "blob:a" },
          name: "Imagem 1",
        }),
      ],
    });
    const rebuilt = applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>;

    expect(rebuilt.image).toMatchObject({
      animation: null,
      speed: 0.5,
      stickerId: null,
      url: null,
    });
  });
});

describe("the grid of the floor in templates", () => {
  const objects = () => [createSceneObject({ id: "phone", name: "Phone", deletable: false })];

  it("is left out when it is the automatic one, so the template stays as it was", () => {
    const template = createSceneTemplate({
      grid: { color: null, opacity: 1 },
      name: "Template 1",
      objects: objects(),
    });

    expect(template).not.toHaveProperty("grid");
  });

  it("saves a chosen color and opacity, and gives them back", () => {
    const template = createSceneTemplate({
      grid: { color: "#ff6a3d", opacity: 0.6 },
      name: "Template 1",
      objects: objects(),
    });

    expect(template.grid).toEqual({ color: "#ff6a3d", opacity: 0.6 });
  });

  it("changes the unsaved-changes snapshot only when the grid is not the automatic one", () => {
    const scene = objects();
    const base = getTemplateSnapshot(scene, "static", null);

    expect(getTemplateSnapshot(scene, "static", null, null, { color: null, opacity: 1 })).toBe(base);
    expect(getTemplateSnapshot(scene, "static", null, null, { color: null, opacity: 0.5 })).not.toBe(
      base,
    );
  });

  it("is put back inside the limits when it comes from outside (a stored template or a link)", () => {
    const template = createSceneTemplate({ name: "Template 1", objects: objects() });

    storeRaw([{ ...template, grid: { color: "not-a-color", opacity: 9 } }]);

    // Um template sem grade (ou com a automática) volta sem o campo; um valor
    // fora do formato vira a automática e some.
    const [loaded] = loadTemplates();

    expect(loaded.grid).toBeUndefined();

    storeRaw([{ ...template, grid: { color: "#AABBCC", opacity: 9 } }]);

    expect(loadTemplates()[0].grid).toEqual({ color: "#aabbcc", opacity: 1 });
  });

  it("opens templates saved before the grid existed", () => {
    const template = createSceneTemplate({ name: "Template 1", objects: objects() });

    storeRaw([template]);

    expect(loadTemplates()[0]).not.toHaveProperty("grid");
  });
});

describe("the shadow of an image in templates", () => {
  const withImage = (image: Parameters<typeof createImageObject>[0]["image"]) => [
    createSceneObject({ id: "phone", name: "Phone", deletable: false }),
    createImageObject({ image, name: "Imagem 1" }),
  ];
  const rebuild = (objects: ReturnType<typeof withImage>) =>
    (applySceneTemplate(createSceneTemplate({ name: "T", objects }))[1] as ReturnType<
      typeof createImageObject
    >).image;

  it("keeps the outline and the shadow apart: a sticker with the shadow alone, or the outline alone", () => {
    expect(rebuild(withImage({ ...getStickerImage("rocket"), outline: false, shadow: true }))).toMatchObject({
      outline: false,
      shadow: true,
    });
    expect(rebuild(withImage({ ...getStickerImage("rocket"), outline: true, shadow: false }))).toMatchObject({
      outline: true,
      shadow: false,
    });
  });

  it("gives an image saved before the shadow existed the shadow its outline had", () => {
    const template = createSceneTemplate({
      name: "T",
      objects: withImage({ ...getStickerImage("rocket"), outline: true, shadow: true }),
    });
    const saved = template.objects[1];

    if (!("sticker" in saved)) throw new Error("expected an image object");

    delete saved.shadow;

    expect(
      (applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>).image.shadow,
    ).toBe(true);

    saved.outline = false;

    expect(
      (applySceneTemplate(template)[1] as ReturnType<typeof createImageObject>).image.shadow,
    ).toBe(false);
  });
});

describe("the camera in templates", () => {
  const phone = () => createSceneObject({ id: "phone", name: "Phone", deletable: false });
  const animatedCamera = () => ({
    ...createCameraObject({ name: "Camera" }),
    keyframes: [
      createCameraKeyframe(0, DEFAULT_CAMERA_ORBIT),
      createCameraKeyframe(1000, { ...DEFAULT_CAMERA_ORBIT, azimuth: 90, fov: 30 }),
    ],
  });

  it("goes into a Video template with its keyframes, and comes back animated", () => {
    const template = createSceneTemplate({
      mode: "motion",
      name: "T",
      objects: [phone(), animatedCamera()],
    });
    const rebuilt = findCameraObject(applySceneTemplate(template));

    expect(template.objects.map((object) => object.kind)).toEqual([undefined, "camera"]);
    expect(rebuilt?.keyframes).toHaveLength(2);
    expect(rebuilt?.keyframes[1].transform.orbit).toMatchObject({ azimuth: 90, fov: 30 });
  });

  it("is left out of a Photo template and of a Video one with nothing to keep", () => {
    const photo = createSceneTemplate({ name: "T", objects: [phone(), animatedCamera()] });
    const still = createSceneTemplate({
      mode: "motion",
      name: "T",
      objects: [phone(), createCameraObject({ name: "Camera" })],
    });

    expect(photo.objects.some((object) => object.kind === "camera")).toBe(false);
    expect(still.objects.some((object) => object.kind === "camera")).toBe(false);
  });

  it("gives a template that has no camera one when it is applied, so a scene always has its own", () => {
    const old = createSceneTemplate({ name: "T", objects: [phone()] });
    const objects = applySceneTemplate(old);

    expect(objects.filter((object) => object.kind === "camera")).toHaveLength(1);
    expect(findCameraObject(objects)?.deletable).toBe(false);
    // O aparelho continua o primeiro, e o único que herda o invariante da base.
    expect(objects[0].kind).toBe("device");
  });

  it("puts an orbit that comes from outside back inside the limits", () => {
    const template = createSceneTemplate({
      mode: "motion",
      name: "T",
      objects: [phone(), animatedCamera()],
    });
    const camera = template.objects[1];

    if (!("keyframes" in camera) || !camera.keyframes) throw new Error("expected a camera");

    camera.keyframes[1].transform.orbit = {
      ...DEFAULT_CAMERA_ORBIT,
      elevation: 500,
      fov: 500,
    };

    const rebuilt = findCameraObject(applySceneTemplate(template));

    expect(rebuilt?.keyframes[1].transform.orbit).toMatchObject({ elevation: 85, fov: 90 });
  });

  it("drops the animation of a camera whose keyframe has a malformed orbit", () => {
    const template = createSceneTemplate({
      mode: "motion",
      name: "T",
      objects: [phone(), animatedCamera()],
    });
    const camera = template.objects[1];

    if (!("keyframes" in camera) || !camera.keyframes) throw new Error("expected a camera");

    (camera.keyframes[0].transform as { orbit: unknown }).orbit = { azimuth: "x" };
    storeRaw([template]);

    const [loaded] = loadTemplates();
    const loadedCamera = loaded.objects[1];

    expect("keyframes" in loadedCamera ? loadedCamera.keyframes : undefined).toEqual([]);
  });

  it("changes the unsaved-changes snapshot of a Video scene when the camera moves", () => {
    const scene = [phone(), animatedCamera()];
    const moved = [
      phone(),
      {
        ...animatedCamera(),
        keyframes: [createCameraKeyframe(0, { ...DEFAULT_CAMERA_ORBIT, azimuth: 5 })],
      },
    ];

    expect(getTemplateSnapshot(scene, "motion", null)).not.toBe(
      getTemplateSnapshot(moved, "motion", null),
    );
    // No Foto a câmera não entra: mexer nela não é uma alteração da cena.
    expect(getTemplateSnapshot(scene, "static", null)).toBe(
      getTemplateSnapshot(moved, "static", null),
    );
  });
});
