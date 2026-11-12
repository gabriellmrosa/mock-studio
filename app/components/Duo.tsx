"use client";

import * as THREE from "three";
import React, { JSX, useEffect, useLayoutEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { useScreenTexture } from "../lib/screen-texture";
import {
  DUO_OUTER_SCREEN_SIZE,
  getDuoOuterPlaceholderImageUrl,
  getPlaceholderImageUrl,
  type ScreenFit,
} from "../lib/scene-objects";
import { DEFAULT_FOLD_ANGLE } from "../lib/scene-presets";
import { getDuoFoldPose } from "../lib/duo-fold";
import {
  DUO_DEFAULT_THEME,
  DUO_THEMES,
  type DuoColors,
} from "../lib/3d-tokens/duo";

// ===========================================================================
// Duo — dobrável tipo livro, a partir do GLB "iPhone Duo 3D Model", de
// PikkmeStudios (CC BY 4.0), preparado por scripts/extract-iphone-duo.mjs.
//
// O GLB traz o aparelho aberto, com três nós que fazem a dobra:
//   duo-fold ─┬─ duo-base   metade das câmeras (à direita, de frente)
//             ├─ duo-hinge  a lombada
//             └─ duo-cover  metade com a tela de fora nas costas (à esquerda)
//
// No arquivo original as duas metades fecham por igual em torno da lombada.
// Aqui o `duo-fold` gira o conjunto de volta na mesma medida, e o efeito é a
// base parada e a capa fechando por cima dela: fechado, é a tela de fora que
// fica virada para quem olha, em vez de o aparelho ficar de lado.
//
// As telas são nossas, como nos outros modelos: planos por cima do casco, com
// a textura do compositor. A tela de dentro do arquivo era uma malha com
// ossos, que dobrava em curva; aqui são duas metades planas, uma em cada
// metade do aparelho, dividindo a mesma imagem — o vinco fica uma linha.
//
// Dentro dos nós do GLB valem os eixos do arquivo: X é a espessura (a tela de
// dentro olha para -X), Y a largura e Z a altura, com o topo em -Z.
// ===========================================================================

const MODEL_URL = "/models/iphone-duo.glb";

/** Material do GLB → parte de cor do tema. O resto (pretos, lentes) é fixo. */
const MATERIAL_PARTS: Record<string, keyof DuoColors> = {
  "apple-material": "body",
  "apple-material-sides": "frame",
  "apple-material-sides-lighter": "frameHighlight",
  "apple-material-sides-darker": "logo",
};

export const DUO_PARTS = {
  body: "body",
  frame: "frame",
  frameHighlight: "frameHighlight",
  logo: "logo",
} as const;

export type DuoDebugPartKey = keyof typeof DUO_PARTS;
export type { DuoColors };

// Medidas em unidades do GLB (1 ≈ 212 mm), tiradas das malhas do arquivo.
const HALF_WIDTH = 0.39;
/** O eixo da dobra fica na face da tela, meia espessura à frente do centro. */
export const DUO_HINGE_Z = 0.012;
/** Os nós das metades ficam no topo do aparelho; o centro é meia altura abaixo. */
const CENTER_Z = -0.273;
const THICKNESS = 0.024;
/** Folga entre camadas sobrepostas, contra z-fighting (~0,1 mm). */
const LAYER = 0.0005;

const INNER = {
  // Metade da tela de dentro, a partir da dobradiça, e a moldura preta dela.
  width: 0.373,
  height: 0.524,
  radius: 0.04,
  bezelWidth: 0.385,
  bezelHeight: 0.546,
  bezelRadius: 0.05,
  /** As metades giram a 0,002 da dobradiça; o centro em Y conta com isso. */
  hingeOffset: 0.002,
  /**
   * Quanto cada metade passa do meio. Encostadas no meio exato, sobrava um
   * fio entre as duas por onde o casco claro aparecia, riscando a imagem;
   * com a sobra, o que aparece ali é a continuação da própria imagem.
   */
  overlap: 0.0015,
};

const OUTER = {
  width: 0.366,
  height: 0.532,
  radius: 0.044,
  hingeRadius: 0.006,
  centerY: -0.192,
  // Câmera frontal: o furo no canto de cima, do lado de fora.
  holeRadius: 0.013,
  holeInset: 0.042,
};

const FOLD_NODE = "duo-fold";
const BASE_NODE = "duo-base";
const COVER_NODE = "duo-cover";
const CENTER_GROUP = "duo-center";

/**
 * Escreve a abertura direto nos nós do modelo, sem passar pelo React: é o que
 * o preview e a exportação de vídeo fazem a cada quadro (o mesmo caminho da
 * posição e da opacidade). `root` é qualquer grupo que contenha o modelo.
 */
export function applyDuoFoldAngle(root: THREE.Object3D, foldAngle: number) {
  const pose = getDuoFoldPose(foldAngle, HALF_WIDTH, DUO_HINGE_Z);
  // Cada metade fecha metade do caminho; o conjunto desfaz o giro da base.
  const half = pose.coverRotation / 2;

  root.getObjectByName(FOLD_NODE)?.rotation.set(0, 0, -half);
  root.getObjectByName(BASE_NODE)?.rotation.set(0, 0, Math.PI + half);
  root.getObjectByName(COVER_NODE)?.rotation.set(0, 0, -half);
  root.getObjectByName(CENTER_GROUP)?.position.set(pose.shiftX, 0, pose.shiftZ);
}

type CornerRadii = [
  topLeft: number,
  topRight: number,
  bottomRight: number,
  bottomLeft: number,
];

/** Retângulo centrado na origem, com um raio por canto (0 = canto vivo). */
function getRoundedShape(width: number, height: number, radii: CornerRadii) {
  const [tl, tr, br, bl] = radii;
  const x = width / 2;
  const y = height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(-x, y - tl);
  shape.lineTo(-x, bl - y);
  shape.quadraticCurveTo(-x, -y, bl - x, -y);
  shape.lineTo(x - br, -y);
  shape.quadraticCurveTo(x, -y, x, br - y);
  shape.lineTo(x, y - tr);
  shape.quadraticCurveTo(x, y, x - tr, y);
  shape.lineTo(tl - x, y);
  shape.quadraticCurveTo(-x, y, -x, y - tl);

  return shape;
}

/**
 * Plano com UVs normalizadas para a textura da tela. `u0`/`u1` escolhem a
 * fatia horizontal da imagem: cada metade da tela de dentro mostra a sua.
 */
function createScreenGeometry(
  width: number,
  height: number,
  radii: CornerRadii,
  u0 = 0,
  u1 = 1,
) {
  const geometry = new THREE.ShapeGeometry(
    getRoundedShape(width, height, radii),
    32,
  );
  const position = geometry.getAttribute("position");
  const uv = new Float32Array(position.count * 2);

  for (let i = 0; i < position.count; i += 1) {
    const across = (position.getX(i) + width / 2) / width;

    uv[i * 2] = u0 + (u1 - u0) * across;
    uv[i * 2 + 1] = (position.getY(i) + height / 2) / height;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

  return geometry;
}

/**
 * As geometrias não dependem de nada do objeto (as medidas são do arquivo),
 * então são criadas uma vez e divididas entre todos os Duos da cena.
 */
function createGeometries() {
  // Cantos arredondados só do lado de fora; na dobradiça, canto vivo. A capa
  // fica à esquerda de quem olha a tela de dentro, a base à direita.
  const coverSide = (radius: number): CornerRadii => [radius, 0, 0, radius];
  const baseSide = (radius: number): CornerRadii => [0, radius, radius, 0];

  const bezelWidth = INNER.bezelWidth + INNER.overlap;
  const screenWidth = INNER.width + INNER.overlap;
  // A sobra mostra o trecho seguinte da imagem, não uma repetição da borda.
  const overlapU = (INNER.overlap / INNER.width) * 0.5;

  return {
    coverBezel: new THREE.ShapeGeometry(
      getRoundedShape(bezelWidth, INNER.bezelHeight, coverSide(INNER.bezelRadius)),
      32,
    ),
    baseBezel: new THREE.ShapeGeometry(
      getRoundedShape(bezelWidth, INNER.bezelHeight, baseSide(INNER.bezelRadius)),
      32,
    ),
    // Metade esquerda da imagem na capa, direita na base.
    coverScreen: createScreenGeometry(
      screenWidth,
      INNER.height,
      coverSide(INNER.radius),
      0,
      0.5 + overlapU,
    ),
    baseScreen: createScreenGeometry(
      screenWidth,
      INNER.height,
      baseSide(INNER.radius),
      0.5 - overlapU,
      1,
    ),
    // Vista por trás, o lado de fora da capa fica à direita.
    outerScreen: createScreenGeometry(OUTER.width, OUTER.height, [
      OUTER.hingeRadius,
      OUTER.radius,
      OUTER.radius,
      OUTER.hingeRadius,
    ]),
    hole: new THREE.CircleGeometry(OUTER.holeRadius, 32),
  };
}

let sharedGeometries: ReturnType<typeof createGeometries> | null = null;

function getGeometries() {
  sharedGeometries ??= createGeometries();

  return sharedGeometries;
}

/** Um plano nosso dentro de um nó do GLB: eixos do plano → eixos do nó. */
function placePlane(
  mesh: THREE.Mesh,
  right: THREE.Vector3,
  up: THREE.Vector3,
  position: THREE.Vector3,
) {
  const normal = new THREE.Vector3().crossVectors(right, up);

  mesh.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, normal),
  );
  mesh.position.copy(position);
}

