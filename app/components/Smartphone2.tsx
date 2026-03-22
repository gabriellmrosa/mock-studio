"use client";

import * as THREE from "three";
import React, { JSX, useEffect, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { GLTF, SkeletonUtils } from "three-stdlib";
import {
  buildScreenCanvas,
  MAX_TEXTURE_SIZE,
} from "../lib/mockup-image";
import {
  SMARTPHONE2_DEFAULT_THEME,
  SMARTPHONE2_THEMES,
  type Smartphone2Colors,
} from "../lib/3d-tokens/smartphone2";

// Dimensões da tela do smartphone2 derivadas da geometria do mesh (purple_screen).
// Proporção física: 2.071 (X) × 4.568 (Y) em unidades Three.js.
// Os UVs da mesh NÃO são 0–1: vão de U=0.2928 a U=0.6568 (V é 0–1 normal).
// O repeat/offset abaixo remapeia a textura para cobrir exatamente esse intervalo.
const SCREEN2_CROP_W = 207;
const SCREEN2_CROP_H = 457;
const SCREEN2_UV_U_MIN = 0.2928;
const SCREEN2_UV_U_MAX = 0.6568;

// ---------------------------------------------------------------------------
// Mapeamento semântico — partes visíveis identificadas via debug mode.
// Partes não visíveis (Plane008_4, Plane008_6) excluídas intencionalmente.
// ---------------------------------------------------------------------------
export const MESH_SEMANTIC: Record<string, string> = {
  sideBody:      "Plane008_1", // casca lateral — cor primária
  chargingPort:  "Plane008_2", // buraco do conector na base
  frontBody:     "Plane008_3", // painel frontal — mesma cor que sideBody
  sideButtons:   "Plane008_5", // botões laterais
  // Plane008_7 = tela, tratada separadamente
  speakerGrille: "Plane008_8", // grade do speaker frontal (topo)
};

export type Smartphone2DebugPartKey = keyof typeof MESH_SEMANTIC;

// Re-exports para compatibilidade
export type { Smartphone2Colors };

// ---------------------------------------------------------------------------
// Tipos GLTF
// ---------------------------------------------------------------------------
type GLTFResult = GLTF & {
  nodes: {
    Bone_9: THREE.Bone;
    Plane008_1: THREE.Mesh;
    Plane008_2: THREE.Mesh;
    Plane008_3: THREE.Mesh;
    Plane008_4: THREE.Mesh;
    Plane008_5: THREE.Mesh;
    Plane008_6: THREE.Mesh;
    Plane008_7: THREE.Mesh;
    Plane008_8: THREE.Mesh;
  };
  materials: Record<string, THREE.Material>;
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type Smartphone2Props = JSX.IntrinsicElements["group"] & {
  imageUrl?: string;
  colors?: Record<string, string>;
  debugPartColors?: Partial<Record<string, string>>;
  showDeviceShell?: boolean;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
  screenRotation?: [number, number, number];
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
function Smartphone2Impl({
  imageUrl,
  colors,
  debugPartColors,
  showDeviceShell = true,
  screenPosition: _sp,
  screenSize: _ss,
  screenRotation: _sr,
  ...props
}: Smartphone2Props) {
  const { scene } = useGLTF("/models/smartphone2.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  // useGraph para ter acesso tipado aos nodes caso precisemos no futuro
  useGraph(clone) as unknown as GLTFResult;

  const effectiveImageUrl =
    imageUrl && imageUrl !== "/placeholder-enus.png"
      ? imageUrl
      : "/placeholder-enus.png";

  const sourceTexture = useTexture(effectiveImageUrl);

  const texture = useMemo(() => {
    const img = sourceTexture.image as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!img) return sourceTexture;

    const imgW = img instanceof HTMLImageElement ? (img.naturalWidth || img.width) : img.width;
    const imgH = img instanceof HTMLImageElement ? (img.naturalHeight || img.height) : img.height;

    const canvas = buildScreenCanvas(img, imgW, imgH, SCREEN2_CROP_W, SCREEN2_CROP_H, MAX_TEXTURE_SIZE);
    const t = sourceTexture.clone();
    t.image = canvas;
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 16;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    // Os UVs da mesh da tela mapeiam de U=0.2928 a U=0.6568 (não 0–1).
    // Ajusta repeat/offset para a imagem preencher exatamente esse intervalo.
    const uRange = SCREEN2_UV_U_MAX - SCREEN2_UV_U_MIN;
    t.repeat.set(1 / uRange, 1);
    t.offset.set(-SCREEN2_UV_U_MIN / uRange, 0);
    t.needsUpdate = true;
    return t;
  }, [sourceTexture]);

  useEffect(() => {
    if (texture !== sourceTexture) return () => texture.dispose();
  }, [sourceTexture, texture]);

  const screenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }),
    [texture],
  );
  useEffect(() => () => screenMat.dispose(), [screenMat]);

  // Esconde nós com scale=0 (variantes inativos do GLTF) para não distorcer bounding box
  useEffect(() => {
    clone.traverse((obj) => {
      if (obj.scale.x === 0 && obj.scale.y === 0 && obj.scale.z === 0) {
        obj.visible = false;
      }
    });
  }, [clone]);

  // Materiais de tema — um por parte visível
  const c: Smartphone2Colors = (colors as Smartphone2Colors) ?? SMARTPHONE2_THEMES[SMARTPHONE2_DEFAULT_THEME];
  const partMaterials = useMemo(
    () => ({
      sideBody:      new THREE.MeshLambertMaterial({ color: c.sideBody }),
      chargingPort:  new THREE.MeshLambertMaterial({ color: c.chargingPort }),
      frontBody:     new THREE.MeshLambertMaterial({ color: c.frontBody }),
      sideButtons:   new THREE.MeshLambertMaterial({ color: c.sideButtons }),
      speakerGrille: new THREE.MeshLambertMaterial({ color: c.speakerGrille }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c.sideBody, c.chargingPort, c.frontBody, c.sideButtons, c.speakerGrille],
  );
  useEffect(() => () => Object.values(partMaterials).forEach((m) => m.dispose()), [partMaterials]);

  // Aplica textura da tela ao mesh Plane008_7 do clone
  useEffect(() => {
    const mesh = clone.getObjectByName("Plane008_7") as THREE.Mesh | undefined;
    if (mesh) mesh.material = screenMat;
  }, [clone, screenMat]);

  // Aplica cores de tema e, se ativo, sobrepõe com cores de debug
  useEffect(() => {
    Object.entries(MESH_SEMANTIC).forEach(([semantic, glbName]) => {
      const mesh = clone.getObjectByName(glbName) as THREE.Mesh | undefined;
      if (!mesh) return;

      if (debugPartColors?.[semantic]) {
        mesh.material = new THREE.MeshBasicMaterial({ color: debugPartColors[semantic] });
      } else {
        mesh.material = partMaterials[semantic as keyof typeof partMaterials];
      }
    });
  }, [clone, debugPartColors, partMaterials]);

  // Controla visibilidade das partes (showDeviceShell)
  useEffect(() => {
    Object.values(MESH_SEMANTIC).forEach((glbName) => {
      const mesh = clone.getObjectByName(glbName) as THREE.Mesh | undefined;
      if (mesh) mesh.visible = showDeviceShell;
    });
  }, [clone, showDeviceShell]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clone} />
    </group>
  );
}

export const Smartphone2 = React.memo(Smartphone2Impl);

useGLTF.preload("/models/smartphone2.glb");
