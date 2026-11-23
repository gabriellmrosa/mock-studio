"use client";

import type { Locale } from "./i18n";
import {
  loadTemplates,
  normalizeTemplate,
  persistTemplates,
  type SceneTemplate,
} from "./scene-templates";

// ---------------------------------------------------------------------------
// Templates padrão — entregues uma única vez a usuários novos e antigos.
//
// Cada entrada tem um `id` fixo para rastrear o que já foi entregue em
// `SEEDED_TEMPLATES_STORAGE_KEY`. Depois de entregues, viram templates comuns
// na lista do usuário: podem ser renomeados, sobrepostos ou apagados, e um
// template apagado não volta ao recarregar a página.
// ---------------------------------------------------------------------------

const SEEDED_TEMPLATES_STORAGE_KEY = "mock-photo-seeded-templates";

export type DefaultTemplateEntry = {
  id: string;
  /** Nomes anteriores deste default: se o usuário ainda não renomeou, atualiza. */
  legacyNames?: readonly string[];
  names: Record<Locale, string>;
  template: Omit<SceneTemplate, "createdAt" | "id" | "name">;
};

export const DEFAULT_TEMPLATES: readonly DefaultTemplateEntry[] = [
  {
    id: "default-photo-product-showcase",
    legacyNames: ["Product Showcase", "Vitrine de produto"],
    names: {
      "en-US": "Photo example",
      "pt-BR": "Exemplo de foto",
    },
    template: {
      "backgroundColor": null,
      "camera": {
        "position": [
          -239.86662378094888,
          14.88756067832386,
          906.5093817808653
        ],
        "target": [
          119.75460744388573,
          9.417478598881852,
          -28.20687261798362
        ]
      },
      "mode": "static",
      "objects": [
        {
          "colors": {
            "body": "#8A8A8E",
            "sideCuts": "#8A8A8E",
            "topCutout": "#000000",
            "frame": "#717174",
            "rearInset": "#7f7f83",
            "cameraMicroPart": "#6c6c6f",
            "cameraBlock": "#7c7c80",
            "cameraBlockInner": "#747477",
            "cameraLensHighlight": "#ababae",
            "cameraSideDetail": "#6e6e72"
          },
          "deviceTheme": "gray",
          "isVisible": true,
          "modelId": "smartphone",
          "name": "Object 1",
          "positionX": -1.26,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true
        },
        {
          "colors": {
            "screenBezel": "#000000",
            "screenRubberSeal": "#1a1a1d",
            "lowerHingeBar": "#000000",
            "hingeRubberSeal": "#141416",
            "keyboardGlyphs": "#101113",
            "keyboardBaseOuter": "#8A8A8E",
            "keyboardDeck": "#98989c",
            "bodyBottom": "#636366",
            "screenBackCover": "#8A8A8E",
            "touchpad": "#a1a1a5",
            "touchpadBorder": "#747477",
            "powerButtonInner": "#747477",
            "speakerGrilles": "#747477",
            "keyboardKeys": "#747477",
            "keyboardBacklight": "#a1a1a5",
            "laptopOpenNotch": "#636366",
            "AQdtiiJfiakvCKx": "#8A8A8E",
            "DmUcWNXfiLPcftc": "#8A8A8E",
            "ELAWKPIQpGuqYuU": "#8A8A8E",
            "FmsrGmNZGtSredn": "#8A8A8E",
            "jbtMEbemwaBHRTw": "#8A8A8E",
            "jfSniDGKVWZvpyG": "#8A8A8E",
            "lZDBMTdjXPebUMa": "#8A8A8E",
            "ZroMGzfQtHrkgUh": "#8A8A8E",
            "bckGBpxpLXNHmCa": "#8A8A8E",
            "JXvTyELxHLGtnWp": "#8A8A8E",
            "sIzFavpnYbDfLWk": "#8A8A8E",
            "sonZrhRIQDlQHcy": "#8A8A8E",
            "aBJxhjUzVIkBmJN": "#8A8A8E",
            "mTDvrHXNRqkIrBd": "#8A8A8E",
            "fVNvUQeYMdbMNOA": "#8A8A8E",
            "IJeReHnhQHJFtgB": "#8A8A8E",
            "lzNeOaWQWAReGok": "#8A8A8E",
            "WZqbfOdYdlPMpRs": "#8A8A8E",
            "EBRhBFNqcMTaWWv": "#8A8A8E",
            "rFquJMQWzuecHQa": "#8A8A8E",
            "eFpSjyrDhTgtyuf": "#8A8A8E",
            "LBeBZdkKmrJVhJd": "#8A8A8E",
            "MwJmMcLbTBwQpxl": "#8A8A8E",
            "OCxZAMeEkQKexHA": "#8A8A8E",
            "XodVrcYKiUPGCmX": "#8A8A8E",
            "xiLiwJHfkqIwaTs": "#8A8A8E",
            "LQtuXuSGFKsUXjP": "#8A8A8E",
            "QSjoCOCzvxPnLpK": "#8A8A8E",
            "screen": "#8A8A8E"
          },
          "deviceTheme": "gray",
          "isVisible": true,
          "modelId": "notebook",
          "name": "Object 2",
          "positionX": 1.9513571428571428,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "showDeviceShell": false,
          "showNotebookKeyboard": false,
          "showTabletBezel": true
        },
        {
          "colors": {
            "body": "#8A8A8E",
            "twoSideButtons": "#6E6E72",
            "oneSideButton": "#6E6E72",
            "bandClasp": "#6E6E72",
            "crownDetail": "#6E6E72",
            "bandTop": "#8A8A8E",
            "bandBottom": "#8A8A8E",
            "bandDetails": "#8A8A8E",
            "bandDetails2": "#8A8A8E",
            "bodyBackground": "#8A8A8E"
          },
          "deviceTheme": "gray",
          "isVisible": true,
          "modelId": "smartwatch",
          "name": "Object 3",
          "positionX": 3.91,
          "positionY": 0,
          "positionZ": -0.15,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "matteFinish": true,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true
        }
      ]
    },
  },
  {
    id: "default-video-product-launch",
    legacyNames: ["Product Launch", "Lançamento de produto"],
    names: {
      "en-US": "Video example",
      "pt-BR": "Exemplo de vídeo",
    },
    template: {
      "backgroundColor": null,
      "camera": {
        "position": [
          166.80269858453516,
          1.0415129831792172e-13,
          1468.8556853526059
        ],
        "target": [
          166.80269858453516,
          1.4210854715202004e-14,
          0.016773344020947434
        ]
      },
      "frame": {
        "height": 1080,
        "width": 1920
      },
      "mode": "motion",
      "objects": [
        {
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 1150,
              "transform": {
                "positionX": -3.86,
                "positionY": 0,
                "positionZ": 1.76,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 0,
                "foldAngle": 180
              }
            },
            {
              "bezier": [
                0,
                1.5,
                0.94,
                1.5
              ],
              "easing": "cubic-bezier",
              "timeMs": 4000,
              "transform": {
                "positionX": -1.26,
                "positionY": 0,
                "positionZ": 1.76,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 4500,
              "transform": {
                "positionX": -1.26,
                "positionY": 0,
                "positionZ": 1.76,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            }
          ],
          "colors": {
            "body": "#8A8A8E",
            "sideCuts": "#8A8A8E",
            "topCutout": "#000000",
            "frame": "#717174",
            "rearInset": "#7f7f83",
            "cameraMicroPart": "#6c6c6f",
            "cameraBlock": "#7c7c80",
            "cameraBlockInner": "#747477",
            "cameraLensHighlight": "#ababae",
            "cameraSideDetail": "#6e6e72"
          },
          "deviceTheme": "gray",
          "isVisible": true,
          "modelId": "smartphone",
          "name": "Smartphone",
          "positionX": -1.26,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true
        },
        {
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "positionX": 1.2,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 0,
                "foldAngle": 180
              }
            },
            {
              "bezier": [
                0.15,
                1.2,
                0.43,
                1.5
              ],
              "easing": "cubic-bezier",
              "timeMs": 1000,
              "transform": {
                "positionX": 1.21,
                "positionY": 0,
                "positionZ": 1.93,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "bezier": [
                0.14,
                0.91,
                0.26,
                1.5
              ],
              "easing": "linear",
              "timeMs": 4000,
              "transform": {
                "positionX": 1.21,
                "positionY": 0,
                "positionZ": 1.93,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 4500,
              "transform": {
                "positionX": 1.21,
                "positionY": 0,
                "positionZ": 1.93,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            }
          ],
          "colors": {
            "screenBezel": "#000000",
            "screenRubberSeal": "#1a1a1d",
            "lowerHingeBar": "#000000",
            "hingeRubberSeal": "#141416",
            "keyboardGlyphs": "#101113",
            "keyboardBaseOuter": "#8A8A8E",
            "keyboardDeck": "#98989c",
            "bodyBottom": "#636366",
            "screenBackCover": "#8A8A8E",
            "touchpad": "#a1a1a5",
            "touchpadBorder": "#747477",
            "powerButtonInner": "#747477",
            "speakerGrilles": "#747477",
            "keyboardKeys": "#747477",
            "keyboardBacklight": "#a1a1a5",
            "laptopOpenNotch": "#636366",
            "AQdtiiJfiakvCKx": "#8A8A8E",
            "DmUcWNXfiLPcftc": "#8A8A8E",
            "ELAWKPIQpGuqYuU": "#8A8A8E",
            "FmsrGmNZGtSredn": "#8A8A8E",
            "jbtMEbemwaBHRTw": "#8A8A8E",
            "jfSniDGKVWZvpyG": "#8A8A8E",
            "lZDBMTdjXPebUMa": "#8A8A8E",
            "ZroMGzfQtHrkgUh": "#8A8A8E",
            "bckGBpxpLXNHmCa": "#8A8A8E",
            "JXvTyELxHLGtnWp": "#8A8A8E",
            "sIzFavpnYbDfLWk": "#8A8A8E",
            "sonZrhRIQDlQHcy": "#8A8A8E",
            "aBJxhjUzVIkBmJN": "#8A8A8E",
            "mTDvrHXNRqkIrBd": "#8A8A8E",
            "fVNvUQeYMdbMNOA": "#8A8A8E",
            "IJeReHnhQHJFtgB": "#8A8A8E",
            "lzNeOaWQWAReGok": "#8A8A8E",
            "WZqbfOdYdlPMpRs": "#8A8A8E",
            "EBRhBFNqcMTaWWv": "#8A8A8E",
            "rFquJMQWzuecHQa": "#8A8A8E",
            "eFpSjyrDhTgtyuf": "#8A8A8E",
            "LBeBZdkKmrJVhJd": "#8A8A8E",
            "MwJmMcLbTBwQpxl": "#8A8A8E",
            "OCxZAMeEkQKexHA": "#8A8A8E",
            "XodVrcYKiUPGCmX": "#8A8A8E",
            "xiLiwJHfkqIwaTs": "#8A8A8E",
            "LQtuXuSGFKsUXjP": "#8A8A8E",
            "QSjoCOCzvxPnLpK": "#8A8A8E",
            "screen": "#8A8A8E"
          },
          "deviceTheme": "gray",
          "isVisible": true,
          "modelId": "notebook",
          "name": "Desktop",
          "positionX": 1.9513571428571428,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "showDeviceShell": false,
          "showNotebookKeyboard": false,
          "showTabletBezel": true
        },
        {
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 1150,
              "transform": {
                "positionX": 5,
                "positionY": 0,
                "positionZ": 1.8,
                "rotationX": 0,
                "rotationY": 172,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 0,
                "foldAngle": 180
              }
            },
            {
              "bezier": [
                0,
                0.9,
                0.55,
                1.5
              ],
              "easing": "cubic-bezier",
              "timeMs": 4000,
              "transform": {
                "positionX": 3.47,
                "positionY": 0,
                "positionZ": 1.81,
                "rotationX": 0,
                "rotationY": 172,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 4500,
              "transform": {
                "positionX": 3.47,
                "positionY": 0,
                "positionZ": 1.81,
                "rotationX": 0,
                "rotationY": 172,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            }
          ],
          "colors": {
            "body": "#8A8A8E",
            "twoSideButtons": "#6E6E72",
            "oneSideButton": "#6E6E72",
            "bandClasp": "#6E6E72",
            "crownDetail": "#6E6E72",
            "bandTop": "#8A8A8E",
            "bandBottom": "#8A8A8E",
            "bandDetails": "#8A8A8E",
            "bandDetails2": "#8A8A8E",
            "bodyBackground": "#8A8A8E"
          },
          "deviceTheme": "gray",
          "isVisible": true,
          "modelId": "smartwatch",
          "name": "Watch",
          "positionX": 3.91,
          "positionY": 0,
          "positionZ": -0.15,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "matteFinish": true,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true
        },
        {
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "opacity": 1,
                "orbit": {
                  "azimuth": 0,
                  "distance": 1468.8389120085849,
                  "elevation": 3.508354649267438e-15,
                  "fov": 45,
                  "targetX": 166.80269858453516,
                  "targetY": 1.4210854715202004e-14,
                  "targetZ": 0.016773344020947434
                },
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 4500,
              "transform": {
                "opacity": 1,
                "orbit": {
                  "azimuth": 0,
                  "distance": 1468.8389120085849,
                  "elevation": 3.508354649267438e-15,
                  "fov": 45,
                  "targetX": 166.80269858453516,
                  "targetY": 1.4210854715202004e-14,
                  "targetZ": 0.016773344020947434
                },
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1
              }
            }
          ],
          "kind": "camera",
          "name": "Camera"
        },
        {
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "background": {
                  "gradient": null,
                  "style": "floor",
                  "color": "#2e2b28",
                  "grid": {
                    "color": null,
                    "opacity": 1
                  }
                },
                "opacity": 1,
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 4500,
              "transform": {
                "background": {
                  "gradient": null,
                  "style": "floor",
                  "color": "#2e2b28",
                  "grid": {
                    "color": null,
                    "opacity": 1
                  }
                },
                "opacity": 1,
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1
              }
            }
          ],
          "kind": "background",
          "name": "Background"
        },
        {
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 1900,
              "transform": {
                "positionX": 1.19,
                "positionY": -1.48,
                "positionZ": 2.35,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 0.34,
                "opacity": 0
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 2250,
              "transform": {
                "positionX": 1.19,
                "positionY": -0.83,
                "positionZ": 2.35,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 0.7,
                "opacity": 1
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 4500,
              "transform": {
                "positionX": 1.19,
                "positionY": -0.83,
                "positionZ": 2.35,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 0.7,
                "opacity": 1
              }
            }
          ],
          "kind": "image",
          "aspect": 1,
          "isVisible": true,
          "sticker": "animated-rocket",
          "outline": true,
          "shadow": true,
          "name": "Sticker 1",
          "opacity": 1,
          "positionX": 1,
          "positionY": 1,
          "positionZ": 0.25,
          "rotationX": 0,
          "rotationY": 0,
          "rotationZ": 0,
          "scale": 1
        }
      ]
    },
  },
];

function loadSeededTemplateIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SEEDED_TEMPLATES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function persistSeededTemplateIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SEEDED_TEMPLATES_STORAGE_KEY,
      JSON.stringify(ids),
    );
  } catch {
    // Sem acesso ao storage (modo privado/cota): os templates seguem só em memória.
  }
}

/**
 * Carrega os templates salvos e entrega os templates padrão que este navegador
 * ainda não recebeu. Só grava a marca de entrega quando a escrita dos templates
 * funciona, evitando perder defaults numa sessão sem espaço no localStorage.
 */
export function loadTemplatesWithDefaults(locale: Locale): SceneTemplate[] {
  const existing = loadTemplates();
  const seededIds = loadSeededTemplateIds();
  const seededSet = new Set(seededIds);
  const existingIds = new Set(existing.map((template) => template.id));
  const defaultsById = new Map(
    DEFAULT_TEMPLATES.map((entry) => [entry.id, entry]),
  );

  // Atualiza o nome de defaults entregues numa versão anterior só se o usuário
  // nunca os renomeou (ainda estão com um dos nomes antigos exatos).
  let renamedAny = false;
  const migrated = existing.map((template) => {
    const entry = defaultsById.get(template.id);
    if (entry?.legacyNames?.includes(template.name)) {
      renamedAny = true;
      return { ...template, name: entry.names[locale] };
    }
    return template;
  });

  const missing = DEFAULT_TEMPLATES.filter(
    (entry) => !seededSet.has(entry.id) && !existingIds.has(entry.id),
  );

  if (missing.length === 0) {
    if (renamedAny) {
      persistTemplates(migrated);
    }
    return migrated;
  }

  const now = Date.now();
  const defaults = missing.map((entry, index) =>
    normalizeTemplate({
      ...entry.template,
      createdAt: now + index,
      id: entry.id,
      name: entry.names[locale],
    }),
  );

  const merged = [...migrated, ...defaults];

  if (persistTemplates(merged)) {
    persistSeededTemplateIds([
      ...seededIds,
      ...missing.map((entry) => entry.id),
    ]);
  }

  return merged;
}
