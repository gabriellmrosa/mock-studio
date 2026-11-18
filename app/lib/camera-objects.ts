import type { CameraOrbit } from "./camera-orbit";
import { createKeyframe, type Keyframe } from "./scene-motion";
import type { CameraObject, SceneObject } from "./scene-objects";
import { isCameraObject } from "./scene-objects";

/**
 * A câmera da cena: um objeto por modo (Foto e Vídeo têm cada um a sua), sempre
 * na lista e nunca apagado. No Foto ela é a câmera que o usuário orbita; no
 * Vídeo, quando tem keyframes, é ela que conduz a câmera pelo tempo.
 */
export function createCameraObject({
  id,
  name,
}: {
  id?: string;
  name: string;
}): CameraObject {
  return {
    kind: "camera",
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

export function findCameraObject(objects: SceneObject[]): CameraObject | null {
  return objects.find(isCameraObject) ?? null;
}

/** A cena sempre tem a sua câmera: devolve a lista com ela, se faltar. */
export function withCameraObject(
  objects: SceneObject[],
  name: string,
): SceneObject[] {
  return findCameraObject(objects)
    ? objects
    : [...objects, createCameraObject({ name })];
}

/**
 * Um keyframe da câmera num instante: os campos de pose nos zeros e a órbita
 * onde ela estava.
 */
export function createCameraKeyframe(
  timeMs: number,
  orbit: CameraOrbit,
): Keyframe {
  return createKeyframe(timeMs, {
    opacity: 1,
    orbit: { ...orbit },
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  });
}
