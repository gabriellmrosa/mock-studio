"use client";

import * as THREE from "three";
import React, { JSX, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { GLTF } from "three-stdlib";

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

type GLTFResult = GLTF & {
  nodes: {
    o_Cube1: THREE.Mesh;
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
};

// Componente separado para a tela com textura.
// Precisa ser separado porque useTexture (hook) não pode ser chamado
// condicionalmente dentro do componente pai.
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
  // useTexture integra com o Suspense do R3F:
  // suspende a renderização até a textura estar 100% carregada,
  // eliminando o bug da tela branca no carregamento inicial.
  // O callback onLoad é a forma correta de configurar a textura sem violar
  // a restrição do Drei de não modificar valores retornados pelo hook.
  const texture = useTexture(imageUrl, (tex) => {
    const t = Array.isArray(tex) ? tex[0] : tex;
    t.colorSpace = THREE.SRGBColorSpace;
    // flipY = true (padrão) é o correto para ShapeGeometry
    t.flipY = true;
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

export function Smartphone({
  imageUrl,
  screenPosition = [-125, 315, -195],
  screenSize = [220, 469],
  screenRotation = [0, 0, 0],
  ...props
}: SmartphoneProps) {
  const { nodes, materials } = useGLTF(
    "/models/smartphone.glb",
  ) as unknown as GLTFResult;

  // Geometria com UVs normalizados corretamente para [0, 1]
  const screenGeometry = useMemo(() => {
    const shape = getRoundedRectangleShape(screenSize[0], screenSize[1], 25);
    const geo = new THREE.ShapeGeometry(shape);

    const pos = geo.attributes.position;
    const uvArray = new Float32Array(pos.count * 2);

    const halfW = screenSize[0] / 2;
    const halfH = screenSize[1] / 2;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // Invertemos o U (X) para compensar o rotation={[0, Math.PI, 0]} do modelo
      uvArray[i * 2] = 1 - (x + halfW) / screenSize[0]; // 1 → 0
      uvArray[i * 2 + 1] = (y + halfH) / screenSize[1]; // 0 → 1
    }

    geo.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
    return geo;
  }, [screenSize]);

  const hasImage = !!imageUrl && imageUrl !== "/placeholder.png";

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.o_Extrude2.geometry}
        material={materials["Mat.6"]}
      />
      <mesh geometry={nodes.o_Cap1.geometry} material={materials["default"]} />
      <mesh geometry={nodes.o_Cap2.geometry} material={materials["default"]} />
      <mesh geometry={nodes.o_Extrude.geometry} material={materials.Mat} />
      <mesh
        geometry={nodes.o_Cap1_1.geometry}
        material={materials["default"]}
      />
      <mesh
        geometry={nodes.o_Cap2_1.geometry}
        material={materials["default"]}
      />
      <mesh geometry={nodes.o_Extrude1.geometry} material={materials.Mat} />
      <mesh
        geometry={nodes.o_Cap1_2.geometry}
        material={materials["default"]}
      />
      <mesh
        geometry={nodes.o_Cap2_2.geometry}
        material={materials["default"]}
      />
      <mesh geometry={nodes.o_Cube.geometry} material={materials["default"]} />
      <mesh geometry={nodes.o_Boole1.geometry} material={materials["Mat.1"]} />
      <mesh geometry={nodes.o_Extrude4.geometry} material={materials.Mat} />
      <mesh
        geometry={nodes.o_Cap1_3.geometry}
        material={materials["default"]}
      />
      <mesh
        geometry={nodes.o_Cap2_3.geometry}
        material={materials["default"]}
      />
      <mesh geometry={nodes.o_Extrude3.geometry} material={materials.Mat} />
      <mesh
        geometry={nodes.o_Cap1_4.geometry}
        material={materials["default"]}
      />
      <mesh
        geometry={nodes.o_Cap2_4.geometry}
        material={materials["default"]}
      />
      <mesh geometry={nodes.o_Extrude2_1.geometry} material={materials.Mat} />
      <mesh
        geometry={nodes.o_Cap1_5.geometry}
        material={materials["default"]}
      />
      <mesh
        geometry={nodes.o_Cap2_5.geometry}
        material={materials["default"]}
      />
      <mesh geometry={nodes.o_Extrude1_1.geometry} material={materials.Mat} />
      <mesh
        geometry={nodes.o_Cap1_6.geometry}
        material={materials["default"]}
      />
      <mesh
        geometry={nodes.o_Cap2_6.geometry}
        material={materials["default"]}
      />
      <mesh
        geometry={nodes.o_Capsule1.geometry}
        material={materials["Mat.1"]}
      />

      {/* TELA */}
      <ScreenWithTexture
        imageUrl={hasImage ? imageUrl! : "/placeholder.png"}
        screenGeometry={screenGeometry}
        screenPosition={screenPosition}
        screenRotation={screenRotation}
      />

      <mesh geometry={nodes.o_Capsule.geometry} material={materials["Mat.1"]} />
      <mesh
        geometry={nodes.o_Extrude_1.geometry}
        material={materials["Mat.1"]}
      />
      <mesh
        geometry={nodes.o_Extrude_2.geometry}
        material={materials["Mat.1"]}
      />
    </group>
  );
}

useGLTF.preload("/models/smartphone.glb");
