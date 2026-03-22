"use client";

import * as THREE from "three";
import React, { useEffect, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { GLTF, SkeletonUtils } from "three-stdlib";
import {
  buildScreenCanvas,
  MAX_TEXTURE_SIZE,
} from "../lib/mockup-image";

// ---------------------------------------------------------------------------
// Notebook — parte das malhas já foi identificada via debug mode.
// O restante ainda permanece com o nome bruto do GLB até nova rodada de mapeamento.
// ---------------------------------------------------------------------------

export const NOTEBOOK_MESH_SEMANTIC = {
  touchpadBorder: "AQdtiiJfiakvCKx",
  keyboardBaseOuter: "cdsXAgNBwwCPrIE",
  laptopOpenNotch: "UcEDhfwzyyGMEfj",
  DmUcWNXfiLPcftc: "DmUcWNXfiLPcftc",
  ELAWKPIQpGuqYuU: "ELAWKPIQpGuqYuU",
  FmsrGmNZGtSredn: "FmsrGmNZGtSredn",
  jbtMEbemwaBHRTw: "jbtMEbemwaBHRTw",
  jfSniDGKVWZvpyG: "jfSniDGKVWZvpyG",
  lZDBMTdjXPebUMa: "lZDBMTdjXPebUMa",
  ZroMGzfQtHrkgUh: "ZroMGzfQtHrkgUh",
  bckGBpxpLXNHmCa: "bckGBpxpLXNHmCa",
  JXvTyELxHLGtnWp: "JXvTyELxHLGtnWp",
  keyboardBacklight: "cpUmMDYlGqLEAMt",
  sIzFavpnYbDfLWk: "sIzFavpnYbDfLWk",
  sonZrhRIQDlQHcy: "sonZrhRIQDlQHcy",
  aBJxhjUzVIkBmJN: "aBJxhjUzVIkBmJN",
  mTDvrHXNRqkIrBd: "mTDvrHXNRqkIrBd",
  fVNvUQeYMdbMNOA: "fVNvUQeYMdbMNOA",
  IJeReHnhQHJFtgB: "IJeReHnhQHJFtgB",
  lzNeOaWQWAReGok: "lzNeOaWQWAReGok",
  WZqbfOdYdlPMpRs: "WZqbfOdYdlPMpRs",
  speakerGrilles: "CFihWZPNFpzuzyX",
  bodyBottom: "qbFEMXRbwPWbFTN",
  powerButtonInner: "bzDyZTvUFAEJLcq",
  keyboardDeck: "dAVNlHAHYLbkxrB",
  EBRhBFNqcMTaWWv: "EBRhBFNqcMTaWWv",
  keyboardKeys: "LsmCMkPRBVEEGpg",
  keyboardGlyphs: "wyClPAIazRlKQnt",
  touchpad: "WzbwnVztmigkRgn",
  rFquJMQWzuecHQa: "rFquJMQWzuecHQa",
  eFpSjyrDhTgtyuf: "eFpSjyrDhTgtyuf",
  LBeBZdkKmrJVhJd: "LBeBZdkKmrJVhJd",
  MwJmMcLbTBwQpxl: "MwJmMcLbTBwQpxl",
  OCxZAMeEkQKexHA: "OCxZAMeEkQKexHA",
  XodVrcYKiUPGCmX: "XodVrcYKiUPGCmX",
  screenRubberSeal: "JNlPAPsywCtwJrd",
  screenBackCover: "KjpcUkkMjGYeXkV",
  hingeRubberSeal: "UEFeUEhkJPdlgXF",
  xiLiwJHfkqIwaTs: "xiLiwJHfkqIwaTs",
  LQtuXuSGFKsUXjP: "LQtuXuSGFKsUXjP",
  screenBezel: "nAIWMiVEtSYdjdZ",
  screen: "tfTbkkzhxqpKRgC",
  lowerHingeBar: "WyuoVWKMOcOlXJM",
  QSjoCOCzvxPnLpK: "QSjoCOCzvxPnLpK",
} as const;

const NOTEBOOK_SCREEN_MESH = NOTEBOOK_MESH_SEMANTIC.screen;
const NOTEBOOK_SCREEN_CROP_W = 1600;
const NOTEBOOK_SCREEN_CROP_H = 978;

export type NotebookDebugPartKey = keyof typeof NOTEBOOK_MESH_SEMANTIC;

const NOTEBOOK_FINISH_DEFAULTS = {
  bodyBottomClearcoat: 0.015,
  bodyBottomClearcoatRoughness: 0.86,
  bodyBottomMetalness: 0.02,
  bodyBottomRoughness: 0,
  keyboardBaseOuterRoughness: 0,
  keyboardDeckRoughness: 0,
  touchpadBorderRoughness: 0,
  touchpadRoughness: 0,
} as const;

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
};

