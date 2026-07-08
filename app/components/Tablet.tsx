"use client";

import * as THREE from "three";
import React, { JSX, useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import {
  buildScreenCanvas,
  MAX_TEXTURE_SIZE,
} from "../lib/mockup-image";
import { getPlaceholderImageUrl } from "../lib/scene-objects";
import { createSimpleFinishMaterial } from "../lib/simple-finish-material";
import {
  TABLET_DEFAULT_THEME,
  TABLET_THEMES,
  type TabletColors,
} from "../lib/3d-tokens/tablet";

// ===========================================================================
// Tablet — modelo 100% procedural (sem GLB).
//
// O corpo é um ExtrudeGeometry de um retângulo arredondado com bevel nas
// arestas; a moldura (bezel) e a tela são planos arredondados gerados na
// frente do corpo, reutilizando a mesma técnica de tela limpa dos smartphones.
// "Sem a casca" (showDeviceShell=false) esconde corpo+bezel e deixa só a tela.
// ===========================================================================

// Partes semânticas do tablet (não há meshes de GLB; os nomes são diretos).
export const TABLET_PARTS = {
  body: "body",
  bezel: "bezel",
  screen: "screen",
} as const;

export type TabletDebugPartKey = keyof typeof TABLET_PARTS;
export type { TabletColors };

// Proporção de recorte da textura da tela (upload recomendado 1668x2388 ÷ 4).
const SCREEN_CROP_W = 417;
const SCREEN_CROP_H = 597;

type TabletDimensions = {
  // Corpo (world units — mesma escala dos smartphones: altura ~500).
  width: number;
  height: number;
  depth: number;
  cornerRadius: number;
  // Raio do bevel das arestas do corpo (suaviza a lateral).
  edgeRadius: number;
  // Largura da moldura entre a borda do corpo e a tela.
  bezelWidth: number;
  // Raio dos cantos da tela.
  screenRadius: number;
};

// Dimensões calibradas no editor (debug leva removido).
const TABLET_DIMENSIONS: TabletDimensions = {
  width: 358,
  height: 500,
  depth: 14,
  cornerRadius: 32,
  edgeRadius: 3,
  bezelWidth: 14,
  screenRadius: 22,
};

type TabletProps = JSX.IntrinsicElements["group"] & {
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

// Plano arredondado com UVs normalizados (0..1) para receber a textura da tela.
function createRoundedPlaneGeometry(
  width: number,
  height: number,
  radius: number,
) {
  const geometry = new THREE.ShapeGeometry(
    getRoundedRectangleShape(width, height, radius),
    32,
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
  return geometry;
}

function TabletImpl({
  imageUrl,
  colors,
  matteColors = true,
  debugPartColors,
  showDeviceShell = true,
  showTabletBezel = true,
  screenPosition: _sp,
  screenSize: _ss,
  screenRotation: _sr,
  ...props
}: TabletProps) {
  void _sp;
  void _ss;
  void _sr;

  const dims = TABLET_DIMENSIONS;

  const effectiveImageUrl = imageUrl ?? getPlaceholderImageUrl("tablet");
  const sourceTexture = useTexture(effectiveImageUrl);
  const resolvedColors: TabletColors =
    (colors as TabletColors) ?? TABLET_THEMES[TABLET_DEFAULT_THEME];

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

  // Corpo: extrusão do retângulo arredondado com bevel nas duas faces,
  // centralizada em Z para o pivô ficar no centro do volume.
  const bodyGeometry = useMemo(() => {
    const { width, height, depth, cornerRadius, edgeRadius } = dims;
    const bevel = Math.min(edgeRadius, depth / 2 - 0.1);
    const innerDepth = Math.max(depth - 2 * bevel, 0.1);
    const shape = getRoundedRectangleShape(
      width - 2 * bevel,
      height - 2 * bevel,
      Math.max(cornerRadius - bevel, 1),
    );

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: innerDepth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 5,
      curveSegments: 32,
    });

    geometry.translate(0, 0, -innerDepth / 2);
    return geometry;
  }, [dims]);

  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);

  // Moldura (bezel): plano arredondado logo à frente da face frontal do corpo.
  const bezelGeometry = useMemo(() => {
    const { width, height, cornerRadius, edgeRadius } = dims;
    const inset = Math.max(edgeRadius, 1);
    return createRoundedPlaneGeometry(
      width - 2 * inset,
      height - 2 * inset,
      Math.max(cornerRadius - inset, 1),
    );
  }, [dims]);

  useEffect(() => () => bezelGeometry.dispose(), [bezelGeometry]);

  // Tela: plano arredondado dentro da moldura.
  const screenGeometry = useMemo(() => {
    const { width, height, bezelWidth, screenRadius } = dims;
    return createRoundedPlaneGeometry(
      width - 2 * bezelWidth,
      height - 2 * bezelWidth,
      screenRadius,
    );
  }, [dims]);

  useEffect(() => () => screenGeometry.dispose(), [screenGeometry]);

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

  const bodyMaterial = useMemo(
    () => createSimpleFinishMaterial(resolvedColors.body, matteColors),
    [resolvedColors.body, matteColors],
  );

  useEffect(() => () => bodyMaterial.dispose(), [bodyMaterial]);

  const bezelMaterial = useMemo(
    () => createSimpleFinishMaterial(resolvedColors.bezel, matteColors),
    [resolvedColors.bezel, matteColors],
  );

  useEffect(() => () => bezelMaterial.dispose(), [bezelMaterial]);

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

  const frontZ = dims.depth / 2;

  return (
    <group {...props} dispose={null}>
      {showDeviceShell ? (
        <>
          <mesh
            name="body"
            geometry={bodyGeometry}
            material={debugMaterials?.body ?? bodyMaterial}
          />
          {showTabletBezel ? (
            <mesh
              name="bezel"
              geometry={bezelGeometry}
              material={debugMaterials?.bezel ?? bezelMaterial}
              position={[0, 0, frontZ + 0.3]}
            />
          ) : null}
        </>
      ) : null}
      <mesh
        name="screen"
        geometry={screenGeometry}
        material={debugMaterials?.screen ?? screenMaterial}
        position={[0, 0, frontZ + 0.6]}
      />
    </group>
  );
}

export const Tablet = React.memo(TabletImpl);
