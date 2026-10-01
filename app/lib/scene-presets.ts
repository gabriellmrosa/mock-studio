"use client";

export const DEFAULT_OBJECT_TRANSFORM = {
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 180,
  rotationZ: 0,
  scale: 1,
  /** 0 a 1. Faz parte da pose: anima nos keyframes como posição e escala. */
  opacity: 1,
} as const;

export const OBJECT_POSITION_MULTIPLIER = 140;
export const OBJECT_POSITION_MULTIPLIER_Z = 420;

export const AUTO_OBJECT_POSITIONS: [number, number, number][] = [
  [0, 0, 0],
  [-0.8, 0.02, 0.1],
  [0.8, -0.02, -0.1],
  [-1.1, 0.04, -0.2],
  [1.1, -0.04, 0.2],
];