type NotebookProps = React.ComponentPropsWithoutRef<"group"> & {
  imageUrl?: string;
  colors?: Record<string, string>;
  matteColors?: boolean;
  debugPartColors?: Partial<Record<string, string>>;
  showDeviceShell?: boolean;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
};

function applyFinishMaterial(material: THREE.Material, matte: boolean) {
  material.transparent = false;
  material.opacity = 1;

  if ("roughness" in material && typeof material.roughness === "number") {
    material.roughness = matte ? Math.max(material.roughness, 0.82) : Math.min(material.roughness, 0.42);
  }
  if ("metalness" in material && typeof material.metalness === "number") {
    material.metalness = matte ? Math.min(material.metalness, 0.05) : Math.max(material.metalness, 0.12);
  }
  if ("clearcoat" in material && typeof material.clearcoat === "number") {
    material.clearcoat = matte ? Math.min(material.clearcoat, 0.03) : Math.max(material.clearcoat, 0.14);
  }
  if ("clearcoatRoughness" in material && typeof material.clearcoatRoughness === "number") {
    material.clearcoatRoughness = matte ? Math.max(material.clearcoatRoughness, 0.72) : Math.min(material.clearcoatRoughness, 0.28);
  }
  if ("reflectivity" in material && typeof material.reflectivity === "number") {
    material.reflectivity = matte ? Math.min(material.reflectivity, 0.04) : Math.max(material.reflectivity, 0.18);
  }
  if ("envMapIntensity" in material && typeof material.envMapIntensity === "number") {
    material.envMapIntensity = matte ? Math.min(material.envMapIntensity, 0.16) : Math.max(material.envMapIntensity, 0.62);
  }

  return material;
}

function applyNotebookPartFinish(
  semantic: keyof typeof NOTEBOOK_MESH_SEMANTIC,
  material: THREE.Material,
  matte: boolean,
  bodyBottomFinish: {
    bodyBottomRoughness: number;
    bodyBottomMetalness: number;
    bodyBottomClearcoat: number;
    bodyBottomClearcoatRoughness: number;
    keyboardBaseOuterRoughness: number;
    keyboardDeckRoughness: number;
    touchpadRoughness: number;
    touchpadBorderRoughness: number;
  },
) {
  applyFinishMaterial(material, matte);

  if (semantic === "bodyBottom") {
    if ("roughness" in material && typeof material.roughness === "number") {
      material.roughness = bodyBottomFinish.bodyBottomRoughness;
    }
    if ("metalness" in material && typeof material.metalness === "number") {
      material.metalness = bodyBottomFinish.bodyBottomMetalness;
    }
    if ("clearcoat" in material && typeof material.clearcoat === "number") {
      material.clearcoat = bodyBottomFinish.bodyBottomClearcoat;
    }
    if ("clearcoatRoughness" in material && typeof material.clearcoatRoughness === "number") {
      material.clearcoatRoughness = bodyBottomFinish.bodyBottomClearcoatRoughness;
    }
  }

  if (semantic === "keyboardBaseOuter") {
    if ("roughness" in material && typeof material.roughness === "number") {
      material.roughness = bodyBottomFinish.keyboardBaseOuterRoughness;
    }
  }

  if (semantic === "keyboardDeck") {
    if ("roughness" in material && typeof material.roughness === "number") {
      material.roughness = bodyBottomFinish.keyboardDeckRoughness;
    }
  }

  if (semantic === "touchpad") {
    if ("roughness" in material && typeof material.roughness === "number") {
      material.roughness = bodyBottomFinish.touchpadRoughness;
    }
  }

  if (semantic === "touchpadBorder") {
    if ("roughness" in material && typeof material.roughness === "number") {
      material.roughness = bodyBottomFinish.touchpadBorderRoughness;
    }
  }

  return material;
}

