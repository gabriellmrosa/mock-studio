"use client";

import * as THREE from "three";
import React, { JSX, useEffect, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import {
  buildScreenCanvas,
  MAX_TEXTURE_SIZE,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "../lib/mockup-image";
import { getPlaceholderImageUrl } from "../lib/scene-objects";
import { createSimpleFinishMaterial } from "../lib/simple-finish-material";
import {
  SMARTPHONE_DEFAULT_THEME,
  SMARTPHONE_THEMES,
  type SmartphoneColors,
  type SmartphoneThemeName,
} from "../lib/3d-tokens/smartphone";

// Re-exports para compatibilidade com importações existentes
export type ThemeName = SmartphoneThemeName;
export type PhoneColors = SmartphoneColors;
export const THEMES = SMARTPHONE_THEMES;
export const DEFAULT_THEME = SMARTPHONE_DEFAULT_THEME;

// ---------------------------------------------------------------------------
// Mapeamento semântico (nome legível → nome do nó no GLB)
// ---------------------------------------------------------------------------
export const MESH_SEMANTIC: Record<string, string> = {
  // Elementos principais visíveis
  gradientSound: "o_Cube", // sempre preto
  smartphoneBody: "o_Boole1",
  estruturaFrontal: "o_Extrude4",
  CircleTopLeft: "o_Cap1_6",
  rightBigSideButton: "o_Capsule",
  notchBolinha1: "o_Cap1_1",
  notchBolinha2: "o_Extrude1",
  notchBolinha3: "o_Cap1_2",
  CircleTopRightMiddle: "o_Cap1_3",
  notchPill: "o_Extrude3",
  moduloCameraAro: "o_Extrude",
  CircleTopRight: "o_Cap1_4",
  lente1: "o_Cap2_2",
  lente2: "o_Cap2_6",
  lente3: "o_Cap2_1",
  CircleTopLeftMiddle: "o_Cap1_5",
  leftSmallSideButton: "o_Capsule1",

  // Elementos traseiros/ocultos
  behindOrHideElement1: "o_Cap2_3",
  behindOrHideElement2: "o_Cap2_4",
  behindOrHideElement3: "o_Cap2_5",
  behindOrHideElement4: "o_Extrude2_1",
  behindOrHideElement5: "o_Extrude1_1",
  behindOrHideElement6: "o_Extrude_1",
  behindOrHideElement7: "o_Extrude_2",
};

const GLB_TO_SEMANTIC: Record<string, string> = Object.fromEntries(
  Object.entries(MESH_SEMANTIC).map(([sem, glb]) => [glb, sem]),
);

export type DebugPartKey = keyof typeof MESH_SEMANTIC;

// ---------------------------------------------------------------------------
// Helpers de geometria
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Tipos GLTF
// ---------------------------------------------------------------------------
type GLTFResult = GLTF & {
  nodes: {
    o_Extrude2: THREE.Mesh;
    o_Cap1: THREE.Mesh;
    o_Cap2: THREE.Mesh;
    o_Extrude: THREE.Mesh;
    o_Cap1_1: THREE.Mesh;
    o_Cap2_1: THREE.Mesh;
    o_Extrude1: THREE.Mesh;
    o_Cap1_2: THREE.Mesh;
    o_Cap2_2: THREE.Mesh;
    o_Cube: THREE.Mesh;
    o_Boole1: THREE.Mesh;
    o_Extrude4: THREE.Mesh;
    o_Cap1_3: THREE.Mesh;
    o_Cap2_3: THREE.Mesh;
    o_Extrude3: THREE.Mesh;
    o_Cap1_4: THREE.Mesh;
    o_Cap2_4: THREE.Mesh;
    o_Extrude2_1: THREE.Mesh;
    o_Cap1_5: THREE.Mesh;
    o_Cap2_5: THREE.Mesh;
    o_Extrude1_1: THREE.Mesh;
    o_Cap1_6: THREE.Mesh;
    o_Cap2_6: THREE.Mesh;
    o_Capsule1: THREE.Mesh;
    o_Capsule: THREE.Mesh;
    o_Extrude_1: THREE.Mesh;
    o_Extrude_2: THREE.Mesh;
  };
  materials: {
    ["Mat.6"]: THREE.MeshStandardMaterial;
    ["default"]: THREE.MeshStandardMaterial;
    Mat: THREE.MeshStandardMaterial;
    ["Mat.1"]: THREE.MeshStandardMaterial;
    ["Mat.2"]: THREE.MeshStandardMaterial;
  };
};

type SmartphoneProps = JSX.IntrinsicElements["group"] & {
  imageUrl?: string;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
  screenRotation?: [number, number, number];
  colors?: Record<string, string>;
  matteColors?: boolean;
  debugPartColors?: Partial<Record<string, string>>;
  showDeviceShell?: boolean;
  showNotebookKeyboard?: boolean;
};

function createFlatColorMaterial(color: string) {
  return new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

function createAccentMaterial(color: string, matte: boolean) {
  if (matte) {
    return createFlatColorMaterial(color);
  }

  return new THREE.MeshPhongMaterial({
    color,
    shininess: 24,
    specular: new THREE.Color("#2a2a2a"),
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
}

// ---------------------------------------------------------------------------
// Tela com textura
// ---------------------------------------------------------------------------
function ScreenWithTexture({
  imageUrl,
  screenGeometry,
  screenPosition,
  screenRotation,
}: {
  imageUrl: string;
  screenGeometry: THREE.ShapeGeometry;
  screenPosition: [number, number, number];
  screenRotation: [number, number, number];
}) {
  const sourceTexture = useTexture(imageUrl);

  const texture = useMemo(() => {
    const img = sourceTexture.image as
      | HTMLImageElement
      | HTMLCanvasElement
      | undefined;

    if (!img) {
      return sourceTexture;
    }

    const imgW =
      img instanceof HTMLImageElement
        ? img.naturalWidth || img.width
        : img.width;
    const imgH =
      img instanceof HTMLImageElement
        ? img.naturalHeight || img.height
        : img.height;
    const canvas = buildScreenCanvas(
      img,
      imgW,
      imgH,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
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
    if (texture !== sourceTexture) {
      return () => texture.dispose();
    }
  }, [sourceTexture, texture]);

  return (
    <mesh
      geometry={screenGeometry}
      position={screenPosition}
      rotation={screenRotation}
    >
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
function SmartphoneImpl({
  imageUrl,
  screenPosition = [-125, 315, -195],
  screenSize = [220, 470],
  screenRotation = [0, 0, 0],
  colors,
  matteColors = true,
  debugPartColors,
  showDeviceShell = true,
  ...props
}: SmartphoneProps) {
  const { nodes, materials: gltfMats } = useGLTF(
    "/models/smartphone.glb",
  ) as unknown as GLTFResult;

  const screenGeometry = useMemo(() => {
    const shape = getRoundedRectangleShape(screenSize[0], screenSize[1], 28);
    const geo = new THREE.ShapeGeometry(shape);
    const pos = geo.attributes.position;
    const uvArray = new Float32Array(pos.count * 2);
    const halfW = screenSize[0] / 2;
    const halfH = screenSize[1] / 2;
    for (let i = 0; i < pos.count; i++) {
      uvArray[i * 2] = 1 - (pos.getX(i) + halfW) / screenSize[0];
      uvArray[i * 2 + 1] = (pos.getY(i) + halfH) / screenSize[1];
    }
    geo.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
    return geo;
  }, [screenSize]);

  // Materiais para os elementos visíveis — um por parte, cor explícita do token
  const c = colors ?? SMARTPHONE_THEMES[SMARTPHONE_DEFAULT_THEME];
  const partMaterials = useMemo(
    () => ({
      gradientSound:       createAccentMaterial(c.gradientSound, matteColors),
      smartphoneBody:      createSimpleFinishMaterial(c.smartphoneBody, matteColors),
      rightBigSideButton:  createAccentMaterial(c.rightBigSideButton, matteColors),
      leftSmallSideButton: createAccentMaterial(c.leftSmallSideButton, matteColors),
      CircleTopLeft:       createAccentMaterial(c.CircleTopLeft, matteColors),
      CircleTopLeftMiddle: createAccentMaterial(c.CircleTopLeftMiddle, matteColors),
      CircleTopRight:      createAccentMaterial(c.CircleTopRight, matteColors),
      CircleTopRightMiddle:createAccentMaterial(c.CircleTopRightMiddle, matteColors),
    }),
    [c.gradientSound, c.smartphoneBody, c.rightBigSideButton, c.leftSmallSideButton,
     c.CircleTopLeft, c.CircleTopLeftMiddle, c.CircleTopRight, c.CircleTopRightMiddle, matteColors],
  );

  useEffect(() => {
    return () => Object.values(partMaterials).forEach((m) => m.dispose());
  }, [partMaterials]);

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
    return () => Object.values(debugMaterials).forEach((m) => m.dispose());
  }, [debugMaterials]);

  // Retorna o material de debug se existir, caso contrário o material de tema
  function vis(partName: keyof typeof partMaterials): THREE.Material {
    return debugMaterials?.[partName] ?? partMaterials[partName];
  }

  function visAlias(
    debugPartName: string,
    themedPartName: keyof typeof partMaterials,
  ): THREE.Material {
    return debugMaterials?.[debugPartName] ?? partMaterials[themedPartName];
  }

  // Retorna o material de debug para partes não-temáticas (originais do GLTF ou preto fixo)
  function orig(glbName: string, fallback: THREE.Material): THREE.Material {
    const semanticKey = GLB_TO_SEMANTIC[glbName];
    return (debugMaterials && semanticKey && debugMaterials[semanticKey])
      ? debugMaterials[semanticKey]
      : fallback;
  }

  const placeholderImageUrl = getPlaceholderImageUrl("smartphone");
  const effectiveImageUrl =
    imageUrl && imageUrl !== placeholderImageUrl
      ? imageUrl
      : placeholderImageUrl;

  return (
    <group {...props} dispose={null}>
      {showDeviceShell ? (
        <>
          <mesh
            name="moduloCameraAro"
            geometry={nodes.o_Extrude.geometry}
            material={visAlias("moduloCameraAro", "CircleTopLeft")}
          />
          <mesh
            name="notchBolinha1"
            geometry={nodes.o_Cap1_1.geometry}
            material={visAlias("notchBolinha1", "CircleTopLeftMiddle")}
          />
          <mesh
            name="lente3"
            geometry={nodes.o_Cap2_1.geometry}
            material={orig("o_Cap2_1", gltfMats["default"])}
          />
          <mesh
            name="notchBolinha2"
            geometry={nodes.o_Extrude1.geometry}
            material={visAlias("notchBolinha2", "CircleTopRight")}
          />
          <mesh
            name="notchBolinha3"
            geometry={nodes.o_Cap1_2.geometry}
            material={visAlias("notchBolinha3", "CircleTopRightMiddle")}
          />
          <mesh
            name="lente1"
            geometry={nodes.o_Cap2_2.geometry}
            material={orig("o_Cap2_2", gltfMats["default"])}
          />

          <mesh
            name="gradientSound"
            geometry={nodes.o_Cube.geometry}
            material={vis("gradientSound")}
          />
          <mesh
            name="smartphoneBody"
            geometry={nodes.o_Boole1.geometry}
            material={vis("smartphoneBody")}
          />
          <mesh
            name="estruturaFrontal"
            geometry={nodes.o_Extrude4.geometry}
            material={visAlias("estruturaFrontal", "smartphoneBody")}
          />

          <mesh
            name="behindOrHideElement1"
            geometry={nodes.o_Cap2_3.geometry}
            material={orig("o_Cap2_3", gltfMats["default"])}
          />
          <mesh
            name="notchPill"
            geometry={nodes.o_Extrude3.geometry}
            material={visAlias("notchPill", "gradientSound")}
          />

          <mesh
            name="CircleTopLeft"
            geometry={nodes.o_Cap1_6.geometry}
            material={vis("CircleTopLeft")}
          />
          <mesh
            name="CircleTopLeftMiddle"
            geometry={nodes.o_Cap1_5.geometry}
            material={vis("CircleTopLeftMiddle")}
          />
          <mesh
            name="CircleTopRight"
            geometry={nodes.o_Cap1_4.geometry}
            material={vis("CircleTopRight")}
          />
          <mesh
            name="CircleTopRightMiddle"
            geometry={nodes.o_Cap1_3.geometry}
            material={vis("CircleTopRightMiddle")}
          />
          <mesh
            name="behindOrHideElement2"
            geometry={nodes.o_Cap2_4.geometry}
            material={orig("o_Cap2_4", gltfMats["default"])}
          />

          <mesh
            name="behindOrHideElement3"
            geometry={nodes.o_Extrude2_1.geometry}
            material={orig("o_Extrude2_1", gltfMats.Mat)}
          />

          <mesh
            name="behindOrHideElement4"
            geometry={nodes.o_Cap2_5.geometry}
            material={orig("o_Cap2_5", gltfMats["default"])}
          />
          <mesh
            name="behindOrHideElement5"
            geometry={nodes.o_Extrude1_1.geometry}
            material={orig("o_Extrude1_1", gltfMats.Mat)}
          />

          <mesh
            name="lente2"
            geometry={nodes.o_Cap2_6.geometry}
            material={orig("o_Cap2_6", gltfMats["default"])}
          />
          <mesh
            name="leftSmallSideButton"
            geometry={nodes.o_Capsule1.geometry}
            material={vis("leftSmallSideButton")}
          />
        </>
      ) : null}

      <ScreenWithTexture
        imageUrl={effectiveImageUrl}
        screenGeometry={screenGeometry}
        screenPosition={screenPosition}
        screenRotation={screenRotation}
      />

      {showDeviceShell ? (
        <>
          <mesh
            name="rightBigSideButton"
            geometry={nodes.o_Capsule.geometry}
            material={vis("rightBigSideButton")}
          />

          <mesh
            name="behindOrHideElement6"
            geometry={nodes.o_Extrude_1.geometry}
            material={orig("o_Extrude_1", gltfMats["Mat.1"])}
          />
          <mesh
            name="behindOrHideElement7"
            geometry={nodes.o_Extrude_2.geometry}
            material={orig("o_Extrude_2", gltfMats["Mat.1"])}
          />
        </>
      ) : null}
    </group>
  );
}

export const Smartphone = React.memo(SmartphoneImpl);

useGLTF.preload("/models/smartphone.glb");
