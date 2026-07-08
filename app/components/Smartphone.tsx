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
import { getPlaceholderImageUrl } from "../lib/scene-objects";
import { createSimpleFinishMaterial } from "../lib/simple-finish-material";
import {
  SMARTPHONE_DEFAULT_THEME,
  SMARTPHONE_THEMES,
  type SmartphoneColors,
} from "../lib/3d-tokens/smartphone";

export const MESH_SEMANTIC = {
  topCutout: "Object_4",
  frame: "Object_5",
  rearInset: "Object_6",
  body: "Object_7",
  sideCuts: "Object_8",
  cameraMicroPart: "Object_9",
  cameraBlock: "Object_11",
  cameraBlockInner: "Object_12",
  screen: "Object_13",
  cameraLensHighlight: "Object_14",
  cameraSideDetail: "Object_15",
} as const;

const SCREEN_MESH = MESH_SEMANTIC.screen;
const FRONT_GLASS_MESH = "Object_10";
const SCREEN_CROP_W = 421;
const SCREEN_CROP_H = 896;

// ===========================================================================
// Smartphone — variante do Smartphone 2 SEM o notch (modelo principal/default).
//
// O notch (moldura + alto-falante + câmera) está fundido no frame (Object_5) e
// na tela entalhada (Object_13), então não dá para removê-lo só escondendo
// meshes. A estratégia é COBRIR: a tela entalhada é trocada por um plano limpo
// (retângulo arredondado, sem furo) empurrado um pouco à frente, ocultando o
// notch atrás dele. Os parâmetros abaixo controlam esse plano.
// ===========================================================================
type ScreenCut = {
  topInset: number;
  bottomInset: number;
  sideInset: number;
  offsetV: number;
  offsetH: number;
  depth: number;
  radiusRatio: number;
};

// Valores do plano da tela calibrados no editor.
const SCREEN_CUT: ScreenCut = {
  topInset: 0,
  bottomInset: 0,
  sideInset: 0,
  offsetV: 0,
  offsetH: 0,
  depth: 0.6,
  radiusRatio: 0.16,
};

export type DebugPartKey = keyof typeof MESH_SEMANTIC;
export type { SmartphoneColors };

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
};

type SmartphoneProps = JSX.IntrinsicElements["group"] & {
  imageUrl?: string;
  colors?: Record<string, string>;
  matteColors?: boolean;
  debugPartColors?: Partial<Record<string, string>>;
  showDeviceShell?: boolean;
  showNotebookKeyboard?: boolean;
  showTabletBezel?: boolean;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
  screenRotation?: [number, number, number];
};

function getRoundedRectangleShape(
  width: number,
  height: number,
  radius: number,
) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, height / 2 - radius);
  shape.lineTo(-width / 2, radius - height / 2);
  shape.quadraticCurveTo(
    -width / 2,
    -height / 2,
    radius - width / 2,
    -height / 2,
  );
  shape.lineTo(width / 2 - radius, -height / 2);
  shape.quadraticCurveTo(
    width / 2,
    -height / 2,
    width / 2,
    radius - height / 2,
  );
  shape.lineTo(width / 2, height / 2 - radius);
  shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
  shape.lineTo(radius - width / 2, height / 2);
  shape.quadraticCurveTo(
    -width / 2,
    height / 2,
    -width / 2,
    height / 2 - radius,
  );
  return shape;
}

