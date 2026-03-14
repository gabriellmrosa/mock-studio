"use client";

import * as THREE from "three";
import React, { JSX, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { GLTF } from "three-stdlib";

// ---------------------------------------------------------------------------
// Temas prontos
// ---------------------------------------------------------------------------
export type ThemeName = "metallic" | "black" | "white" | "gold" | "space-blue";

export interface PhoneColors {
  body: string;
  buttons: string;
}

export const THEMES: Record<ThemeName, PhoneColors> = {
  metallic: { body: "#8A8A8E", buttons: "#6D6D72" },
  black: { body: "#1C1C1E", buttons: "#2C2C2E" },
  white: { body: "#F5F5F7", buttons: "#D1D1D6" },
  gold: { body: "#C9A84C", buttons: "#A8893C" },
  "space-blue": { body: "#1B3A5C", buttons: "#142D47" },
};

export const DEFAULT_THEME: ThemeName = "metallic";

// ---------------------------------------------------------------------------
// Mapeamento semântico — usado pelo painel de debug
// chave semântica → nome original do nó no GLB
// ---------------------------------------------------------------------------
export const MESH_SEMANTIC: Record<string, string> = {
  corpoTraseiro: "o_Cube",
  aroFrontal: "o_Boole1",
  estruturaFrontal: "o_Extrude4",
  botaoPowerDireito: "o_Extrude2",
  botaoVolumeCima: "o_Cap1",
  botaoVolumeBaixo: "o_Cap2",
  botaoLateralDirCima: "o_Cap1_6",
  botaoLateralDirBaixo: "o_Capsule",
  notchBolinha1: "o_Cap1_1",
  notchBolinha2: "o_Extrude1",
  notchBolinha3: "o_Cap1_2",
  notchBolinha4: "o_Cap1_3",
  notchPill: "o_Extrude3",
  moduloCameraAro: "o_Extrude",
  moduloCameraBase: "o_Cap1_4",
  lente1: "o_Cap2_2",
  lente2: "o_Cap2_6",
  lente3: "o_Cap2_1",
  desconhecido1: "o_Cap2_3",
  desconhecido2: "o_Cap2_4",
  desconhecido3: "o_Cap2_5",
  desconhecido4: "o_Extrude2_1",
  desconhecido5: "o_Cap1_5",
  desconhecido6: "o_Extrude1_1",
  desconhecido7: "o_Capsule1",
  desconhecido8: "o_Extrude_1",
  desconhecido9: "o_Extrude_2",
};

// Inverso: nome GLB → chave semântica (para lookup rápido no mat())
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
  // quando presente, sobrescreve a cor de partes específicas (debug)
  debugPartColors?: Partial<Record<string, string>>;
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
  const texture = useTexture(imageUrl, (tex) => {
    const t = Array.isArray(tex) ? tex[0] : tex;
    const img = t.image as HTMLImageElement;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const targetRatio = 220 / 470;
    const imgRatio = imgW / imgH;
    let srcX = 0,
      srcY = 0,
      srcW = imgW,
      srcH = imgH;
    if (imgRatio > targetRatio) {
      srcW = imgH * targetRatio;
      srcX = (imgW - srcW) / 2;
    } else {
      srcH = imgW / targetRatio;
      srcY = (imgH - srcH) / 2;
    }
    const MAX = 2048;
    const scale = Math.min(1, MAX / Math.max(srcW, srcH));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(srcW * scale);
    canvas.height = Math.round(srcH * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    t.image = canvas;
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 16;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
  });

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
export function Smartphone({
  imageUrl,
  screenPosition = [-125, 315, -195],
  screenSize = [220, 470],
  screenRotation = [0, 0, 0],
  bodyColor = THEMES[DEFAULT_THEME].body,
  buttonsColor = THEMES[DEFAULT_THEME].buttons,
  debugPartColors,
  ...props
}: SmartphoneProps) {
  const { nodes, materials } = useGLTF(
    "/models/smartphone.glb",
  ) as unknown as GLTFResult;

  const screenGeometry = useMemo(() => {
    const shape = getRoundedRectangleShape(screenSize[0], screenSize[1], 25);
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
    () =>
      new THREE.MeshStandardMaterial({
        color: bodyColor,
        metalness: 0.6,
        roughness: 0.3,
      }),
    [bodyColor],
  );
  const buttonsMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: buttonsColor,
        metalness: 0.7,
        roughness: 0.25,
      }),
    [buttonsColor],
  );

  // Resolve material: debug tem prioridade, depois body/buttons/original
  type Category = "body" | "buttons" | "original";
  function mat(
    glbName: string,
    category: Category,
    originalMaterial: THREE.Material,
  ): THREE.Material {
    if (debugPartColors) {
      const semanticKey = GLB_TO_SEMANTIC[glbName];
      if (semanticKey && debugPartColors[semanticKey]) {
        return new THREE.MeshBasicMaterial({
          color: debugPartColors[semanticKey],
        });
      }
    }
    if (category === "body") return bodyMat;
    if (category === "buttons") return buttonsMat;
    return originalMaterial;
  }

  const effectiveImageUrl =
    imageUrl && imageUrl !== "/placeholder.png" ? imageUrl : "/placeholder.png";

  // ── JSX idêntico ao arquivo anterior que funcionava ──
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.o_Extrude2.geometry}
        material={mat("o_Extrude2", "buttons", materials["Mat.6"])}
      />
      <mesh
        geometry={nodes.o_Cap1.geometry}
        material={mat("o_Cap1", "buttons", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cap2.geometry}
        material={mat("o_Cap2", "buttons", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Extrude.geometry}
        material={mat("o_Extrude", "original", materials.Mat)}
      />
      <mesh
        geometry={nodes.o_Cap1_1.geometry}
        material={mat("o_Cap1_1", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cap2_1.geometry}
        material={mat("o_Cap2_1", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Extrude1.geometry}
        material={mat("o_Extrude1", "original", materials.Mat)}
      />
      <mesh
        geometry={nodes.o_Cap1_2.geometry}
        material={mat("o_Cap1_2", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cap2_2.geometry}
        material={mat("o_Cap2_2", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cube.geometry}
        material={mat("o_Cube", "body", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Boole1.geometry}
        material={mat("o_Boole1", "body", materials["Mat.1"])}
      />
      <mesh
        geometry={nodes.o_Extrude4.geometry}
        material={mat("o_Extrude4", "body", materials.Mat)}
      />
      <mesh
        geometry={nodes.o_Cap1_3.geometry}
        material={mat("o_Cap1_3", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cap2_3.geometry}
        material={mat("o_Cap2_3", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Extrude3.geometry}
        material={mat("o_Extrude3", "original", materials.Mat)}
      />
      <mesh
        geometry={nodes.o_Cap1_4.geometry}
        material={mat("o_Cap1_4", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cap2_4.geometry}
        material={mat("o_Cap2_4", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Extrude2_1.geometry}
        material={mat("o_Extrude2_1", "original", materials.Mat)}
      />
      <mesh
        geometry={nodes.o_Cap1_5.geometry}
        material={mat("o_Cap1_5", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cap2_5.geometry}
        material={mat("o_Cap2_5", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Extrude1_1.geometry}
        material={mat("o_Extrude1_1", "original", materials.Mat)}
      />
      <mesh
        geometry={nodes.o_Cap1_6.geometry}
        material={mat("o_Cap1_6", "buttons", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Cap2_6.geometry}
        material={mat("o_Cap2_6", "original", materials["default"])}
      />
      <mesh
        geometry={nodes.o_Capsule1.geometry}
        material={mat("o_Capsule1", "original", materials["Mat.1"])}
      />

      {/* ── Tela ── */}
      <ScreenWithTexture
        imageUrl={effectiveImageUrl}
        screenGeometry={screenGeometry}
        screenPosition={screenPosition}
        screenRotation={screenRotation}
      />

      <mesh
        geometry={nodes.o_Capsule.geometry}
        material={mat("o_Capsule", "buttons", materials["Mat.1"])}
      />
      <mesh
        geometry={nodes.o_Extrude_1.geometry}
        material={mat("o_Extrude_1", "original", materials["Mat.1"])}
      />
      <mesh
        geometry={nodes.o_Extrude_2.geometry}
        material={mat("o_Extrude_2", "original", materials["Mat.1"])}
      />
    </group>
  );
}

useGLTF.preload("/models/smartphone.glb");
