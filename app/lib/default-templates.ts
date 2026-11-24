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
  /** Ids de defaults antigos substituídos por este quando o usuário não os renomeou. */
  replacesIds?: readonly string[];
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
    id: "default-video-showcase",
    replacesIds: ["default-video-product-launch"],
    legacyNames: ["Product Launch", "Lançamento de produto"],
    names: {
      "en-US": "Video example",
      "pt-BR": "Exemplo de vídeo",
    },
    template: {
      "backgroundColor": "#fcfcfc",
      "camera": {
        "position": [
          -9.098743174381127,
          7.282309801602589e-14,
          725.1297046060279
        ],
        "target": [
          -9.098743174381127,
          2.8421545230997273e-14,
          -0.0026815798130108703
        ]
      },
      "mode": "motion",
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
          "name": "iPhone center",
          "positionX": 0,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true,
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0.19,
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
              "timeMs": 1000,
              "transform": {
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0.19,
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
              "timeMs": 1900,
              "transform": {
                "positionX": -0.04,
                "positionY": -0.13,
                "positionZ": 1.16,
                "rotationX": -15,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 7200,
              "transform": {
                "positionX": -0.05,
                "positionY": 0.2,
                "positionZ": 1.070300802776856,
                "rotationX": -26,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 8050,
              "transform": {
                "positionX": 0,
                "positionY": -1.05,
                "positionZ": 1.07,
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
              "timeMs": 9200,
              "transform": {
                "positionX": 0,
                "positionY": -1.05,
                "positionZ": 1.07,
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
              "timeMs": 11350,
              "transform": {
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0.19,
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
              "timeMs": 12600,
              "transform": {
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0.19,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            }
          ]
        },
        {
          "kind": "camera",
          "name": "Camera",
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "opacity": 1,
                "orbit": {
                  "azimuth": 0,
                  "distance": 725.1323861858409,
                  "elevation": 3.508354649267437e-15,
                  "fov": 45,
                  "targetX": -9.098743174381127,
                  "targetY": 2.8421545230997273e-14,
                  "targetZ": -0.0026815798130108703
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
              "timeMs": 29100,
              "transform": {
                "opacity": 1,
                "orbit": {
                  "azimuth": 0,
                  "distance": 725.1323861858409,
                  "elevation": 3.508354649267437e-15,
                  "fov": 45,
                  "targetX": -9.098743174381127,
                  "targetY": 2.8421545230997273e-14,
                  "targetZ": -0.0026815798130108703
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
          ]
        },
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
          "name": "iPhone left",
          "positionX": 1.9513571428571428,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true,
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "positionX": -1.02,
                "positionY": 0,
                "positionZ": 0,
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
              "timeMs": 1000,
              "transform": {
                "positionX": -3.46,
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
              "easing": "ease-in-out",
              "timeMs": 10850,
              "transform": {
                "positionX": -3.46,
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
              "easing": "ease-in-out",
              "timeMs": 12600,
              "transform": {
                "positionX": -1.02,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            }
          ]
        },
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
          "name": "iPhone right",
          "positionX": 3.9027142857142856,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true,
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "positionX": 1.03,
                "positionY": 0,
                "positionZ": 0,
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
              "timeMs": 1000,
              "transform": {
                "positionX": 3.34,
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
              "easing": "ease-in-out",
              "timeMs": 10850,
              "transform": {
                "positionX": 3.34,
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
              "easing": "ease-in-out",
              "timeMs": 12600,
              "transform": {
                "positionX": 1.03,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1,
                "opacity": 1,
                "foldAngle": 180
              }
            }
          ]
        },
        {
          "colors": {
            "grooves": "#000000",
            "bezel": "#050505",
            "lens": "#ffffff",
            "body": "#8a8a8e",
            "frame": "#a9a9ad",
            "frameHighlight": "#a9a9ad",
            "logo": "#7f7f83"
          },
          "deviceTheme": "gray",
          "isVisible": true,
          "modelId": "duo",
          "name": "DUO",
          "positionX": 5.854071428571429,
          "positionY": 0,
          "positionZ": 0,
          "rotationX": 0,
          "rotationY": 180,
          "rotationZ": 0,
          "scale": 1,
          "opacity": 1,
          "foldAngle": 180,
          "matteFinish": true,
          "showDeviceShell": true,
          "showNotebookKeyboard": true,
          "showTabletBezel": true,
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 12150,
              "transform": {
                "positionX": -0.05,
                "positionY": 0.03,
                "positionZ": 0.3,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1.26,
                "opacity": 0,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 12600,
              "transform": {
                "positionX": -0.05,
                "positionY": 0.03,
                "positionZ": 0.3,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1.26,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 13850,
              "transform": {
                "positionX": -0.06,
                "positionY": 0,
                "positionZ": 0.1,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1.28,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 14950,
              "transform": {
                "positionX": 1.6,
                "positionY": 1.12,
                "positionZ": 0.96,
                "rotationX": -19,
                "rotationY": 190,
                "rotationZ": 0,
                "scale": 1.28,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 18550,
              "transform": {
                "positionX": -1.74,
                "positionY": 1.08,
                "positionZ": 0.94,
                "rotationX": -19,
                "rotationY": 167,
                "rotationZ": 0,
                "scale": 1.28,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 20150,
              "transform": {
                "positionX": -0.06,
                "positionY": 0,
                "positionZ": 0.1,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1.28,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 22050,
              "transform": {
                "positionX": -0.06,
                "positionY": 0,
                "positionZ": -0.26,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1.28,
                "opacity": 1,
                "foldAngle": 0
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 23400,
              "transform": {
                "positionX": -0.03,
                "positionY": 0,
                "positionZ": 1.13,
                "rotationX": 0,
                "rotationY": 180,
                "rotationZ": 0,
                "scale": 1.28,
                "opacity": 1,
                "foldAngle": 0
              }
            }
          ]
        },
        {
          "kind": "background",
          "name": "Background",
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 0,
              "transform": {
                "opacity": 1,
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1,
                "background": {
                  "gradient": null,
                  "style": "floor",
                  "color": "#fcfcfc",
                  "grid": {
                    "color": null,
                    "opacity": 0.65
                  }
                }
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 22950,
              "transform": {
                "opacity": 1,
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1,
                "background": {
                  "gradient": null,
                  "style": "floor",
                  "color": "#fcfcfc",
                  "grid": {
                    "color": null,
                    "opacity": 0.65
                  }
                }
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 23400,
              "transform": {
                "opacity": 1,
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1,
                "background": {
                  "gradient": null,
                  "style": "flat",
                  "color": "#262422",
                  "grid": {
                    "color": null,
                    "opacity": 1
                  }
                }
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 29100,
              "transform": {
                "opacity": 1,
                "positionX": 0,
                "positionY": 0,
                "positionZ": 0,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1,
                "background": {
                  "gradient": null,
                  "style": "flat",
                  "color": "#262422",
                  "grid": {
                    "color": null,
                    "opacity": 1
                  }
                }
              }
            }
          ]
        },
        {
          "kind": "image",
          "aspect": 8.05446293494705,
          "isVisible": true,
          "outline": false,
          "shadow": false,
          "name": "Mock Studio",
          "opacity": 1,
          "positionX": 1,
          "positionY": 1,
          "positionZ": 0.25,
          "rotationX": 0,
          "rotationY": 0,
          "rotationZ": 0,
          "scale": 1,
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 23400,
              "transform": {
                "positionX": -0.06,
                "positionY": 0,
                "positionZ": 1.19,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1.21,
                "opacity": 1
              }
            },
            {
              "bezier": [
                0.11,
                0.53,
                0.73,
                1.5
              ],
              "easing": "cubic-bezier",
              "timeMs": 24900,
              "transform": {
                "positionX": -0.06,
                "positionY": 0,
                "positionZ": 0.86,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1.21,
                "opacity": 1,
                "foldAngle": 180
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 26750,
              "transform": {
                "positionX": -0.06,
                "positionY": 0,
                "positionZ": 0.86,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 1.21,
                "opacity": 1,
                "foldAngle": 180
              }
            }
          ],
          "asset": "mock-studio-logo"
        },
        {
          "kind": "image",
          "aspect": 1,
          "isVisible": true,
          "sticker": "animated-ghost",
          "outline": true,
          "shadow": true,
          "name": "Sticker 1",
          "opacity": 1,
          "positionX": -1,
          "positionY": 1,
          "positionZ": 0.25,
          "rotationX": 0,
          "rotationY": 0,
          "rotationZ": 0,
          "scale": 1,
          "keyframes": [
            {
              "easing": "ease-in-out",
              "timeMs": 23400,
              "transform": {
                "positionX": 1,
                "positionY": -0.07,
                "positionZ": 1.3,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 0.25,
                "opacity": 0
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 25750,
              "transform": {
                "positionX": -0.53,
                "positionY": 0.14,
                "positionZ": 1.3,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 0.25,
                "opacity": 1
              }
            },
            {
              "easing": "ease-in-out",
              "timeMs": 27650,
              "transform": {
                "positionX": -1.48,
                "positionY": 0.14,
                "positionZ": 1.3,
                "rotationX": 0,
                "rotationY": 0,
                "rotationZ": 0,
                "scale": 0.25,
                "opacity": 0.69
              }
            }
          ]
        }
      ],
      "frame": {
        "height": 1080,
        "width": 1920
      }
    },
  }
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

  // Mapeia defaults antigos que foram substituídos por uma nova versão.
  const replacementByOldId = new Map<string, DefaultTemplateEntry>();
  for (const entry of DEFAULT_TEMPLATES) {
    if (!seededSet.has(entry.id) && !existingIds.has(entry.id)) {
      for (const oldId of entry.replacesIds ?? []) {
        replacementByOldId.set(oldId, entry);
      }
    }
  }

  const now = Date.now();
  const replacedNewIds = new Set<string>();

  // Atualiza o nome de defaults entregues numa versão anterior (ou substitui
  // um default antigo por um novo) só se o usuário nunca os renomeou.
  let changedExisting = false;
  const migrated = existing.map((template, index) => {
    const replacement = replacementByOldId.get(template.id);
    if (replacement) {
      const untouchedNames = new Set([
        ...Object.values(replacement.names),
        ...(replacement.legacyNames ?? []),
      ]);
      if (untouchedNames.has(template.name)) {
        changedExisting = true;
        replacedNewIds.add(replacement.id);
        return normalizeTemplate({
          ...replacement.template,
          createdAt: now + index,
          id: replacement.id,
          name: replacement.names[locale],
        });
      }
    }

    const entry = defaultsById.get(template.id);
    if (entry?.legacyNames?.includes(template.name)) {
      changedExisting = true;
      return { ...template, name: entry.names[locale] };
    }
    return template;
  });

  const missing = DEFAULT_TEMPLATES.filter(
    (entry) =>
      !seededSet.has(entry.id) &&
      !existingIds.has(entry.id) &&
      !replacedNewIds.has(entry.id),
  );

  if (missing.length === 0) {
    if (changedExisting && persistTemplates(migrated) && replacedNewIds.size > 0) {
      persistSeededTemplateIds([...seededIds, ...replacedNewIds]);
    }
    return migrated;
  }

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
      ...replacedNewIds,
      ...missing.map((entry) => entry.id),
    ]);
  }

  return merged;
}
