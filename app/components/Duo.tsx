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
import { getRoundedShape } from "../lib/duo-shapes";
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
  "less-black": "grooves",
  "apple-material-sides-darker": "logo",
  "black": "bezel",
  "screen": "lens",
};

export const DUO_PARTS = {
  body: "body",
  frame: "frame",
  frameHighlight: "frameHighlight",
  grooves: "grooves",
  logo: "logo",
  bezel: "bezel",
  lens: "lens",
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
  bezelWidth: 0.385,
  bezelHeight: 0.546,
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
  // Câmera frontal: uma pílula em pé no canto de cima, do lado de fora. No
  // arquivo ela não é geometria — vem pintada na imagem de exemplo da tela —,
  // então o tamanho e o lugar foram medidos nele, e depois afinados à vista:
  // ~0,026 × 0,048, com o centro a 0,036 da lateral e a 0,038 do topo.
  holeWidth: 0.026,
  holeHeight: 0.048,
  holeInsetX: 0.036,
  holeInsetY: 0.038,
};

/** O brilho próprio das lentes no arquivo, por canal, com a cor original. */
const LENS_GLOW = 0.3;

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

/**
 * O perfil de um canto, medido nas malhas do arquivo: pontos `[a, b]` em que
 * `a` é a distância da borda vertical e `b` a da borda horizontal, do ponto
 * em que a curva sai da lateral ao ponto em que chega ao topo. O canto da
 * Apple não é um arco de círculo — é achatado e de raios diferentes na
 * largura e na altura —, e aproximá-lo com um raio só deixava a moldura
 * preta e a tela fora do contorno do frame.
 */
type CornerProfile = readonly (readonly [number, number])[];

/** O canto externo da tela de dentro (a malha "screen" do arquivo). */
const INNER_SCREEN_CORNER: CornerProfile = [
  [0, 0.0505], [0.0002, 0.0442], [0.0008, 0.0385], [0.0017, 0.0332],
  [0.003, 0.0283], [0.0045, 0.0238], [0.0064, 0.0198], [0.0086, 0.0162],
  [0.011, 0.0129], [0.0138, 0.0101], [0.0168, 0.0076], [0.0202, 0.0054],
  [0.0239, 0.0036], [0.0281, 0.0021], [0.0328, 0.001], [0.038, 0.0003],
  [0.044, 0],
];

/** O canto externo da moldura preta da tela de dentro (a malha "black"). */
const INNER_BEZEL_CORNER: CornerProfile = [
  [0, 0.0618], [0.0002, 0.055], [0.0009, 0.0485], [0.0019, 0.0423],
  [0.0034, 0.0364], [0.0054, 0.031], [0.0077, 0.0259], [0.0105, 0.0212],
  [0.0138, 0.017], [0.0174, 0.0131], [0.0215, 0.0098], [0.026, 0.0069],
  [0.031, 0.0044], [0.0364, 0.0025], [0.0422, 0.0011], [0.0485, 0.0003],
  [0.0553, 0],
];

type ShapeCorners = [
  topLeft: CornerProfile | null,
  topRight: CornerProfile | null,
  bottomRight: CornerProfile | null,
  bottomLeft: CornerProfile | null,
];

/**
 * Retângulo centrado na origem com o perfil medido em cada canto, ou `null`
 * para canto vivo — o lado da dobradiça, onde a tela é uma só.
 */
function getProfiledShape(width: number, height: number, corners: ShapeCorners) {
  const x = width / 2;
  const y = height / 2;
  const [tl, tr, br, bl] = corners;
  const points: [number, number][] = [];
  // Anti-horário a partir do canto de cima à direita; a tabela vai da lateral
  // ao topo, então nos cantos que o percurso atravessa do topo à lateral
  // (cima à esquerda, baixo à direita) ela é lida de trás para frente.
  const corner = (
    profile: CornerProfile | null,
    sx: number,
    sy: number,
    reverse: boolean,
  ) => {
    if (!profile) {
      points.push([sx * x, sy * y]);
      return;
    }

    const ordered = reverse ? [...profile].reverse() : profile;

    for (const [a, b] of ordered) {
      points.push([sx * (x - a), sy * (y - b)]);
    }
  };

  corner(tr, 1, 1, false);
  corner(tl, -1, 1, true);
  corner(bl, -1, -1, false);
  corner(br, 1, -1, true);

  const shape = new THREE.Shape();

  shape.moveTo(...points[0]);
  points.slice(1).forEach((point) => shape.lineTo(...point));
  shape.closePath();

  return shape;
}

