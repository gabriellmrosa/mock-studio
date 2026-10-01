import * as THREE from "three";
import { applyObjectOpacity, orderObjectGroups } from "./object-opacity";

/** Dois aparelhos iguais: o clone do GLB compartilha o material do corpo. */
function makeTwins() {
  const shared = new THREE.MeshStandardMaterial({ color: "#888888" });
  const glass = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
  const make = () => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(), shared);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(), glass);

    group.add(body, front);

    return { body, front, group };
  };

  return { a: make(), b: make(), glass, shared };
}

describe("applyObjectOpacity", () => {
  it("fades one object without touching its twin's shared material", () => {
    const { a, b, shared } = makeTwins();

    applyObjectOpacity(a.group, 0.5);

    expect(a.body.material).not.toBe(shared);
    expect((a.body.material as THREE.Material).opacity).toBe(0.5);
    expect((a.body.material as THREE.Material).transparent).toBe(true);
    expect(b.body.material).toBe(shared);
    expect(shared.opacity).toBe(1);
    expect(shared.transparent).toBe(false);
  });

  it("multiplies the material's own opacity, so glass stays relatively clearer", () => {
    const { a } = makeTwins();

    applyObjectOpacity(a.group, 0.5);

    expect((a.front.material as THREE.Material).opacity).toBe(0.25);
  });

  it("follows changes the model makes to the original while faded", () => {
    const { a, shared } = makeTwins();

    applyObjectOpacity(a.group, 0.5);
    shared.color.set("#ff0000");
    applyObjectOpacity(a.group, 0.5);

    expect(
      (a.body.material as THREE.MeshStandardMaterial).color.getHexString(),
    ).toBe("ff0000");
  });

  it("gives the original materials back at 100%", () => {
    const { a, glass, shared } = makeTwins();

    applyObjectOpacity(a.group, 0.3);
    applyObjectOpacity(a.group, 1);

    expect(a.body.material).toBe(shared);
    expect(a.front.material).toBe(glass);
  });

  it("hides the object at 0%, so it can't cover what is behind it", () => {
    const { a } = makeTwins();

    applyObjectOpacity(a.group, 0);
    expect(a.group.visible).toBe(false);

    applyObjectOpacity(a.group, 1);
    expect(a.group.visible).toBe(true);
  });

  it("draws a depth-only pass first, so the fade shows only the front surface", () => {
    const { a } = makeTwins();

    applyObjectOpacity(a.group, 0.5);

    const twins = (mesh: THREE.Mesh) =>
      mesh.children.filter((child) => child.userData.isOpacityDepth);
    const [bodyDepth] = twins(a.body) as THREE.Mesh[];

    expect(bodyDepth).toBeDefined();
    expect(bodyDepth.geometry).toBe(a.body.geometry);
    expect((bodyDepth.material as THREE.Material).colorWrite).toBe(false);
    expect(bodyDepth.renderOrder).toBeLessThan(a.body.renderOrder);
    // Vidro fica fora: tapar a tela com a profundidade dele esconderia a tela.
    expect(twins(a.front)).toHaveLength(0);

    applyObjectOpacity(a.group, 1);

    expect(twins(a.body)).toHaveLength(0);
  });

  it("leaves an object that never faded on its original materials", () => {
    const { a, shared } = makeTwins();

    applyObjectOpacity(a.group, 1);

    expect(a.body.material).toBe(shared);
  });
});

describe("orderObjectGroups", () => {
  it("draws objects back to front, after the rest of the scene", () => {
    const near = new THREE.Group();
    const far = new THREE.Group();
    const inner = new THREE.Group();
    const camera = new THREE.PerspectiveCamera();

    near.position.set(0, 0, -1);
    far.position.set(0, 0, -10);
    far.add(inner);

    orderObjectGroups([near, far], camera);

    expect(far.renderOrder).toBe(1);
    // Os grupos de dentro levam a mesma ordem: o three usa a do mais próximo.
    expect(inner.renderOrder).toBe(1);
    expect(near.renderOrder).toBe(2);
  });
});
