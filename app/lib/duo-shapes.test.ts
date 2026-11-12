import * as THREE from "three";
import { getRoundedShape } from "./duo-shapes";

describe("getRoundedShape", () => {
  const radius = 0.044;
  const shape = getRoundedShape(0.4, 0.6, [radius, radius, radius, radius]);
  const points = shape.getPoints(32);

  it("rounds a corner with a true circular arc, not a flatter curve", () => {
    // O centro do arco está a `radius` da quina em cada eixo; o ponto do arco
    // mais perto da quina fica a `radius × (√2 − 1)` dela. Numa curva
    // quadrática seria 0,354 × radius — mais quadrada, e foi o que fez o anel
    // preto da tela de fora afinar nos cantos.
    const corner = new THREE.Vector2(0.2, 0.3);
    const nearest = Math.min(...points.map((p) => p.distanceTo(corner)));

    expect(nearest).toBeCloseTo(radius * (Math.SQRT2 - 1), 3);
  });

  it("stays inside the rectangle and touches all four sides", () => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);

    expect(Math.max(...xs)).toBeCloseTo(0.2);
    expect(Math.min(...xs)).toBeCloseTo(-0.2);
    expect(Math.max(...ys)).toBeCloseTo(0.3);
    expect(Math.min(...ys)).toBeCloseTo(-0.3);
  });

  it("keeps a corner sharp when its radius is 0", () => {
    const sharp = getRoundedShape(0.4, 0.6, [0, 0.044, 0.044, 0]).getPoints(32);

    expect(sharp.some((p) => Math.abs(p.x + 0.2) < 1e-9 && Math.abs(p.y - 0.3) < 1e-9)).toBe(true);
  });
});