const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Y_NEG = new THREE.Vector3(0, -1, 0);
/** "Para cima" na tela é -Z nos nós do GLB. */
const AXIS_UP = new THREE.Vector3(0, 0, -1);

/**
 * As peças que o componente acrescenta ao modelo: molduras e telas de dentro
 * e a tela de fora com o furo da câmera. Uma lista por clone do GLB.
 */
function createOverlay() {
  const geometries = getGeometries();
  const black = new THREE.MeshBasicMaterial({ color: "#050505" });
  const mesh = (name: string, geometry: THREE.BufferGeometry) => {
    const created = new THREE.Mesh(geometry, black);

    created.name = name;
    // Para não ser confundida com as malhas do GLB ao percorrer o clone.
    created.userData.isDuoOverlay = true;

    return created;
  };
  // Em Y local, a dobradiça fica em +hingeOffset e a metade se estende para
  // -Y; a sobra passa da dobradiça, para +Y.
  const centerY = (width: number) =>
    INNER.hingeOffset + INNER.overlap - (width + INNER.overlap) / 2;
  const innerCenterY = centerY(INNER.width);
  const bezelCenterY = centerY(INNER.bezelWidth);

  // Capa: os eixos do nó são os do aparelho. A tela de dentro olha para -X.
  const coverBezel = mesh("duo-inner-bezel", geometries.coverBezel);
  const coverScreen = mesh("duo-inner-screen", geometries.coverScreen);

  placePlane(coverBezel, AXIS_Y, AXIS_UP, new THREE.Vector3(-LAYER, bezelCenterY, CENTER_Z));
  placePlane(coverScreen, AXIS_Y, AXIS_UP, new THREE.Vector3(-2 * LAYER, innerCenterY, CENTER_Z));

  // Base: o nó está girado 180° em Z, então a tela de dentro olha para +X e
  // a direita de quem olha é -Y.
  const baseBezel = mesh("duo-inner-bezel", geometries.baseBezel);
  const baseScreen = mesh("duo-inner-screen", geometries.baseScreen);

  placePlane(baseBezel, AXIS_Y_NEG, AXIS_UP, new THREE.Vector3(LAYER, bezelCenterY, CENTER_Z));
  placePlane(baseScreen, AXIS_Y_NEG, AXIS_UP, new THREE.Vector3(2 * LAYER, innerCenterY, CENTER_Z));

  // Tela de fora: nas costas da capa (+X), vista por trás.
  const outerScreen = mesh("duo-outer-image", geometries.outerScreen);
  const hole = mesh("duo-outer-camera", geometries.hole);
  const outerX = THICKNESS + 2 * LAYER;

  placePlane(outerScreen, AXIS_Y_NEG, AXIS_UP, new THREE.Vector3(outerX, OUTER.centerY, CENTER_Z));
  placePlane(
    hole,
    AXIS_Y_NEG,
    AXIS_UP,
    new THREE.Vector3(
      outerX + LAYER,
      OUTER.centerY - (OUTER.width / 2 - OUTER.holeInset),
      CENTER_Z - (OUTER.height / 2 - OUTER.holeInset),
    ),
  );

  return {
    black,
    cover: [coverBezel, coverScreen, outerScreen, hole],
    base: [baseBezel, baseScreen],
    innerScreens: [coverScreen, baseScreen],
    outerScreen,
    /** O que some com "Corpo do dispositivo" desligado; as telas ficam. */
    shell: [coverBezel, baseBezel, hole],
  };
}

