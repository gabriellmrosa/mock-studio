/**
 * A câmera descrita como uma órbita em volta de um alvo — o que se anima — e a
 * conversão de e para o par posição/alvo que o `camera-controls` entende.
 *
 * Órbita e não XYZ: interpolar posições em linha reta cortaria caminho por
 * dentro do aparelho, e a volta de um lado ao outro seria um corte; interpolando
 * ângulo e distância a câmera desenha o arco que se espera. O ângulo horizontal
 * não é reduzido ao caminho mais curto: de 0° a 360° é uma volta inteira.
 *
 * Os ângulos estão em graus. 0° de azimute é a câmera de frente (no +Z); 0° de
 * elevação, na altura do alvo, e positivo é de cima.
 */
export type CameraOrbit = {
  /** Horizontal, em graus, sem limite: 360 é uma volta. */
  azimuth: number;
  /** Distância da câmera ao alvo, em unidades da cena. */
  distance: number;
  /** Vertical, em graus: positivo olha de cima. */
  elevation: number;
  /** Campo de visão vertical, em graus. */
  fov: number;
  targetX: number;
  targetY: number;
  targetZ: number;
};

export const DEFAULT_CAMERA_FOV = 45;
export const MIN_CAMERA_FOV = 15;
export const MAX_CAMERA_FOV = 90;
/** Perto dos polos a órbita gira de ponta-cabeça: a câmera para um pouco antes. */
export const MAX_CAMERA_ELEVATION = 85;

const RADIANS = Math.PI / 180;

export const DEFAULT_CAMERA_ORBIT: CameraOrbit = {
  azimuth: 0,
  distance: 5,
  elevation: 0,
  fov: DEFAULT_CAMERA_FOV,
  targetX: 0,
  targetY: 0,
  targetZ: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** A posição e o alvo (para `setLookAt`) de uma órbita. */
export function orbitToLookAt(orbit: CameraOrbit): {
  position: [number, number, number];
  target: [number, number, number];
} {
  const azimuth = orbit.azimuth * RADIANS;
  const polar = (90 - orbit.elevation) * RADIANS;
  const horizontal = orbit.distance * Math.sin(polar);

  return {
    position: [
      orbit.targetX + horizontal * Math.sin(azimuth),
      orbit.targetY + orbit.distance * Math.cos(polar),
      orbit.targetZ + horizontal * Math.cos(azimuth),
    ],
    target: [orbit.targetX, orbit.targetY, orbit.targetZ],
  };
}

/** A órbita de uma posição e um alvo; o azimute volta em (-180, 180]. */
export function lookAtToOrbit(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
  fov: number,
): CameraOrbit {
  const dx = position[0] - target[0];
  const dy = position[1] - target[1];
  const dz = position[2] - target[2];
  const distance = Math.hypot(dx, dy, dz);

  return {
    azimuth: Math.atan2(dx, dz) / RADIANS,
    distance,
    elevation: distance === 0 ? 0 : Math.asin(clamp(dy / distance, -1, 1)) / RADIANS,
    fov,
    targetX: target[0],
    targetY: target[1],
    targetZ: target[2],
  };
}

/** Mistura duas órbitas campo a campo (o azimute sem encurtar o caminho). */
export function lerpOrbit(from: CameraOrbit, to: CameraOrbit, t: number): CameraOrbit {
  const mix = (a: number, b: number) => a + (b - a) * t;

  return {
    azimuth: mix(from.azimuth, to.azimuth),
    distance: mix(from.distance, to.distance),
    elevation: mix(from.elevation, to.elevation),
    fov: mix(from.fov, to.fov),
    targetX: mix(from.targetX, to.targetX),
    targetY: mix(from.targetY, to.targetY),
    targetZ: mix(from.targetZ, to.targetZ),
  };
}

/** Leitura defensiva (template, link): o que não for número vira o padrão, dentro dos limites. */
export function normalizeOrbit(value: unknown): CameraOrbit {
  const input = (value && typeof value === "object" ? value : {}) as Partial<CameraOrbit>;

  return {
    azimuth: finite(input.azimuth, DEFAULT_CAMERA_ORBIT.azimuth),
    distance: Math.max(0.001, finite(input.distance, DEFAULT_CAMERA_ORBIT.distance)),
    elevation: clamp(
      finite(input.elevation, DEFAULT_CAMERA_ORBIT.elevation),
      -MAX_CAMERA_ELEVATION,
      MAX_CAMERA_ELEVATION,
    ),
    fov: clamp(finite(input.fov, DEFAULT_CAMERA_FOV), MIN_CAMERA_FOV, MAX_CAMERA_FOV),
    targetX: finite(input.targetX, 0),
    targetY: finite(input.targetY, 0),
    targetZ: finite(input.targetZ, 0),
  };
}

export function isOrbit(value: unknown): value is CameraOrbit {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    ["azimuth", "distance", "elevation", "fov", "targetX", "targetY", "targetZ"] as const
  ).every((key) => typeof (value as Record<string, unknown>)[key] === "number");
}
