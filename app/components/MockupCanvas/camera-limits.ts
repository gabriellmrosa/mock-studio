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
 * Até onde o centro da órbita pode sair dos objetos, como fração do que fica
 * visível do centro até a borda, em cada direção: abaixo de 1, sempre sobra
 * um pedaço deles no quadro.
 */
export const ORBIT_MARGIN_SHARE = 0.7;

/**
 * Quanto do canvas se vê, em frações (0 a 1) da largura e da altura: no
 * Movimento o canvas inteiro, que é o quadro do vídeo; no Estático o que
 * sobra entre os painéis, que passam por cima dele.
 */
export type VisibleShare = { height: number; width: number };

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
 *
 * A folga é medida em cada direção do que se vê: na horizontal pela largura,
 * na vertical pela altura. Medida só pela altura, numa tela larga ela ficava
 * curta demais na horizontal: um objeto alinhado à borda, ainda à vista,
 * puxava a câmera para ele no gesto seguinte. A câmera mal gira em volta do
 * eixo vertical (±0,85 rad), então o x do mundo é a horizontal da tela.
 */
export function getOrbitBoundary(
  box: THREE.Box3,
  distance: number,
  fov: number,
  aspect: number,
  visible: VisibleShare,
) {
  const size = box.getSize(new THREE.Vector3());
  const maxSide = Math.max(size.x, size.y, size.z);
  const halfHeight = distance * Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  const halfWidth = halfHeight * aspect;
  const marginX = Math.min(maxSide, halfWidth * visible.width * ORBIT_MARGIN_SHARE);
  const marginY = Math.min(maxSide, halfHeight * visible.height * ORBIT_MARGIN_SHARE);

  return box
    .clone()
    .expandByVector(new THREE.Vector3(marginX, marginY, Math.max(marginX, marginY)));
}

