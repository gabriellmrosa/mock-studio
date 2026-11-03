"use client";

import * as THREE from "three";
import React, { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { useScreenTexture } from "../lib/screen-texture";
import type { ScreenFit } from "../lib/scene-objects";
import { getPlaceholderImageUrl } from "../lib/scene-objects";
import {
  SMARTWATCH_DEFAULT_THEME,
  SMARTWATCH_THEMES,
  type SmartwatchColors,
} from "../lib/3d-tokens/smartwatch";

// ---------------------------------------------------------------------------
// Mapeamento semântico — partes visíveis identificadas via debug mode.
//
// Object_11 faz parte do corpo interno do relógio, não um screen mesh puro.
// A textura do app é aplicada em um plano separado, levemente à frente,
// para evitar vazamento na lateral e manter a casca íntegra.
// ---------------------------------------------------------------------------
export const MESH_SEMANTIC: Record<string, string> = {
  twoSideButtons: "Object_2",
  bandClasp:      "Object_3",
  oneSideButton:  "Object_4",
  body:           "Object_5",
  bandDetails:    "Object_6",
  bandBottom:     "Object_7",
  bandDetails2:   "Object_8",
  crownDetail:    "Object_9",
  bandTop:        "Object_10",
  bodyBackground: "Object_11",
};

export type SmartwatchDebugPartKey = keyof typeof MESH_SEMANTIC;

// ---------------------------------------------------------------------------
type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh>;
  materials: Record<string, THREE.Material>;
};

type SmartwatchProps = React.ComponentPropsWithoutRef<"group"> & {
  imageUrl?: string;
  /** Gravação de tela; quando presente, substitui a imagem. */
  videoUrl?: string | null;
  /** Identifica o objeto para o controlador de vídeo do canvas. */
  videoKey?: string;
  /** Zoom e posição do conteúdo na tela. */
  screenFit?: ScreenFit;
  colors?: Record<string, string>;
  debugPartColors?: Partial<Record<string, string>>;
  showDeviceShell?: boolean;
  showNotebookKeyboard?: boolean;
  showTabletBezel?: boolean;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
};

const SCREEN_RADIUS = 1.75;

/**
 * O material da caixa e da pulseira, em acabamento fosco: pouco brilho, quase
 * sem metal e reflexo. Existia uma variante brilhante, ligada à opção
 * "Acabamento fosco" — removida, porque nos outros aparelhos ela não mudava
 * nada; o relógio ficou com o fosco, que era o padrão.
 */
