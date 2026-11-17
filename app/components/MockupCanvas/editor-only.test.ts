import * as THREE from "three";
import { hideEditorOnlyObjects } from "./editor-only";

describe("hideEditorOnlyObjects", () => {
  function makeScene() {
    const scene = new THREE.Scene();
    const real = new THREE.Mesh();
    const dashed = new THREE.Mesh();
    const group = new THREE.Group();

    dashed.userData.editorOnly = true;
    group.add(dashed);
    scene.add(real, group);

    return { dashed, real, scene };
  }

  it("hides what only the editor shows, and nothing else", () => {
    const { dashed, real, scene } = makeScene();

    hideEditorOnlyObjects(scene);

    expect(dashed.visible).toBe(false);
    expect(real.visible).toBe(true);
  });

  it("puts it back afterwards", () => {
    const { dashed, scene } = makeScene();
    const show = hideEditorOnlyObjects(scene);

    show();

    expect(dashed.visible).toBe(true);
  });

  it("leaves alone what was already hidden, so it does not turn visible later", () => {
    const { dashed, scene } = makeScene();

    dashed.visible = false;
    hideEditorOnlyObjects(scene)();

    expect(dashed.visible).toBe(false);
  });
});
