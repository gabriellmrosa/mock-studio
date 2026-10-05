"use client";

import * as THREE from "three";

/**
 * Alinhamento de um objeto a uma área do canvas — no Movimento, o quadro do
 * vídeo; no Estático, o que fica visível entre os painéis. Num eixo por vez:
 * o horizontal (esquerda, centro, direita) ou o vertical (topo, meio, base).
 *
 * O objeto anda num plano paralelo à tela, sem chegar mais perto nem mais
 * longe da câmera. A referência é a silhueta dele na tela (os vértices
 * projetados), não a caixa 3D, que num aparelho girado é bem maior que ele.
 */

export type AlignmentAxis = "x" | "y";
/** No eixo horizontal, esquerda/direita; no vertical, topo/base. */
export type AlignmentEdge = "start" | "center" | "end";
export type ObjectAlignment = { axis: AlignmentAxis; edge: AlignmentEdge };

/**
 * A área de referência, em frações do canvas (0 a 1), contadas a partir da
 * esquerda e do topo.
 */
export type AlignmentArea = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export const FULL_ALIGNMENT_AREA: AlignmentArea = {
  bottom: 1,
  left: 0,
  right: 1,
  top: 0,
};

/**
 * Respiro entre o objeto e a borda da área, como fração do lado menor dela:
 * o mesmo nos dois eixos, em qualquer proporção.
 */
export const ALIGNMENT_MARGIN = 0.05;

/**
 * A perspectiva faz as partes mais próximas andarem mais na tela que as
 * distantes: cada passo corrige o que o anterior errou. Três bastam para
 * ficar abaixo de um pixel.
 */
const MAX_STEPS = 4;
const TOLERANCE_NDC = 1e-4;

function isDepthTwin(object: THREE.Object3D) {
  return object.userData.isOpacityDepth === true;
}

/** Os vértices do objeto em coordenadas do mundo, em sequência x, y, z. */
export function collectWorldVertices(object: THREE.Object3D) {
  const vertices: number[] = [];
  const vertex = new THREE.Vector3();

  object.updateWorldMatrix(true, true);
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const position = mesh.isMesh
      ? mesh.geometry?.getAttribute("position")
      : undefined;

    // As gêmeas da opacidade repetem a geometria da mesh de verdade.
    if (!position || !mesh.visible || isDepthTwin(mesh)) {
      return;
    }

    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
      vertices.push(vertex.x, vertex.y, vertex.z);
    }
  });

  return new Float32Array(vertices);
}

/**
 * Onde a borda (ou o centro) da silhueta tem de chegar, em coordenadas
 * normalizadas da tela: de -1 a 1, com o y para cima.
 */
function getTarget(
  area: AlignmentArea,
  aspect: number,
  { axis, edge }: ObjectAlignment,
) {
  // Em alturas do canvas, a unidade em que largura e altura se comparam.
  const width = (area.right - area.left) * aspect;
  const height = area.bottom - area.top;
  const margin = ALIGNMENT_MARGIN * Math.min(width, height);
  const [low, high, marginNdc] =
    axis === "x"
      ? [-1 + 2 * area.left, -1 + 2 * area.right, (2 * margin) / aspect]
      : [1 - 2 * area.bottom, 1 - 2 * area.top, 2 * margin];

  if (edge === "center") {
    return (low + high) / 2;
  }

  // Esquerda e base são o lado baixo do eixo; direita e topo, o alto.
  const isLow = axis === "x" ? edge === "start" : edge === "end";

  return isLow ? low + marginNdc : high - marginNdc;
}

/**
 * Quanto mover o objeto, em coordenadas do mundo, para alinhá-lo. `null` se
 * não há o que alinhar (sem vértices, ou atrás da câmera).
 */
export function getAlignmentOffset(
  vertices: Float32Array,
  camera: THREE.PerspectiveCamera,
  alignment: ObjectAlignment,
  area: AlignmentArea = FULL_ALIGNMENT_AREA,
) {
  if (vertices.length === 0) {
    return null;
  }

  camera.updateMatrixWorld();

  const { axis, edge } = alignment;
  const useMin = axis === "x" ? edge === "start" : edge === "end";
  const target = getTarget(area, camera.aspect, alignment);
  const direction = new THREE.Vector3().setFromMatrixColumn(
    camera.matrixWorld,
    axis === "x" ? 0 : 1,
  );
  const forward = camera.getWorldDirection(new THREE.Vector3());
  const eye = camera.getWorldPosition(new THREE.Vector3());
  const offset = new THREE.Vector3();
  const point = new THREE.Vector3();
  const center = new THREE.Vector3();
  const halfHeightPerDepth =
    Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / camera.zoom;
  const halfExtentPerDepth =
    axis === "x" ? halfHeightPerDepth * camera.aspect : halfHeightPerDepth;

  for (let step = 0; step < MAX_STEPS; step += 1) {
    let min = Infinity;
    let max = -Infinity;

    center.set(0, 0, 0);

    for (let index = 0; index < vertices.length; index += 3) {
      point
        .set(vertices[index], vertices[index + 1], vertices[index + 2])
        .add(offset);
      center.add(point);
      point.project(camera);

      const value = point[axis];

      min = Math.min(min, value);
      max = Math.max(max, value);
    }

    center.divideScalar(vertices.length / 3);

    const depth = center.sub(eye).dot(forward);

    if (depth <= 0) {
      return null;
    }

    const current = edge === "center" ? (min + max) / 2 : useMin ? min : max;
    const delta = target - current;

    if (Math.abs(delta) < TOLERANCE_NDC) {
      break;
    }

    // Na profundidade do objeto, meia tela tem esta largura (ou altura).
    offset.addScaledVector(direction, delta * depth * halfExtentPerDepth);
  }

  return offset;
}