function SmartphoneImpl({
  imageUrl,
  colors,
  matteColors = true,
  debugPartColors,
  showDeviceShell = true,
  screenPosition: _sp,
  screenSize: _ss,
  screenRotation: _sr,
  ...props
}: SmartphoneProps) {
  void _sp;
  void _ss;
  void _sr;

  const cut = SCREEN_CUT;

  const { scene } = useGLTF("/models/apple_iphone_14_pro_orange.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  useGraph(clone) as unknown as GLTFResult;

  const effectiveImageUrl = imageUrl ?? getPlaceholderImageUrl("smartphone");
  const sourceTexture = useTexture(effectiveImageUrl);
  const resolvedColors: SmartphoneColors =
    (colors as SmartphoneColors) ??
    SMARTPHONE_THEMES[SMARTPHONE_DEFAULT_THEME];

  const screenTexture = useMemo(() => {
    const img =
      sourceTexture.image as HTMLImageElement | HTMLCanvasElement | undefined;

    if (!img) return sourceTexture;

    const imgW =
      img instanceof HTMLImageElement ? (img.naturalWidth || img.width) : img.width;
    const imgH =
      img instanceof HTMLImageElement ? (img.naturalHeight || img.height) : img.height;

    const canvas = buildScreenCanvas(
      img,
      imgW,
      imgH,
      SCREEN_CROP_W,
      SCREEN_CROP_H,
      MAX_TEXTURE_SIZE,
    );

    const nextTexture = sourceTexture.clone();
    nextTexture.image = canvas;
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.flipY = true;
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
    () =>
      new THREE.MeshBasicMaterial({
        map: screenTexture,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [screenTexture],
  );

  useEffect(() => () => screenMaterial.dispose(), [screenMaterial]);

  // Plano de tela limpo (retângulo arredondado, SEM o furo do notch), que cobre
  // o notch quando empurrado um pouco à frente (cut.depth, no eixo X local).
  const cleanScreenGeometry = useMemo(() => {
    const screenMesh = clone.getObjectByName(SCREEN_MESH) as THREE.Mesh | undefined;
    if (!screenMesh) {
      return null;
    }

    screenMesh.geometry.computeBoundingBox();
    const boundingBox = screenMesh.geometry.boundingBox?.clone();
    if (!boundingBox) {
      return null;
    }

    const fullWidth = boundingBox.max.z - boundingBox.min.z;
    const fullHeight = boundingBox.max.y - boundingBox.min.y;
    if (fullWidth <= 0 || fullHeight <= 0) {
      return null;
    }

    const center = boundingBox.getCenter(new THREE.Vector3());

    const width = fullWidth * (1 - 2 * cut.sideInset);
    const height = fullHeight * (1 - cut.topInset - cut.bottomInset);
    if (width <= 0 || height <= 0) {
      return null;
    }

    // Após o rotateY(PI/2): horizontal = Z, vertical = Y, profundidade = X.
    const centerY =
      center.y +
      (fullHeight * (cut.bottomInset - cut.topInset)) / 2 +
      fullHeight * cut.offsetV;
    const centerZ = center.z + fullWidth * cut.offsetH;
    const centerX = center.x + cut.depth;

    const radius = Math.min(width, height) * cut.radiusRatio;
    const geometry = new THREE.ShapeGeometry(
      getRoundedRectangleShape(width, height, radius),
    );
    const position = geometry.getAttribute("position");
    const uvArray = new Float32Array(position.count * 2);
    const halfW = width / 2;
    const halfH = height / 2;

    for (let i = 0; i < position.count; i += 1) {
      uvArray[i * 2] = (position.getX(i) + halfW) / width;
      uvArray[i * 2 + 1] = (position.getY(i) + halfH) / height;
    }

    geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
    geometry.rotateY(Math.PI / 2);
    geometry.translate(centerX, centerY, centerZ);

    return geometry;
  }, [clone, cut]);

  useEffect(() => {
    if (!cleanScreenGeometry) {
      return;
    }

    return () => cleanScreenGeometry.dispose();
  }, [cleanScreenGeometry]);

  const cleanScreenMatrix = useMemo(() => {
    const screenMesh = clone.getObjectByName(SCREEN_MESH) as THREE.Mesh | undefined;
    if (!screenMesh) {
      return null;
    }

    clone.updateWorldMatrix(true, true);
    screenMesh.updateWorldMatrix(true, false);

    return new THREE.Matrix4()
      .copy(clone.matrixWorld)
      .invert()
      .multiply(screenMesh.matrixWorld);
  }, [clone]);

  const themeMaterials = useMemo(() => {
    return Object.fromEntries(
      Object.entries(MESH_SEMANTIC).flatMap(([semantic, meshName]) => {
        if (meshName === SCREEN_MESH) {
          return [];
        }

        const color = resolvedColors[semantic];
        if (!color) {
          return [];
        }

        const themedMaterial = createSimpleFinishMaterial(color, matteColors);

        return [[semantic, themedMaterial] as const];
      }),
    ) as Record<string, THREE.Material>;
  }, [matteColors, resolvedColors]);

  useEffect(() => {
    return () => {
      Object.values(themeMaterials).forEach((material) => material.dispose());
    };
  }, [themeMaterials]);

  const debugMaterials = useMemo(() => {
    if (!debugPartColors) return null;
    return Object.fromEntries(
      Object.entries(debugPartColors).map(([part, color]) => [
        part,
        new THREE.MeshBasicMaterial({ color }),
      ]),
    ) as Record<string, THREE.MeshBasicMaterial>;
  }, [debugPartColors]);

  useEffect(() => {
    if (!debugMaterials) return;
    return () => {
      Object.values(debugMaterials).forEach((material) => material.dispose());
    };
  }, [debugMaterials]);

  useEffect(() => {
    Object.entries(MESH_SEMANTIC).forEach(([semantic, meshName]) => {
      const mesh = clone.getObjectByName(meshName) as THREE.Mesh | undefined;
      if (!mesh) return;

      // A tela entalhada original é substituída pelo plano limpo.
      if (meshName === SCREEN_MESH) {
        return;
      }

      const debugMaterial = debugMaterials?.[semantic];
      if (debugMaterial) {
        mesh.material = debugMaterial;
        return;
      }

      const themedMaterial = themeMaterials[semantic];
      if (themedMaterial) {
        mesh.material = themedMaterial;
        return;
      }
    });
  }, [clone, debugMaterials, themeMaterials]);

  useEffect(() => {
    const frontGlassMesh = clone.getObjectByName(FRONT_GLASS_MESH) as
      | THREE.Mesh
      | undefined;
    if (frontGlassMesh) {
      frontGlassMesh.visible = false;
    }

    Object.values(MESH_SEMANTIC).forEach((meshName) => {
      const mesh = clone.getObjectByName(meshName) as THREE.Mesh | undefined;
      if (!mesh) return;

      // A tela entalhada original fica sempre oculta (substituída pelo plano limpo).
      if (meshName === SCREEN_MESH) {
        mesh.visible = false;
        return;
      }

      mesh.visible = showDeviceShell;
    });
  }, [clone, showDeviceShell]);

  return (
    <group {...props} dispose={null}>
      <group position={[1.5, 2.5, -1.0]} rotation={[0, 0, 0]} scale={1}>
        <primitive object={clone} />
        {cleanScreenGeometry && cleanScreenMatrix ? (
          <mesh
            geometry={cleanScreenGeometry}
            material={screenMaterial}
            matrix={cleanScreenMatrix}
            matrixAutoUpdate={false}
          />
        ) : null}
      </group>
    </group>
  );
}

export const Smartphone = React.memo(SmartphoneImpl);

useGLTF.preload("/models/apple_iphone_14_pro_orange.glb");
