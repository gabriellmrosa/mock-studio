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
import { createRoundedScreenGeometryFromMesh } from "../lib/rounded-screen";
import { getPlaceholderImageUrl } from "../lib/scene-objects";
import { createSimpleFinishMaterial } from "../lib/simple-finish-material";

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
const NOTEBOOK_SHELLLESS_SCREEN_RADIUS_RATIO = 0.04;

export type NotebookDebugPartKey = keyof typeof NOTEBOOK_MESH_SEMANTIC;

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
  showNotebookKeyboard?: boolean;
  showTabletBezel?: boolean;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
};

const NOTEBOOK_DISPLAY_ASSEMBLY_PARTS = new Set<keyof typeof NOTEBOOK_MESH_SEMANTIC>([
  "screen",
  "screenBezel",
  "screenBackCover",
  "screenRubberSeal",
  "lowerHingeBar",
  "hingeRubberSeal",
]);

// ---------------------------------------------------------------------------
function NotebookImpl({
  imageUrl,
  colors,
  matteColors = true,
  debugPartColors,
  showDeviceShell = true,
  showNotebookKeyboard = true,
  screenPosition: _sp,
  screenSize: _ss,
  ...props
}: NotebookProps) {
  void _sp;
  void _ss;
  const { scene } = useGLTF("/models/notebook.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  useGraph(clone) as unknown as GLTFResult;
  const effectiveImageUrl = imageUrl ?? getPlaceholderImageUrl("notebook");
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

  const debugMaterials = useMemo(() => {
    if (!debugPartColors) return null;
    return Object.fromEntries(
      Object.entries(debugPartColors).map(([part, color]) => {
        return [part, new THREE.MeshBasicMaterial({ color })] as const;
      }),
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
        if (!color || meshName === NOTEBOOK_SCREEN_MESH) {
          return [];
        }

        const themedMaterial = createSimpleFinishMaterial(color, matteColors);
        themedMaterial.needsUpdate = true;
        return [[semantic, themedMaterial] as const];
      }),
    );
  }, [colors, matteColors]);

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
      }
    });
  }, [
    clone,
    debugMaterials,
    screenMaterial,
    themeMaterials,
  ]);

  // A tela segue sempre visível. A base do notebook pode ser ocultada separadamente.
  useEffect(() => {
    Object.entries(NOTEBOOK_MESH_SEMANTIC).forEach(([semantic, meshName]) => {
      const mesh = clone.getObjectByName(meshName) as THREE.Mesh | undefined;
      if (!mesh) return;
      if (meshName === NOTEBOOK_SCREEN_MESH) {
        mesh.visible = showDeviceShell;
        return;
      }

      if (!showDeviceShell) {
        mesh.visible = false;
        return;
      }

      mesh.visible = showNotebookKeyboard
        ? true
        : NOTEBOOK_DISPLAY_ASSEMBLY_PARTS.has(
            semantic as keyof typeof NOTEBOOK_MESH_SEMANTIC,
          );
    });
  }, [clone, showDeviceShell, showNotebookKeyboard]);

  useEffect(() => {
    const screenMesh = clone.getObjectByName(NOTEBOOK_SCREEN_MESH) as THREE.Mesh | undefined;
    const screenParent = screenMesh?.parent;
    if (!screenMesh || !screenParent) {
      return;
    }

    const overlayGeometry = createRoundedScreenGeometryFromMesh(
      screenMesh,
      NOTEBOOK_SHELLLESS_SCREEN_RADIUS_RATIO,
    );
    if (!overlayGeometry) {
      return;
    }

    const overlayMesh = new THREE.Mesh(overlayGeometry, screenMaterial);
    overlayMesh.name = `${NOTEBOOK_SCREEN_MESH}_shelllessOverlay`;
    overlayMesh.position.copy(screenMesh.position);
    overlayMesh.quaternion.copy(screenMesh.quaternion);
    overlayMesh.scale.copy(screenMesh.scale);
    overlayMesh.visible = !showDeviceShell;
    screenParent.add(overlayMesh);

    return () => {
      screenParent.remove(overlayMesh);
      overlayGeometry.dispose();
    };
  }, [clone, screenMaterial, showDeviceShell]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}

export const Notebook = React.memo(NotebookImpl);

useGLTF.preload("/models/notebook.glb");
