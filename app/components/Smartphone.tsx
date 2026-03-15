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

export type ThemeName = "gray" | "black" | "white";

export interface PhoneColors {
  body: string;
  buttons: string;
}

export const THEMES: Record<ThemeName, PhoneColors> = {
  gray: { body: "#8A8A8E", buttons: "#6D6D72" },
  black: { body: "#1C1C1E", buttons: "#2C2C2E" },
  white: { body: "#F5F5F7", buttons: "#D1D1D6" },
};

export const DEFAULT_THEME: ThemeName = "white";

// ---------------------------------------------------------------------------
// Mapeamento semântico
// ---------------------------------------------------------------------------
export const MESH_SEMANTIC: Record<string, string> = {
  // Elementos principais visíveis
  gradientSound: "o_Cube", // sempre preto
  smartphoneBody: "o_Boole1",
  estruturaFrontal: "o_Extrude4",
  botaoPowerDireito: "o_Extrude2",
  botaoVolumeCima: "o_Cap1",
  botaoVolumeBaixo: "o_Cap2",
  CircleTopLeft: "o_Cap1_6", // sempre preto
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

  // Elementos traseiros/ocultos — serão travados futuramente
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
type Category = "body" | "buttons" | "circle" | "original" | "alwaysBlack";

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type SmartphoneProps = JSX.IntrinsicElements["group"] & {
  imageUrl?: string;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
  screenRotation?: [number, number, number];
  bodyColor?: string;
  buttonsColor?: string;
  debugPartColors?: Partial<Record<string, string>>;
  showDeviceShell?: boolean;
};

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
      img instanceof HTMLImageElement ? img.naturalWidth || img.width : img.width;
    const imgH =
      img instanceof HTMLImageElement ? img.naturalHeight || img.height : img.height;
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
// Material preto fixo (independente de tema)
// ---------------------------------------------------------------------------
const FIXED_BLACK = new THREE.MeshLambertMaterial({
  color: "#000000",
});

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
function SmartphoneImpl({
  imageUrl,
  screenPosition = [-125, 315, -195],
  screenSize = [220, 470],
  screenRotation = [0, 0, 0],
  bodyColor = THEMES[DEFAULT_THEME].body,
  buttonsColor = THEMES[DEFAULT_THEME].buttons,
  debugPartColors,
  showDeviceShell = true,
  ...props
}: SmartphoneProps) {
  const { nodes, materials } = useGLTF(
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

  const bodyMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: bodyColor }),
    [bodyColor],
  );
  const buttonsMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: buttonsColor }),
    [buttonsColor],
  );
  const circleMat = useMemo(() => {
    const color = new THREE.Color(bodyColor);
    color.lerp(new THREE.Color("#ffffff"), 0.25); // 25% mais claro
    return new THREE.MeshLambertMaterial({ color });
  }, [bodyColor]);
  const debugMaterials = useMemo(() => {
    if (!debugPartColors) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(debugPartColors).map(([part, color]) => [
        part,
        new THREE.MeshBasicMaterial({ color }),
      ]),
    );
  }, [debugPartColors]);

  useEffect(() => {
    if (!debugMaterials) {
      return;
    }

    return () => {
      Object.values(debugMaterials).forEach((material) => material.dispose());
    };
  }, [debugMaterials]);

  function mat(
    glbName: string,
    category: Category,
    originalMaterial: THREE.Material,
  ): THREE.Material {
    const semanticKey = GLB_TO_SEMANTIC[glbName];

    if (debugMaterials && semanticKey && debugMaterials[semanticKey]) {
      return debugMaterials[semanticKey];
    }

    // Sempre preto, ignora tema
    if (category === "alwaysBlack") {
      return FIXED_BLACK;
    }
    if (category === "circle") return circleMat;

    if (category === "body") return bodyMat;
    if (category === "buttons") return buttonsMat;
    return originalMaterial;
  }

  const effectiveImageUrl =
    imageUrl && imageUrl !== "/placeholder.png" ? imageUrl : "/placeholder.png";

  return (
    <group {...props} dispose={null}>
      {showDeviceShell ? (
        <>
          <mesh
            name="botaoPowerDireito"
            geometry={nodes.o_Extrude2.geometry}
            material={mat("o_Extrude2", "buttons", materials["Mat.6"])}
          />
          <mesh
            name="botaoVolumeCima"
            geometry={nodes.o_Cap1.geometry}
            material={mat("o_Cap1", "buttons", materials["default"])}
          />
          <mesh
            name="botaoVolumeBaixo"
            geometry={nodes.o_Cap2.geometry}
            material={mat("o_Cap2", "buttons", materials["default"])}
          />

          <mesh
            name="moduloCameraAro"
            geometry={nodes.o_Extrude.geometry}
            material={mat("o_Extrude", "original", materials.Mat)}
          />
          <mesh
            name="notchBolinha1"
            geometry={nodes.o_Cap1_1.geometry}
            material={mat("o_Cap1_1", "original", materials["default"])}
          />
          <mesh
            name="lente3"
            geometry={nodes.o_Cap2_1.geometry}
            material={mat("o_Cap2_1", "original", materials["default"])}
          />
          <mesh
            name="notchBolinha2"
            geometry={nodes.o_Extrude1.geometry}
            material={mat("o_Extrude1", "original", materials.Mat)}
          />
          <mesh
            name="notchBolinha3"
            geometry={nodes.o_Cap1_2.geometry}
            material={mat("o_Cap1_2", "original", materials["default"])}
          />
          <mesh
            name="lente1"
            geometry={nodes.o_Cap2_2.geometry}
            material={mat("o_Cap2_2", "original", materials["default"])}
          />

          <mesh
            name="gradientSound"
            geometry={nodes.o_Cube.geometry}
            material={mat("o_Cube", "alwaysBlack", materials["default"])}
          />
          <mesh
            name="smartphoneBody"
            geometry={nodes.o_Boole1.geometry}
            material={mat("o_Boole1", "body", materials["Mat.1"])}
          />
          <mesh
            name="estruturaFrontal"
            geometry={nodes.o_Extrude4.geometry}
            material={mat("o_Extrude4", "body", materials.Mat)}
          />

          <mesh
            name="behindOrHideElement1"
            geometry={nodes.o_Cap2_3.geometry}
            material={mat("o_Cap2_3", "original", materials["default"])}
          />
          <mesh
            name="notchPill"
            geometry={nodes.o_Extrude3.geometry}
            material={mat("o_Extrude3", "original", materials.Mat)}
          />

          <mesh
            name="CircleTopLeft"
            geometry={nodes.o_Cap1_6.geometry}
            material={mat("o_Cap1_6", "circle", materials["default"])}
          />
          <mesh
            name="CircleTopLeftMiddle"
            geometry={nodes.o_Cap1_5.geometry}
            material={mat("o_Cap1_5", "circle", materials["default"])}
          />
          <mesh
            name="CircleTopRight"
            geometry={nodes.o_Cap1_4.geometry}
            material={mat("o_Cap1_4", "circle", materials["default"])}
          />
          <mesh
            name="CircleTopRightMiddle"
            geometry={nodes.o_Cap1_3.geometry}
            material={mat("o_Cap1_3", "circle", materials["default"])}
          />
          <mesh
            name="behindOrHideElement2"
            geometry={nodes.o_Cap2_4.geometry}
            material={mat("o_Cap2_4", "original", materials["default"])}
          />

          <mesh
            name="behindOrHideElement3"
            geometry={nodes.o_Extrude2_1.geometry}
            material={mat("o_Extrude2_1", "original", materials.Mat)}
          />

          <mesh
            name="behindOrHideElement4"
            geometry={nodes.o_Cap2_5.geometry}
            material={mat("o_Cap2_5", "original", materials["default"])}
          />
          <mesh
            name="behindOrHideElement5"
            geometry={nodes.o_Extrude1_1.geometry}
            material={mat("o_Extrude1_1", "original", materials.Mat)}
          />

          <mesh
            name="lente2"
            geometry={nodes.o_Cap2_6.geometry}
            material={mat("o_Cap2_6", "original", materials["default"])}
          />
          <mesh
            name="leftSmallSideButton"
            geometry={nodes.o_Capsule1.geometry}
            material={mat("o_Capsule1", "body", materials["Mat.1"])}
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
            material={mat("o_Capsule", "body", materials["Mat.1"])}
          />

          <mesh
            name="behindOrHideElement6"
            geometry={nodes.o_Extrude_1.geometry}
            material={mat("o_Extrude_1", "original", materials["Mat.1"])}
          />
          <mesh
            name="behindOrHideElement7"
            geometry={nodes.o_Extrude_2.geometry}
            material={mat("o_Extrude_2", "original", materials["Mat.1"])}
          />
        </>
      ) : null}
    </group>
  );
}

export const Smartphone = React.memo(SmartphoneImpl);

useGLTF.preload("/models/smartphone.glb");
