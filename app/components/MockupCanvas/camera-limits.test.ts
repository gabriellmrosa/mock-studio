import * as THREE from "three";
import {
  MAX_DISTANCE_RATIO,
  MIN_DISTANCE_RATIO,
  ORBIT_MARGIN_SHARE,
  getCameraLimits,
  getOrbitBoundary,
} from "./camera-limits";

const FOV = 45;
const FULL = { height: 1, width: 1 };

/** Uma cena: um celular de 140 × 280 × 14 em volta da origem. */
function phoneBox() {
  return new THREE.Box3(
    new THREE.Vector3(-70, -140, -7),
    new THREE.Vector3(70, 140, 7),
  );
}

describe("getCameraLimits", () => {
  it("scales with the scene: twice the scene, twice the limits", () => {
    const small = getCameraLimits(phoneBox(), FOV)!;
    const big = phoneBox();

    big.min.multiplyScalar(2);
    big.max.multiplyScalar(2);

    const large = getCameraLimits(big, FOV)!;

    expect(large.maxDistance).toBeCloseTo(small.maxDistance * 2);
    expect(large.minDistance).toBeCloseTo(small.minDistance * 2);
  });

  it("keeps the scene small but visible at the farthest", () => {
    const box = phoneBox();
    const { maxDistance, minDistance } = getCameraLimits(box, FOV)!;
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
    // Fração da altura da tela que a esfera da cena ocupa naquela distância.
    const screenShare = (distance: number) =>
      radius / (distance * Math.tan(THREE.MathUtils.degToRad(FOV) / 2));

    expect(maxDistance / minDistance).toBeCloseTo(
      MAX_DISTANCE_RATIO / MIN_DISTANCE_RATIO,
    );
    // Afastada ao máximo, ainda ocupa por volta de 1/8 da tela.
    expect(screenShare(maxDistance)).toBeGreaterThan(0.1);
    expect(screenShare(maxDistance)).toBeLessThan(0.2);
  });

  it("draws everything inside the limits, from close up to the farthest", () => {
    const box = phoneBox();
    const limits = getCameraLimits(box, FOV)!;
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius;

    expect(limits.near).toBeLessThan(limits.minDistance);
    // Com o centro na borda da folga, o objeto mais distante ainda é desenhado.
    expect(limits.far).toBeGreaterThan(limits.maxDistance + radius * 2);
  });

  it("keeps part of the scene in view, close up or far away", () => {
    const box = phoneBox();
    const { maxDistance, minDistance } = getCameraLimits(box, FOV)!;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);

    for (const distance of [minDistance, minDistance * 10, maxDistance]) {
      const boundary = getOrbitBoundary(box, distance, FOV, 16 / 9, FULL);
      // O quanto o centro pode sair da caixa, contra o que a câmera enxerga.
      const marginX = boundary.max.x - box.max.x;
      const marginY = boundary.max.y - box.max.y;

      expect(boundary.containsBox(box)).toBe(true);
      expect(marginX).toBeLessThanOrEqual(
        distance * tanHalf * (16 / 9) * ORBIT_MARGIN_SHARE + 1e-6,
      );
      expect(marginY).toBeLessThanOrEqual(distance * tanHalf * ORBIT_MARGIN_SHARE + 1e-6);
    }
  });

  it("frees the pan up to the scene's size when far away", () => {
    const box = phoneBox();
    const { maxDistance } = getCameraLimits(box, FOV)!;
    const boundary = getOrbitBoundary(box, maxDistance, FOV, 16 / 9, FULL);

    // O maior lado do celular é a altura, 280.
    expect(boundary.max.x - box.max.x).toBeCloseTo(280);
  });

  it("measures the margin by the width horizontally, so an object aligned to the edge stays put", () => {
    const box = phoneBox();
    const distance = getCameraLimits(box, FOV)!.minDistance * 6;
    const boundary = getOrbitBoundary(box, distance, FOV, 16 / 9, FULL);

    // Numa tela 16:9, a folga horizontal é 16/9 da vertical.
    expect((boundary.max.x - box.max.x) / (boundary.max.y - box.max.y)).toBeCloseTo(16 / 9);
  });

  it("narrows with the visible area, as between the side panels", () => {
    const box = phoneBox();
    const distance = getCameraLimits(box, FOV)!.minDistance * 6;
    const full = getOrbitBoundary(box, distance, FOV, 1.6, FULL);
    const betweenPanels = getOrbitBoundary(box, distance, FOV, 1.6, {
      height: 0.83,
      width: 0.58,
    });

    expect(betweenPanels.max.x - box.max.x).toBeCloseTo((full.max.x - box.max.x) * 0.58);
  });

  it("has nothing to limit in an empty scene", () => {
    expect(getCameraLimits(new THREE.Box3(), FOV)).toBeNull();
  });
});
