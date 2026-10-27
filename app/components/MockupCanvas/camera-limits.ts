"use client";

import * as THREE from "three";

/**
 * Trava de segurança da câmera: até onde ela pode se afastar, se aproximar e
 * levar o centro da órbita, sempre em relação à própria cena — vale igual
 * para um celular sozinho ou cinco aparelhos espalhados.
 *
 * Sem ela, o zoom não tinha limite (cada clique no "afastar" multiplica a
 * distância), o pan e o zoom até o cursor arrastavam o centro da órbita para
 * longe dos objetos, e passando de 100× a distância de enquadramento os
 * objetos sumiam de uma vez, cortados pelo plano de fundo da câmera.
 *
 * A régua é a distância em que a cena inteira cabe na tela.
 */

/** Afastado ao máximo, a cena fica com ~1/8 do tamanho enquadrado. */
export const MAX_DISTANCE_RATIO = 8;
/** De perto dá para ver detalhes sem a câmera atravessar o aparelho. */
export const MIN_DISTANCE_RATIO = 1 / 20;
/**
 * Até onde o centro da órbita pode sair dos objetos, como fração da meia
 * altura que a câmera enxerga: abaixo de 1, sempre sobra um pedaço deles no
 * quadro. Metade, e não mais: no Estático o canvas passa por baixo dos
 * painéis, e a área livre entre eles é mais estreita que o canvas.
 */
export const ORBIT_MARGIN_SHARE = 0.5;

export type CameraLimits = {
  far: number;
  maxDistance: number;
  minDistance: number;
  near: number;
};

/**
 * Os limites para uma cena, a partir da caixa dos objetos e do campo de
 * visão vertical da câmera, em graus. `null` se a caixa estiver vazia.
 */
export function getCameraLimits(
  box: THREE.Box3,
  fov: number,
): CameraLimits | null {
  if (box.isEmpty()) {
    return null;
  }

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const halfFov = THREE.MathUtils.degToRad(fov) / 2;
  // A distância em que a esfera da cena encosta em cima e embaixo da tela.
  const fitDistance = sphere.radius / Math.sin(halfFov);
  const minDistance = fitDistance * MIN_DISTANCE_RATIO;
  const maxDistance = fitDistance * MAX_DISTANCE_RATIO;

  return {
    // O que a câmera desenha cobre a trava inteira — de perto até o limite
    // máximo, mais a profundidade da cena e da folga do centro —, para nada
    // ser cortado dentro dela.
    far: maxDistance + sphere.radius * 4,
    maxDistance,
    minDistance,
    near: minDistance / 10,
  };
}

/**
 * Até onde o centro da órbita pode ir, a uma distância da câmera: a caixa
 * dos objetos com uma folga que acompanha o zoom. De longe, a folga chega ao
 * tamanho da cena e o pan fica livre; de perto, a câmera enxerga pouco, e a
 * folga encolhe junto — senão o pan, ou o zoom até um canto vazio, deixaria a
 * câmera olhando para o nada ao lado dos objetos.
 */
export function getOrbitBoundary(box: THREE.Box3, distance: number, fov: number) {
  const size = box.getSize(new THREE.Vector3());
  const visibleHalfHeight =
    distance * Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const margin = Math.min(
    Math.max(size.x, size.y, size.z),
    visibleHalfHeight * ORBIT_MARGIN_SHARE,
  );

  return box.clone().expandByScalar(margin);
}