/**
 * Tira o polimento de um material do arquivo: sem metal e bem áspero, ele
 * deixa de espelhar o ambiente da cena e mostra só a cor — o visual dos
 * outros aparelhos. É a mesma receita do casco do relógio.
 *
 * Aqui a opção existe porque faz diferença: os materiais do Duo são físicos
 * e o frame é quase todo metal polido. Nos outros modelos ela não mudava
 * nada na tela, e foi removida.
 */
function applyMatteFinish(material: THREE.Material) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;

  material.roughness = Math.max(material.roughness, 0.78);
  material.metalness = Math.min(material.metalness, 0.06);
  material.envMapIntensity = Math.min(material.envMapIntensity, 0.18);
}

function useScreenMaterial(texture: THREE.Texture | null) {
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    [texture],
  );

  useEffect(() => () => material.dispose(), [material]);

  return material;
}

type DuoProps = JSX.IntrinsicElements["group"] & {
  /** A tela de dentro. */
  imageUrl?: string;
  /** Gravação de tela; quando presente, substitui a imagem de dentro. */
  videoUrl?: string | null;
  videoKey?: string;
  screenFit?: ScreenFit;
  /** A tela de fora; `null` = placeholder. */
  outerImageUrl?: string | null;
  outerScreenFit?: ScreenFit;
  /** Abertura em graus: 180 aberto, 0 fechado. */
  foldAngle?: number;
  /** Fosco no lugar do polido do arquivo. */
  matteFinish?: boolean;
  colors?: Record<string, string>;
  debugPartColors?: Partial<Record<string, string>>;
  showDeviceShell?: boolean;
  showNotebookKeyboard?: boolean;
  showTabletBezel?: boolean;
  screenPosition?: [number, number, number];
  screenSize?: [number, number];
  screenRotation?: [number, number, number];
};

