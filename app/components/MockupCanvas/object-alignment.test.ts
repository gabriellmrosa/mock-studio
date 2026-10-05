import * as THREE from "three";
import {
  ALIGNMENT_MARGIN,
  collectWorldVertices,
  getAlignmentOffset,
  type AlignmentArea,
  type ObjectAlignment,
} from "./object-alignment";

function createCamera(aspect = 16 / 9) {
  const camera = new THREE.PerspectiveCamera(35, aspect, 1, 5000);

  camera.position.set(80, 40, 900);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  return camera;
}

function createObject() {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(120, 240, 12));

  // Girado, como um aparelho em pose: a caixa 3D fica maior que a silhueta.
  mesh.rotation.set(0.3, -0.5, 0.1);
  mesh.position.set(-40, 30, 50);

  return mesh;
}

/** Os limites da silhueta na tela, depois de mover pelo offset. */
function getScreenBounds(
  vertices: Float32Array,
  camera: THREE.PerspectiveCamera,
  offset: THREE.Vector3,
) {
  const bounds = { maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity };
  const point = new THREE.Vector3();

  for (let index = 0; index < vertices.length; index += 3) {
    point
      .set(vertices[index], vertices[index + 1], vertices[index + 2])
      .add(offset)
      .project(camera);
    bounds.minX = Math.min(bounds.minX, point.x);
    bounds.maxX = Math.max(bounds.maxX, point.x);
    bounds.minY = Math.min(bounds.minY, point.y);
    bounds.maxY = Math.max(bounds.maxY, point.y);
  }

  return bounds;
}

function align(
  alignment: ObjectAlignment,
  aspect?: number,
  area?: AlignmentArea,
) {
  const camera = createCamera(aspect);
  const object = createObject();
  const vertices = collectWorldVertices(object);
  const before = getScreenBounds(vertices, camera, new THREE.Vector3());
  const offset = getAlignmentOffset(vertices, camera, alignment, area)!;
  const after = getScreenBounds(vertices, camera, offset);

  return { after, before, camera, offset };
}

describe("getAlignmentOffset", () => {
  // Respiro em coordenadas da tela, num quadro 16:9: o lado menor é a altura.
  const marginX = (2 * ALIGNMENT_MARGIN * 9) / 16;
  const marginY = 2 * ALIGNMENT_MARGIN;

  it("brings the silhouette to the left edge, with breathing room", () => {
    const { after } = align({ axis: "x", edge: "start" });

    expect(after.minX).toBeCloseTo(-1 + marginX, 3);
  });

  it("brings it to the right edge", () => {
    const { after } = align({ axis: "x", edge: "end" });

    expect(after.maxX).toBeCloseTo(1 - marginX, 3);
  });

  it("brings it to the top and to the bottom", () => {
    expect(align({ axis: "y", edge: "start" }).after.maxY).toBeCloseTo(
      1 - marginY,
      3,
    );
    expect(align({ axis: "y", edge: "end" }).after.minY).toBeCloseTo(
      -1 + marginY,
      3,
    );
  });

  it("centers one axis and leaves the other in place", () => {
    const { after, before } = align({ axis: "x", edge: "center" });

    expect((after.minX + after.maxX) / 2).toBeCloseTo(0, 3);
    expect(after.minY).toBeCloseTo(before.minY, 3);
    expect(after.maxY).toBeCloseTo(before.maxY, 3);
  });

  it("keeps the distance to the camera", () => {
    const { camera, offset } = align({ axis: "y", edge: "start" });
    const forward = camera.getWorldDirection(new THREE.Vector3());

    expect(offset.dot(forward)).toBeCloseTo(0, 6);
  });

  it("uses the same breathing room on both axes in a portrait frame", () => {
    // 9:16: o lado menor agora é a largura.
    expect(align({ axis: "x", edge: "start" }, 9 / 16).after.minX).toBeCloseTo(
      -1 + 2 * ALIGNMENT_MARGIN,
      3,
    );
    expect(align({ axis: "y", edge: "end" }, 9 / 16).after.minY).toBeCloseTo(
      -1 + (2 * ALIGNMENT_MARGIN * 9) / 16,
      3,
    );
  });

  it("aligns inside an area of the canvas, like the stage between the panels", () => {
    // 1440 × 900 com painéis de 304 px dos dois lados: sobram 832 × 900.
    const aspect = 1440 / 900;
    const inset = 304 / 1440;
    const area = { bottom: 1, left: inset, right: 1 - inset, top: 0 };
    const margin = (ALIGNMENT_MARGIN * 832) / 900; // em alturas do canvas

    expect(align({ axis: "x", edge: "start" }, aspect, area).after.minX).toBeCloseTo(
      -1 + 2 * inset + (2 * margin) / aspect,
      3,
    );
    expect(align({ axis: "x", edge: "end" }, aspect, area).after.maxX).toBeCloseTo(
      1 - 2 * inset - (2 * margin) / aspect,
      3,
    );
    expect(align({ axis: "y", edge: "start" }, aspect, area).after.maxY).toBeCloseTo(
      1 - 2 * margin,
      3,
    );
  });

  it("ignores the opacity depth twins and returns null without vertices", () => {
    const object = createObject();
    const twin = new THREE.Mesh(new THREE.BoxGeometry(5000, 5000, 5000));

    twin.userData.isOpacityDepth = true;
    object.add(twin);

    expect(collectWorldVertices(object)).toHaveLength(
      collectWorldVertices(createObject()).length,
    );
    expect(
      getAlignmentOffset(new Float32Array(), createCamera(), {
        axis: "x",
        edge: "start",
      }),
    ).toBeNull();
  });
});
