import * as THREE from "three";
import { getDuoFoldFx, type DuoFoldFx } from "./duo-fold-effect";

/**
 * O material das telas do Duo: um `MeshBasicMaterial` com a textura da tela
 * que, quando o aparelho se mexe, desfoca e escurece o conteúdo (ver
 * `duo-fold-effect.ts`). Parado, os uniformes ficam em zero e a imagem sai
 * exatamente como num material comum.
 *
 * O desfoque é feito no shader, por amostras em disco (Vogel) em volta do
 * ponto: não depende de mipmap, e o `VideoTexture` das gravações de tela não
 * tem. A distância à dobradiça vem do UV cru do plano (a imagem inteira vai
 * de 0 a 1, e a dobradiça fica em 0,5 nas metades de dentro e numa borda da
 * tela de fora), então a metade que gira e a parada usam o mesmo shader com
 * um sinal diferente.
 */
export type DuoFoldRole = "cover" | "base" | "outer";

const HINGE_BY_ROLE: Record<DuoFoldRole, [number, number]> = {
  // d = a + b·u, com u o UV cru do plano: 0 na dobradiça, 1 na borda livre.
  cover: [1, -2],
  base: [-1, 2],
  outer: [0, 1],
};

const TAPS = 32;

/**
 * O disco de amostras tem raio `DISK_RADIUS_PER_SIGMA` vezes o desvio pedido: o
 * desvio-padrão de um disco uniforme é metade do raio, então com 2 o disco
 * dá o mesmo espalhamento de um gaussiano de desvio `blurPx`. Com 1, ele
 * desfocava só metade do que a fonte mede.
 */
const DISK_RADIUS_PER_SIGMA = 2;

type FoldUniforms = {
  uFxAspect: { value: number };
  uFxBlur: { value: number };
  uFxDarkenBase: { value: number };
  uFxDarkenEdge: { value: number };
  uFxHinge: { value: THREE.Vector2 };
  uFxPower: { value: number };
};

type FoldMaterialData = { role: DuoFoldRole; uniforms: FoldUniforms };

export function createFoldScreenMaterial(
  texture: THREE.Texture | null,
  role: DuoFoldRole,
) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const [hingeA, hingeB] = HINGE_BY_ROLE[role];
  const uniforms: FoldUniforms = {
    uFxAspect: { value: 1 },
    uFxBlur: { value: 0 },
    uFxDarkenBase: { value: 0 },
    uFxDarkenEdge: { value: 0 },
    uFxHinge: { value: new THREE.Vector2(hingeA, hingeB) },
    uFxPower: { value: 3 },
  };

  material.userData.foldFx = { role, uniforms } satisfies FoldMaterialData;
  material.customProgramCacheKey = () => "duo-fold-screen";
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec2 uFxHinge;
varying float vFxDist;`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
vFxDist = uFxHinge.x + uFxHinge.y * uv.x;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uFxAspect;
uniform float uFxBlur;
uniform float uFxDarkenBase;
uniform float uFxDarkenEdge;
uniform float uFxPower;
varying float vFxDist;`,
      )
      .replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
  float fxDist = clamp(vFxDist, 0.0, 1.0);
  float fxRadius = uFxBlur * pow(fxDist, uFxPower);
  vec4 sampledDiffuseColor = texture2D(map, vMapUv);
  // O teste é num uniforme (igual para todos os fragmentos): amostrar a
  // textura num ramo que muda de um pixel para o vizinho estraga as derivadas
  // do mipmap e riscava a tela numa linha onde o raio cruzava o limiar.
  if (uFxBlur > 0.0) {
    vec4 fxSum = vec4(0.0);
    for (int i = 0; i < ${TAPS}; i++) {
      float fxR = sqrt((float(i) + 0.5) / ${TAPS}.0) * fxRadius;
      float fxA = float(i) * 2.39996323;
      vec2 fxOffset = vec2(cos(fxA), sin(fxA)) * fxR * vec2(1.0, uFxAspect);
      fxSum += texture2D(map, vMapUv + fxOffset);
    }
    sampledDiffuseColor = fxSum / ${TAPS}.0;
  }
  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif
  sampledDiffuseColor.rgb *= 1.0 - clamp(uFxDarkenBase + uFxDarkenEdge * fxDist, 0.0, 1.0);
  diffuseColor *= sampledDiffuseColor;
#endif`,
      );
  };

  return material;
}

function readFoldData(material: THREE.Material): FoldMaterialData | null {
  return (material.userData.foldFx as FoldMaterialData | undefined) ?? null;
}

/** O tamanho em px da imagem de origem de uma textura (imagem, canvas ou vídeo). */
function getSourceSize(texture: THREE.Texture | null): [number, number] {
  const image = texture?.image as
    | { height?: number; videoHeight?: number; videoWidth?: number; width?: number }
    | undefined;
  const width = image?.videoWidth || image?.width || 1000;
  const height = image?.videoHeight || image?.height || 1000;

  return [width, height];
}

function writeUniforms(material: THREE.Material, fx: DuoFoldFx) {
  const data = readFoldData(material);

  if (!data) {
    return;
  }

  const { role, uniforms } = data;
  const [width, height] = getSourceSize(
    (material as THREE.MeshBasicMaterial).map,
  );
  const blurPx =
    role === "outer" ? fx.outer.blurPx : role === "cover" ? fx.inner.blurPx : 0;

  uniforms.uFxAspect.value = width / height;
  uniforms.uFxBlur.value = (blurPx * DISK_RADIUS_PER_SIGMA) / width;
  uniforms.uFxPower.value =
    role === "outer" ? fx.outer.falloffPower : fx.inner.falloffPower;
  uniforms.uFxDarkenBase.value =
    role === "outer"
      ? fx.outer.darken
      : role === "cover"
        ? fx.inner.baseDarken
        : fx.base.baseDarken;
  uniforms.uFxDarkenEdge.value = role === "cover" ? fx.inner.freeEdgeDarken : 0;
}

/**
 * Escreve o efeito do ângulo nas telas do modelo, direto, como a pose. As
 * telas são as malhas marcadas com `userData.foldFxRole` (as nossas, presas às
 * metades); a lista é achada uma vez e guardada no `root`.
 */
export function applyDuoFoldFx(root: THREE.Object3D, foldAngle: number) {
  let meshes = root.userData.foldFxMeshes as THREE.Mesh[] | undefined;

  if (!meshes) {
    meshes = [];
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (mesh.isMesh && mesh.userData.foldFxRole) {
        meshes!.push(mesh);
      }
    });

    // Só guarda quando achou: antes de as telas serem marcadas, a lista vazia
    // ficaria para sempre.
    if (meshes.length > 0) {
      root.userData.foldFxMeshes = meshes;
    }
  }

  const fx = getDuoFoldFx(foldAngle);

  for (const mesh of meshes) {
    if (!Array.isArray(mesh.material)) {
      writeUniforms(mesh.material, fx);
    }
  }
}