function DuoImpl({
  imageUrl,
  videoUrl,
  videoKey,
  screenFit,
  outerImageUrl,
  outerScreenFit,
  foldAngle = DEFAULT_FOLD_ANGLE,
  matteFinish = true,
  colors,
  debugPartColors,
  showDeviceShell = true,
  showNotebookKeyboard: _keyboard,
  showTabletBezel: _bezel,
  screenPosition: _sp,
  screenSize: _ss,
  screenRotation: _sr,
  ...props
}: DuoProps) {
  void _keyboard;
  void _bezel;
  void _sp;
  void _ss;
  void _sr;

  const { scene } = useGLTF(MODEL_URL);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  useGraph(clone);

  const resolvedColors: DuoColors =
    (colors as DuoColors) ?? DUO_THEMES[DUO_DEFAULT_THEME];
  const effectiveImageUrl = imageUrl ?? getPlaceholderImageUrl("duo");
  const effectiveOuterImageUrl =
    outerImageUrl ?? getDuoOuterPlaceholderImageUrl();

  // Tela de dentro deitada: 2670 × 1878, uma textura só para as duas metades.
  const innerTexture = useScreenTexture(
    videoUrl
      ? { fit: screenFit, kind: "video", key: videoKey ?? videoUrl, url: videoUrl }
      : { fit: screenFit, kind: "image", url: effectiveImageUrl },
    { cropWidth: 2670, cropHeight: 1878, flipY: true },
  );
  const outerTexture = useScreenTexture(
    { fit: outerScreenFit, kind: "image", url: effectiveOuterImageUrl },
    {
      cropWidth: DUO_OUTER_SCREEN_SIZE[0],
      cropHeight: DUO_OUTER_SCREEN_SIZE[1],
      flipY: true,
    },
  );
  const innerScreenMaterial = useScreenMaterial(innerTexture);
  const outerScreenMaterial = useScreenMaterial(outerTexture);

  // As nossas peças entram nos nós das metades, para dobrar junto com elas.
  const overlay = useMemo(() => createOverlay(), []);

  useEffect(() => () => overlay.black.dispose(), [overlay]);

  useLayoutEffect(() => {
    const cover = clone.getObjectByName(COVER_NODE);
    const base = clone.getObjectByName(BASE_NODE);

    cover?.add(...overlay.cover);
    base?.add(...overlay.base);

    return () => {
      cover?.remove(...overlay.cover);
      base?.remove(...overlay.base);
    };
  }, [clone, overlay]);

  useLayoutEffect(() => {
    overlay.innerScreens.forEach((mesh) => {
      mesh.material = innerScreenMaterial;
    });
    overlay.outerScreen.material = outerScreenMaterial;
  }, [innerScreenMaterial, outerScreenMaterial, overlay]);

  // As malhas do GLB, cada uma com o nome do material original: ele diz a
  // que parte de cor a malha pertence, mesmo depois de trocado.
  const shellMeshes = useMemo(() => {
    const meshes: Array<{ mesh: THREE.Mesh; source: THREE.Material }> = [];

    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (
        mesh.isMesh &&
        !mesh.userData.isDuoOverlay &&
        !Array.isArray(mesh.material)
      ) {
        meshes.push({ mesh, source: mesh.material });
      }
    });

    return meshes;
  }, [clone]);

  // Um material por parte e por objeto: o clone divide os materiais do GLB
  // entre todos os Duos, e pintar o original pintaria todos.
  const partMaterials = useMemo(() => {
    const created = new Map<string, THREE.Material>();

    for (const { source } of shellMeshes) {
      const part = MATERIAL_PARTS[source.name];

      if (!part || created.has(source.name)) continue;

      const material = source.clone();

      if ("color" in material && material.color instanceof THREE.Color) {
        material.color.set(resolvedColors[part]);
      }

      if (matteFinish) {
        applyMatteFinish(material);
      }

      created.set(source.name, material);
    }

    return created;
    // As cores entram uma a uma: `resolvedColors` é um objeto novo a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shellMeshes,
    matteFinish,
    resolvedColors.body,
    resolvedColors.frame,
    resolvedColors.frameHighlight,
    resolvedColors.logo,
  ]);

  useEffect(
    () => () => partMaterials.forEach((material) => material.dispose()),
    [partMaterials],
  );

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

  useLayoutEffect(() => {
    for (const { mesh, source } of shellMeshes) {
      const part = MATERIAL_PARTS[source.name];

      mesh.material =
        (part ? debugMaterials?.[part] : undefined) ??
        partMaterials.get(source.name) ??
        source;
    }
  }, [debugMaterials, partMaterials, shellMeshes]);

  // "Corpo do dispositivo" desligado: ficam só as telas, dobrando no ar.
  useLayoutEffect(() => {
    for (const { mesh } of shellMeshes) {
      mesh.visible = showDeviceShell;
    }

    overlay.shell.forEach((mesh) => {
      mesh.visible = showDeviceShell;
    });
  }, [overlay, shellMeshes, showDeviceShell]);

  // A abertura parada vem daqui; em movimento, o canvas a escreve direto.
  useLayoutEffect(() => {
    applyDuoFoldAngle(clone, foldAngle);
  }, [clone, foldAngle]);

  const pose = getDuoFoldPose(foldAngle, HALF_WIDTH, DUO_HINGE_Z);

  return (
    <group {...props} dispose={null}>
      <group name={CENTER_GROUP} position={[pose.shiftX, 0, pose.shiftZ]}>
        <primitive object={clone} />
      </group>
    </group>
  );
}

export const Duo = React.memo(DuoImpl);

useGLTF.preload(MODEL_URL);
