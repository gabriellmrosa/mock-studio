import type { BackgroundPose } from "./canvas-background";
import { createKeyframe, type Keyframe } from "./scene-motion";
import {
  isBackgroundObject,
  type BackgroundObject,
  type SceneObject,
} from "./scene-objects";

/**
 * O Fundo da cena: um objeto por modo, sempre na lista (logo abaixo da câmera)
 * e nunca apagado. No Foto, selecioná-lo mostra no Inspector o fundo da cena;
 * no Vídeo, os keyframes dele levam o fundo pelo tempo.
 */
export function createBackgroundObject({
  id,
  name,
}: {
  id?: string;
  name: string;
}): BackgroundObject {
  return {
    kind: "background",
    deletable: false,
    id: id ?? crypto.randomUUID(),
    isVisible: true,
    keyframes: [],
    name,
    opacity: 1,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  };
}

export function findBackgroundObject(objects: SceneObject[]): BackgroundObject | null {
  return objects.find(isBackgroundObject) ?? null;
}

/** A cena sempre tem o seu Fundo: devolve a lista com ele, se faltar. */
export function withBackgroundObject(
  objects: SceneObject[],
  name: string,
): SceneObject[] {
  return findBackgroundObject(objects)
    ? objects
    : [...objects, createBackgroundObject({ name })];
}

/** Um keyframe do Fundo num instante: a pose nos zeros e o fundo de então. */
export function createBackgroundKeyframe(
  timeMs: number,
  background: BackgroundPose,
): Keyframe {
  return createKeyframe(timeMs, {
    background: { ...background, grid: { ...background.grid } },
    opacity: 1,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  });
}
