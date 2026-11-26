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

  it("replaces an untouched legacy video default whose fingerprint matches 8d8c8dce", () => {
    // Cópia fiel do antigo `default-video-product-launch`: garante que mudanças
    // futuras em `normalizeTemplate` não quebrem a migração em silêncio.
    const untouchedLegacy = {
      id: "default-video-product-launch",
      name: "Video example",
      createdAt: "2026-01-01T00:00:00.000Z",
      backgroundColor: null,
      camera: {
        position: [166.80269858453516, 1.0415129831792172e-13, 1468.8556853526059],
        target: [166.80269858453516, 1.4210854715202004e-14, 0.016773344020947434],
      },
      frame: { height: 1080, width: 1920 },
      mode: "motion",
      objects: [
        {
          keyframes: [
            {
              easing: "ease-in-out",
              timeMs: 1150,
              transform: {
                positionX: -3.86,
                positionY: 0,
                positionZ: 1.76,
                rotationX: 0,
                rotationY: 180,
                rotationZ: 0,
                scale: 1,
                opacity: 0,
                foldAngle: 180,
              },
            },
            {
              bezier: [0, 1.5, 0.94, 1.5],
              easing: "cubic-bezier",
              timeMs: 4000,
              transform: {
                positionX: -1.26,
                positionY: 0,
                positionZ: 1.76,
                rotationX: 0,
                rotationY: 180,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                foldAngle: 180,
              },
            },
            {
              easing: "ease-in-out",
              timeMs: 4500,
              transform: {
                positionX: -1.26,
                positionY: 0,
                positionZ: 1.76,
                rotationX: 0,
                rotationY: 180,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                foldAngle: 180,
              },
            },
          ],
          colors: {
            body: "#8A8A8E",
            sideCuts: "#8A8A8E",
            topCutout: "#000000",
            frame: "#717174",
            rearInset: "#7f7f83",
            cameraMicroPart: "#6c6c6f",
            cameraBlock: "#7c7c80",
            cameraBlockInner: "#747477",
            cameraLensHighlight: "#ababae",
            cameraSideDetail: "#6e6e72",
          },
          deviceTheme: "gray",
          isVisible: true,
          modelId: "smartphone",
          name: "Smartphone",
          positionX: -1.26,
          positionY: 0,
          positionZ: 0,
          rotationX: 0,
          rotationY: 180,
          rotationZ: 0,
          scale: 1,
          opacity: 1,
          showDeviceShell: true,
          showNotebookKeyboard: true,
          showTabletBezel: true,
        },
        {
          keyframes: [
            {
              easing: "ease-in-out",
              timeMs: 0,
              transform: {
                positionX: 1.2,
                positionY: 0,
                positionZ: 0,
                rotationX: 0,
                rotationY: 180,
                rotationZ: 0,
                scale: 1,
                opacity: 0,
                foldAngle: 180,
              },
            },
            {
              bezier: [0.15, 1.2, 0.43, 1.5],
              easing: "cubic-bezier",
              timeMs: 1000,
              transform: {
                positionX: 1.21,
                positionY: 0,
                positionZ: 1.93,
                rotationX: 0,
                rotationY: 180,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                foldAngle: 180,
              },
            },
            {
              bezier: [0.14, 0.91, 0.26, 1.5],
              easing: "linear",
              timeMs: 4000,
              transform: {
                positionX: 1.21,
                positionY: 0,
                positionZ: 1.93,
                rotationX: 0,
                rotationY: 180,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                foldAngle: 180,
              },
            },
            {
              easing: "ease-in-out",
              timeMs: 4500,
              transform: {
                positionX: 1.21,
                positionY: 0,
                positionZ: 1.93,
                rotationX: 0,
                rotationY: 180,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                foldAngle: 180,
              },
            },
          ],
          colors: {
            screenBezel: "#000000",
            screenRubberSeal: "#1a1a1d",
            lowerHingeBar: "#000000",
            hingeRubberSeal: "#141416",
            keyboardGlyphs: "#101113",
            keyboardBaseOuter: "#8A8A8E",
            keyboardDeck: "#98989c",
            bodyBottom: "#636366",
            screenBackCover: "#8A8A8E",
            touchpad: "#a1a1a5",
            touchpadBorder: "#747477",
            powerButtonInner: "#747477",
            speakerGrilles: "#747477",
            keyboardKeys: "#747477",
            keyboardBacklight: "#a1a1a5",
            laptopOpenNotch: "#636366",
            AQdtiiJfiakvCKx: "#8A8A8E",
            DmUcWNXfiLPcftc: "#8A8A8E",
            ELAWKPIQpGuqYuU: "#8A8A8E",
            FmsrGmNZGtSredn: "#8A8A8E",
            jbtMEbemwaBHRTw: "#8A8A8E",
            jfSniDGKVWZvpyG: "#8A8A8E",
            lZDBMTdjXPebUMa: "#8A8A8E",
            ZroMGzfQtHrkgUh: "#8A8A8E",
            bckGBpxpLXNHmCa: "#8A8A8E",
            JXvTyELxHLGtnWp: "#8A8A8E",
            sIzFavpnYbDfLWk: "#8A8A8E",
            sonZrhRIQDlQHcy: "#8A8A8E",
            aBJxhjUzVIkBmJN: "#8A8A8E",
            mTDvrHXNRqkIrBd: "#8A8A8E",
            fVNvUQeYMdbMNOA: "#8A8A8E",
            IJeReHnhQHJFtgB: "#8A8A8E",
            lzNeOaWQWAReGok: "#8A8A8E",
            WZqbfOdYdlPMpRs: "#8A8A8E",
            EBRhBFNqcMTaWWv: "#8A8A8E",
            rFquJMQWzuecHQa: "#8A8A8E",
            eFpSjyrDhTgtyuf: "#8A8A8E",
            LBeBZdkKmrJVhJd: "#8A8A8E",
            MwJmMcLbTBwQpxl: "#8A8A8E",
            OCxZAMeEkQKexHA: "#8A8A8E",
            XodVrcYKiUPGCmX: "#8A8A8E",
            xiLiwJHfkqIwaTs: "#8A8A8E",
            LQtuXuSGFKsUXjP: "#8A8A8E",
            QSjoCOCzvxPnLpK: "#8A8A8E",
            screen: "#8A8A8E",
          },
          deviceTheme: "gray",
          isVisible: true,
          modelId: "notebook",
          name: "Desktop",
          positionX: 1.9513571428571428,
          positionY: 0,
          positionZ: 0,
          rotationX: 0,
          rotationY: 180,
          rotationZ: 0,
          scale: 1,
          opacity: 1,
          showDeviceShell: false,
          showNotebookKeyboard: false,
          showTabletBezel: true,
        },
        {
          keyframes: [
            {
              easing: "ease-in-out",
              timeMs: 1150,
              transform: {
                positionX: 5,
                positionY: 0,
                positionZ: 1.8,
                rotationX: 0,
                rotationY: 172,
                rotationZ: 0,
                scale: 1,
                opacity: 0,
                foldAngle: 180,
              },
            },
            {
              bezier: [0, 0.9, 0.55, 1.5],
              easing: "cubic-bezier",
              timeMs: 4000,
              transform: {
                positionX: 3.47,
                positionY: 0,
                positionZ: 1.81,
                rotationX: 0,
                rotationY: 172,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                foldAngle: 180,
              },
            },
            {
              easing: "ease-in-out",
              timeMs: 4500,
              transform: {
                positionX: 3.47,
                positionY: 0,
                positionZ: 1.81,
                rotationX: 0,
                rotationY: 172,
                rotationZ: 0,
                scale: 1,
                opacity: 1,
                foldAngle: 180,
              },
            },
          ],
          colors: {
            body: "#8A8A8E",
            twoSideButtons: "#6E6E72",
            oneSideButton: "#6E6E72",
            bandClasp: "#6E6E72",
            crownDetail: "#6E6E72",
            bandTop: "#8A8A8E",
            bandBottom: "#8A8A8E",
            bandDetails: "#8A8A8E",
            bandDetails2: "#8A8A8E",
            bodyBackground: "#8A8A8E",
          },
          deviceTheme: "gray",
          isVisible: true,
          modelId: "smartwatch",
          name: "Watch",
          positionX: 3.91,
          positionY: 0,
          positionZ: -0.15,
          rotationX: 0,
          rotationY: 180,
          rotationZ: 0,
          scale: 1,
          opacity: 1,
          matteFinish: true,
          showDeviceShell: true,
          showNotebookKeyboard: true,
          showTabletBezel: true,
        },
        {
          keyframes: [
            {
              easing: "ease-in-out",
              timeMs: 0,
              transform: {
                opacity: 1,
                orbit: {
                  azimuth: 0,
                  distance: 1468.8389120085849,
                  elevation: 3.508354649267438e-15,
                  fov: 45,
                  targetX: 166.80269858453516,
                  targetY: 1.4210854715202004e-14,
                  targetZ: 0.016773344020947434,
                },
                positionX: 0,
                positionY: 0,
                positionZ: 0,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 1,
              },
            },
            {
              easing: "ease-in-out",
              timeMs: 4500,
              transform: {
                opacity: 1,
                orbit: {
                  azimuth: 0,
                  distance: 1468.8389120085849,
                  elevation: 3.508354649267438e-15,
                  fov: 45,
                  targetX: 166.80269858453516,
                  targetY: 1.4210854715202004e-14,
                  targetZ: 0.016773344020947434,
                },
                positionX: 0,
                positionY: 0,
                positionZ: 0,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 1,
              },
            },
          ],
          kind: "camera",
          name: "Camera",
        },
        {
          keyframes: [
            {
              easing: "ease-in-out",
              timeMs: 0,
              transform: {
                background: {
                  gradient: null,
                  style: "floor",
                  color: "#2e2b28",
                  grid: { color: null, opacity: 1 },
                },
                opacity: 1,
                positionX: 0,
                positionY: 0,
                positionZ: 0,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 1,
              },
            },
            {
              easing: "ease-in-out",
              timeMs: 4500,
              transform: {
                background: {
                  gradient: null,
                  style: "floor",
                  color: "#2e2b28",
                  grid: { color: null, opacity: 1 },
                },
                opacity: 1,
                positionX: 0,
                positionY: 0,
                positionZ: 0,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 1,
              },
            },
          ],
          kind: "background",
          name: "Background",
        },
        {
          keyframes: [
            {
              easing: "ease-in-out",
              timeMs: 1900,
              transform: {
                positionX: 1.19,
                positionY: -1.48,
                positionZ: 2.35,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 0.34,
                opacity: 0,
              },
            },
            {
              easing: "ease-in-out",
              timeMs: 2250,
              transform: {
                positionX: 1.19,
                positionY: -0.83,
                positionZ: 2.35,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 0.7,
                opacity: 1,
              },
            },
            {
              easing: "ease-in-out",
              timeMs: 4500,
              transform: {
                positionX: 1.19,
                positionY: -0.83,
                positionZ: 2.35,
                rotationX: 0,
                rotationY: 0,
                rotationZ: 0,
                scale: 0.7,
                opacity: 1,
              },
            },
          ],
          kind: "image",
          aspect: 1,
          isVisible: true,
          sticker: "animated-rocket",
          outline: true,
          shadow: true,
          name: "Sticker 1",
          opacity: 1,
          positionX: 1,
          positionY: 1,
          positionZ: 0.25,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scale: 1,
        },
      ],
    };

    expect(persistTemplates([untouchedLegacy as never])).toBe(true);

    const loaded = loadTemplatesWithDefaults("en-US");
    expect(loaded.find((t) => t.id === "default-video-product-launch")).toBeUndefined();
    expect(loaded.find((t) => t.id === "default-video-showcase")).toBeDefined();
  });
});
