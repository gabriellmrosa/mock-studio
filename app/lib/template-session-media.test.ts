import { createAudioObject } from "./audio-objects";
import { createImageObject } from "./image-objects";
import {
  DEFAULT_SCREEN_FIT,
  createSceneObject,
  isAudioObject,
  isDeviceObject,
  isImageObject,
  type SceneObject,
} from "./scene-objects";
import { applySceneTemplate, createSceneTemplate } from "./scene-templates";
import {
  clearAllTemplateSessionMedia,
  clearTemplateSessionMedia,
  restoreTemplateSessionMedia,
  saveTemplateSessionMedia,
} from "./template-session-media";

describe("template-session-media", () => {
  beforeEach(() => {
    clearAllTemplateSessionMedia();
  });

  it("restores device screen images, screen videos, outer screens, loose images, and music for a template", () => {
    const phone = createSceneObject({
      deletable: false,
      modelId: "duo",
      name: "Duo",
    });
    phone.imageUrl = "blob:inner-screen";
    phone.imageName = "inner.png";
    phone.imageFit = { ...DEFAULT_SCREEN_FIT, zoom: 1.4 };
    phone.screenSource = "video";
    phone.screenVideo = {
      durationMs: 4000,
      fit: { ...DEFAULT_SCREEN_FIT, zoom: 1.2 },
      name: "demo.mp4",
      startMs: 500,
      trimEndMs: 3500,
      trimStartMs: 200,
      url: "blob:inner-video",
    };
    phone.outerImageUrl = "blob:outer-screen";
    phone.outerImageName = "outer.png";
    phone.outerScreenSource = "image";

    const looseImage = createImageObject({
      image: {
        animation: null,
        aspect: 1.5,
        isVector: false,
        name: "logo.png",
        outline: false,
        shadow: false,
        speed: 1,
        stickerId: null,
        url: "blob:logo",
      },
      name: "Logo",
    });

    const music = createAudioObject({
      audio: {
        durationMs: 12000,
        fadeInMs: 300,
        fadeOutMs: 500,
        name: "track.mp3",
        startMs: 0,
        trimEndMs: 12000,
        trimStartMs: 1000,
        url: "blob:track",
        volume: 0.8,
      },
      name: "Music",
    });

    const originalObjects: SceneObject[] = [phone, looseImage, music];
    const template = createSceneTemplate({
      mode: "motion",
      name: "Template 1",
      objects: originalObjects,
    });

    saveTemplateSessionMedia(template.id, originalObjects);

    // Ao aplicar o template do localStorage, as mídias voltam vazias...
    const rebuilt = applySceneTemplate(template);
    const rebuiltPhone = rebuilt.find(isDeviceObject);
    expect(rebuiltPhone?.imageName).toBeNull();
    expect(rebuiltPhone?.screenVideo).toBeNull();

    // ...e o cache de sessão restaura tudo automaticamente.
    const restored = restoreTemplateSessionMedia(template.id, rebuilt, "motion");
    const restoredPhone = restored.find(isDeviceObject);
    const restoredImage = restored.find(isImageObject);
    const restoredAudio = restored.find(isAudioObject);

    expect(restoredPhone).toMatchObject({
      imageName: "inner.png",
      imageUrl: "blob:inner-screen",
      outerImageName: "outer.png",
      outerImageUrl: "blob:outer-screen",
      pendingOuterScreen: null,
      pendingScreen: null,
      screenSource: "video",
      screenVideo: expect.objectContaining({
        name: "demo.mp4",
        url: "blob:inner-video",
      }),
    });
    expect(restoredPhone?.imageFit.zoom).toBe(1.4);

    expect(restoredImage?.image).toMatchObject({
      name: "logo.png",
      url: "blob:logo",
    });

    expect(restoredAudio).toMatchObject({
      audio: expect.objectContaining({
        name: "track.mp3",
        url: "blob:track",
        volume: 0.8,
      }),
      pendingAudio: null,
    });
  });

  it("keeps each template isolated and stops restoring once cleared", () => {
    const phone1 = createSceneObject({ deletable: false, name: "Phone 1" });
    phone1.imageUrl = "blob:screen-1";
    phone1.imageName = "screen-1.png";

    const phone2 = createSceneObject({ deletable: false, name: "Phone 2" });

    const template1 = createSceneTemplate({
      mode: "static",
      name: "Template 1",
      objects: [phone1],
    });
    const template2 = createSceneTemplate({
      mode: "static",
      name: "Template 2",
      objects: [phone2],
    });

    saveTemplateSessionMedia(template1.id, [phone1]);

    // Template 2 nunca recebeu mídia: continua com placeholder.
    const restored2 = restoreTemplateSessionMedia(
      template2.id,
      applySceneTemplate(template2),
      "static",
    );
    expect(restored2.find(isDeviceObject)?.imageName).toBeNull();

    // Template 1 lembra sua tela.
    const restored1 = restoreTemplateSessionMedia(
      template1.id,
      applySceneTemplate(template1),
      "static",
    );
    expect(restored1.find(isDeviceObject)?.imageUrl).toBe("blob:screen-1");

    // Depois de apagar o template, o cache dele também some.
    clearTemplateSessionMedia(template1.id);
    const afterClear = restoreTemplateSessionMedia(
      template1.id,
      applySceneTemplate(template1),
      "static",
    );
    expect(afterClear.find(isDeviceObject)?.imageName).toBeNull();
  });

  it("restores music added in the session even if the template was not overwritten", () => {
    const phone = createSceneObject({ deletable: false, name: "Phone" });
    const template = createSceneTemplate({
      mode: "motion",
      name: "Video template",
      objects: [phone],
    });

    const music = createAudioObject({
      audio: {
        durationMs: 8000,
        fadeInMs: 0,
        fadeOutMs: 0,
        name: "bgm.mp3",
        startMs: 0,
        trimEndMs: 8000,
        trimStartMs: 0,
        url: "blob:bgm",
        volume: 1,
      },
      name: "Music",
    });

    saveTemplateSessionMedia(template.id, [phone, music]);

    const restored = restoreTemplateSessionMedia(
      template.id,
      applySceneTemplate(template),
      "motion",
    );
    expect(restored.find(isAudioObject)?.audio?.url).toBe("blob:bgm");
  });

  it("matches devices by name and model so deleting one without saving does not swap screens", () => {
    const phone1 = createSceneObject({ deletable: false, name: "iPhone 1" });
    phone1.imageUrl = "blob:screen-1";
    phone1.imageName = "one.png";

    const phone2 = createSceneObject({ deletable: true, name: "iPhone 2" });
    phone2.imageUrl = "blob:screen-2";
    phone2.imageName = "two.png";

    const template = createSceneTemplate({
      mode: "static",
      name: "Two phones",
      objects: [phone1, phone2],
    });

    // Usuário apaga o primeiro aparelho sem salvar o template e troca de template.
    saveTemplateSessionMedia(template.id, [phone2]);

    const restored = restoreTemplateSessionMedia(
      template.id,
      applySceneTemplate(template),
      "static",
    );
    const devices = restored.filter(isDeviceObject);
    expect(devices[0].name).toBe("iPhone 1");
    expect(devices[0].imageName).toBeNull();
    expect(devices[1].name).toBe("iPhone 2");
    expect(devices[1].imageName).toBe("two.png");
    expect(devices[1].imageUrl).toBe("blob:screen-2");
  });
});