// ---------------------------------------------------------------------------
function NotebookImpl({
  imageUrl,
  colors,
  matteColors = true,
  debugPartColors,
  showDeviceShell = true,
  screenPosition: _sp,
  screenSize: _ss,
  ...props
}: NotebookProps) {
  void _sp;
  void _ss;
  const { scene } = useGLTF("/models/notebook.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  useGraph(clone) as unknown as GLTFResult;
  const effectiveImageUrl = imageUrl ?? "/placeholder-2755x1684.png";
  const sourceTexture = useTexture(effectiveImageUrl);

  const screenTexture = useMemo(() => {
    const img = sourceTexture.image as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!img) return sourceTexture;

    const imgW = img instanceof HTMLImageElement ? (img.naturalWidth || img.width) : img.width;
    const imgH = img instanceof HTMLImageElement ? (img.naturalHeight || img.height) : img.height;
    const canvas = buildScreenCanvas(
      img,
      imgW,
      imgH,
      NOTEBOOK_SCREEN_CROP_W,
      NOTEBOOK_SCREEN_CROP_H,
      MAX_TEXTURE_SIZE,
    );
    const nextTexture = sourceTexture.clone();
    nextTexture.image = canvas;
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.flipY = false;
    nextTexture.minFilter = THREE.LinearMipmapLinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    nextTexture.anisotropy = 16;
    nextTexture.wrapS = THREE.ClampToEdgeWrapping;
    nextTexture.wrapT = THREE.ClampToEdgeWrapping;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [sourceTexture]);

  useEffect(() => {
    if (screenTexture !== sourceTexture) {
      return () => screenTexture.dispose();
    }
  }, [screenTexture, sourceTexture]);

  const screenMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: screenTexture,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
    [screenTexture],
  );

  useEffect(() => () => screenMaterial.dispose(), [screenMaterial]);

  // Esconde nós com scale=0 (variantes inativos do GLTF) para não distorcer bounding box
  useEffect(() => {
    clone.traverse((obj) => {
      if (obj.scale.x === 0 && obj.scale.y === 0 && obj.scale.z === 0) {
        obj.visible = false;
      }
    });
  }, [clone]);

  const originalMaterials = useMemo(() => {
    const materials = new Map<string, THREE.Material | THREE.Material[]>();
    clone.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name) {
        materials.set(obj.name, obj.material);
      }
    });
    return materials;
  }, [clone]);

  const debugMaterials = useMemo(() => {
    if (!debugPartColors) return null;
    return Object.fromEntries(
      Object.entries(debugPartColors).map(([part, color]) => [
        part,
        new THREE.MeshBasicMaterial({ color }),
      ]),
    );
  }, [debugPartColors]);

  useEffect(() => {
    if (!debugMaterials) return;
    return () => Object.values(debugMaterials).forEach((mat) => mat.dispose());
  }, [debugMaterials]);

  const themeMaterials = useMemo(() => {
    if (!colors) return null;

    return Object.fromEntries(
      Object.entries(NOTEBOOK_MESH_SEMANTIC).flatMap(([semantic, meshName]) => {
        const color = colors[semantic];
        const originalMaterial = originalMaterials.get(meshName);
        if (!color || !originalMaterial || Array.isArray(originalMaterial)) {
          return [];
        }

        const themedMaterial = originalMaterial.clone();
        if ("color" in themedMaterial && themedMaterial.color instanceof THREE.Color) {
          themedMaterial.color = new THREE.Color(color);
        }
        applyNotebookPartFinish(
          semantic as keyof typeof NOTEBOOK_MESH_SEMANTIC,
          themedMaterial,
          matteColors,
          NOTEBOOK_FINISH_DEFAULTS,
        );
        themedMaterial.needsUpdate = true;
        return [[semantic, themedMaterial] as const];
      }),
    );
  }, [colors, matteColors, originalMaterials]);

  useEffect(() => {
    if (!themeMaterials) return;
    return () => Object.values(themeMaterials).forEach((mat) => mat.dispose());
  }, [themeMaterials]);

  useEffect(() => {
    Object.entries(NOTEBOOK_MESH_SEMANTIC).forEach(([semantic, meshName]) => {
      const mesh = clone.getObjectByName(meshName) as THREE.Mesh | undefined;
      if (!mesh) return;

      const debugMaterial = debugMaterials?.[semantic];
      if (debugMaterial) {
        mesh.material = debugMaterial;
        return;
      }

      if (meshName === NOTEBOOK_SCREEN_MESH) {
        mesh.material = screenMaterial;
        return;
      }

      const themedMaterial = themeMaterials?.[semantic];
      if (themedMaterial) {
        mesh.material = themedMaterial;
        return;
      }

      const originalMaterial = originalMaterials.get(meshName);
      if (originalMaterial) {
        mesh.material = originalMaterial;
      }
    });
  }, [clone, colors, debugMaterials, originalMaterials, screenMaterial, themeMaterials]);

  // Controla visibilidade do device shell
  useEffect(() => {
    Object.values(NOTEBOOK_MESH_SEMANTIC).forEach((meshName) => {
      const mesh = clone.getObjectByName(meshName) as THREE.Mesh | undefined;
      if (!mesh) return;
      mesh.visible = meshName === NOTEBOOK_SCREEN_MESH ? true : showDeviceShell;
    });
  }, [clone, showDeviceShell]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}

export const Notebook = React.memo(NotebookImpl);

useGLTF.preload("/models/notebook.glb");