function cloneShellMaterial(
  template: THREE.Material | THREE.Material[] | undefined,
  color: string,
) {
  const base =
    (Array.isArray(template) ? template[0] : template)?.clone() ??
    new THREE.MeshPhysicalMaterial();

  if ("color" in base && base.color instanceof THREE.Color) {
    base.color.set(color);
  }

  base.transparent = false;
  base.opacity = 1;
  if ("roughness" in base && typeof base.roughness === "number") {
    base.roughness = Math.max(base.roughness, 0.78);
  }
  if ("metalness" in base && typeof base.metalness === "number") {
    base.metalness = Math.min(base.metalness, 0.06);
  }
  if ("clearcoat" in base && typeof base.clearcoat === "number") {
    base.clearcoat = Math.min(base.clearcoat, 0.04);
  }
  if ("clearcoatRoughness" in base && typeof base.clearcoatRoughness === "number") {
    base.clearcoatRoughness = Math.max(base.clearcoatRoughness, 0.7);
  }
  if ("reflectivity" in base && typeof base.reflectivity === "number") {
    base.reflectivity = Math.min(base.reflectivity, 0.04);
  }
  if ("envMapIntensity" in base && typeof base.envMapIntensity === "number") {
    base.envMapIntensity = Math.min(base.envMapIntensity, 0.18);
  }
  base.side = THREE.DoubleSide;
  return base;
}

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
function SmartwatchImpl({
  imageUrl,
  videoUrl,
  videoKey,
  screenFit,
  colors,
  debugPartColors,
  showDeviceShell = true,
  screenPosition = [0.02, 14.52, -0.1],
  screenSize = [6.87, 7.73],
  ...props
}: SmartwatchProps) {
  const { scene } = useGLTF("/models/smartwatch.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  useGraph(clone) as unknown as GLTFResult;
  const effectiveImageUrl = imageUrl ?? getPlaceholderImageUrl("smartwatch");
  const screenTexture = useScreenTexture(
    videoUrl
      ? { fit: screenFit, kind: "video", key: videoKey ?? videoUrl, url: videoUrl }
      : { fit: screenFit, kind: "image", url: effectiveImageUrl },
    { cropWidth: screenSize[0], cropHeight: screenSize[1], flipY: false },
  );

  const screenGeometry = useMemo(() => {
    const shape = getRoundedRectangleShape(
      screenSize[0],
      screenSize[1],
      SCREEN_RADIUS,
    );
    const geometry = new THREE.ShapeGeometry(shape);
    const position = geometry.attributes.position;
    const uvArray = new Float32Array(position.count * 2);
    const halfW = screenSize[0] / 2;
    const halfH = screenSize[1] / 2;

    for (let i = 0; i < position.count; i += 1) {
      uvArray[i * 2] = 1 - (position.getX(i) + halfW) / screenSize[0];
      uvArray[i * 2 + 1] = 1 - (position.getY(i) + halfH) / screenSize[1];
    }

    geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
    return geometry;
  }, [screenSize]);

  useEffect(() => () => screenGeometry.dispose(), [screenGeometry]);

  const screenMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({
      map: screenTexture,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
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

  const shellMaterialTemplate = useMemo(() => {
    const mesh = clone.getObjectByName("Object_11") as THREE.Mesh | undefined;
    return mesh?.material;
  }, [clone]);

  const c: SmartwatchColors = (colors as SmartwatchColors) ?? SMARTWATCH_THEMES[SMARTWATCH_DEFAULT_THEME];
  const partMaterials = useMemo(
    () => ({
      twoSideButtons: cloneShellMaterial(shellMaterialTemplate, c.twoSideButtons),
      bandClasp:      cloneShellMaterial(shellMaterialTemplate, c.bandClasp),
      oneSideButton:  cloneShellMaterial(shellMaterialTemplate, c.oneSideButton),
      body:           cloneShellMaterial(shellMaterialTemplate, c.body),
      bandDetails:    cloneShellMaterial(shellMaterialTemplate, c.bandDetails),
      bandBottom:     cloneShellMaterial(shellMaterialTemplate, c.bandBottom),
      bandDetails2:   cloneShellMaterial(shellMaterialTemplate, c.bandDetails2),
      crownDetail:    cloneShellMaterial(shellMaterialTemplate, c.crownDetail),
      bandTop:        cloneShellMaterial(shellMaterialTemplate, c.bandTop),
      bodyBackground: cloneShellMaterial(shellMaterialTemplate, c.bodyBackground),
    }),
    [c.twoSideButtons, c.bandClasp, c.oneSideButton, c.body,
     c.bandDetails, c.bandBottom, c.bandDetails2, c.crownDetail, c.bandTop,
     c.bodyBackground, shellMaterialTemplate],
  );
  useEffect(() => () => Object.values(partMaterials).forEach((m) => m.dispose()), [partMaterials]);

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

  // Aplica cores de tema e, se ativo, sobrepõe com cores de debug.
  useEffect(() => {
    Object.entries(MESH_SEMANTIC).forEach(([semantic, glbName]) => {
      const mesh = clone.getObjectByName(glbName) as THREE.Mesh | undefined;
      if (!mesh) return;

      const debugMaterial = debugMaterials?.[semantic];
      if (debugMaterial) {
        mesh.material = debugMaterial;
      } else {
        mesh.material = partMaterials[semantic as keyof typeof partMaterials];
      }
    });
  }, [clone, debugMaterials, partMaterials]);

  // showDeviceShell afeta só o casco. A tela em plano separado continua visível.
  useEffect(() => {
    Object.values(MESH_SEMANTIC).forEach((glbName) => {
      const mesh = clone.getObjectByName(glbName) as THREE.Mesh | undefined;
      if (mesh) mesh.visible = showDeviceShell;
    });
  }, [clone, showDeviceShell]);

  return (
    <group {...props} dispose={null}>
      <primitive object={clone} />
      <mesh
        geometry={screenGeometry}
        material={screenMaterial}
        position={screenPosition}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}

export const Smartwatch = React.memo(SmartwatchImpl);

useGLTF.preload("/models/smartwatch.glb");