/**
 * Plano com UVs normalizadas para a textura da tela. `u0`/`u1` escolhem a
 * fatia horizontal da imagem: cada metade da tela de dentro mostra a sua.
 */
function createScreenGeometry(
  width: number,
  height: number,
  shape: THREE.Shape,
  u0 = 0,
  u1 = 1,
) {
  const geometry = new THREE.ShapeGeometry(shape, 32);
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
  const coverSide = (profile: CornerProfile): ShapeCorners => [
    profile,
    null,
    null,
    profile,
  ];
  const baseSide = (profile: CornerProfile): ShapeCorners => [
    null,
    profile,
    profile,
    null,
  ];

  const bezelWidth = INNER.bezelWidth + INNER.overlap;
  const screenWidth = INNER.width + INNER.overlap;
  // A sobra mostra o trecho seguinte da imagem, não uma repetição da borda.
  const overlapU = (INNER.overlap / INNER.width) * 0.5;

  return {
    coverBezel: new THREE.ShapeGeometry(
      getProfiledShape(bezelWidth, INNER.bezelHeight, coverSide(INNER_BEZEL_CORNER)),
      32,
    ),
    baseBezel: new THREE.ShapeGeometry(
      getProfiledShape(bezelWidth, INNER.bezelHeight, baseSide(INNER_BEZEL_CORNER)),
      32,
    ),
    // Metade esquerda da imagem na capa, direita na base.
    coverScreen: createScreenGeometry(
      screenWidth,
      INNER.height,
      getProfiledShape(screenWidth, INNER.height, coverSide(INNER_SCREEN_CORNER)),
      0,
      0.5 + overlapU,
    ),
    baseScreen: createScreenGeometry(
      screenWidth,
      INNER.height,
      getProfiledShape(screenWidth, INNER.height, baseSide(INNER_SCREEN_CORNER)),
      0.5 - overlapU,
      1,
    ),
    // Vista por trás, o lado de fora da capa fica à direita. O canto dela é
    // um arco de círculo de verdade (raio 0,044, conferido nas malhas).
    outerScreen: createScreenGeometry(
      OUTER.width,
      OUTER.height,
      getRoundedShape(OUTER.width, OUTER.height, [
        OUTER.hingeRadius,
        OUTER.radius,
        OUTER.radius,
        OUTER.hingeRadius,
      ]),
    ),
    hole: new THREE.ShapeGeometry(
      getRoundedShape(OUTER.holeWidth, OUTER.holeHeight, [
        OUTER.holeWidth / 2,
        OUTER.holeWidth / 2,
        OUTER.holeWidth / 2,
        OUTER.holeWidth / 2,
      ]),
      32,
    ),
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
      OUTER.centerY - (OUTER.width / 2 - OUTER.holeInsetX),
      CENTER_Z - (OUTER.height / 2 - OUTER.holeInsetY),
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
  /** Gravação na tela de fora; quando presente, substitui a imagem dela. */
  outerVideoUrl?: string | null;
  outerVideoKey?: string;
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
  outerVideoUrl,
  outerVideoKey,
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

  // O tema por baixo: um objeto com menos partes que as de hoje (de antes de
  // elas existirem) ainda abre, com o padrão nas que faltam.
  const resolvedColors: DuoColors = {
    ...DUO_THEMES[DUO_DEFAULT_THEME],
    ...colors,
  };
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
    outerVideoUrl
      ? {
          fit: outerScreenFit,
          kind: "video",
          key: outerVideoKey ?? outerVideoUrl,
          url: outerVideoUrl,
        }
      : { fit: outerScreenFit, kind: "image", url: effectiveOuterImageUrl },
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

  // As molduras e o furo que desenhamos são da mesma cor da moldura do arquivo.
  useLayoutEffect(() => {
    overlay.black.color.set(resolvedColors.bezel);
  }, [overlay, resolvedColors.bezel]);

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

      if (part === "lens" && "emissive" in material) {
        // A lente brilha por conta própria (emissivo do arquivo): com a cor
        // trocada o brilho a acompanha, ou um preto ficaria cinza.
        (material.emissive as THREE.Color)
          .set(resolvedColors.lens)
          .multiplyScalar(LENS_GLOW);
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
    resolvedColors.grooves,
    resolvedColors.logo,
    resolvedColors.bezel,
    resolvedColors.lens,
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

// Sem `useGLTF.preload` aqui: só o modelo da abertura é pré-carregado, e os
// outros são aquecidos depois da cena pronta (app/lib/model-warmup.ts).
