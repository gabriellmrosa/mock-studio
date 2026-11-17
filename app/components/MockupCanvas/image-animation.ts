import type * as THREE from "three";

/**
 * Leva a animação de uma imagem ao instante da cena (em ms, contado do início do
 * objeto). O plano da imagem registra `userData.setAnimationTime` quando a
 * animação carrega; o preview e a exportação de vídeo chamam isto a cada
 * quadro, como escrevem a pose, sem passar pelo React. Sem animação (ou ainda
 * carregando) não há nada registrado, e não faz nada.
 */
export function applyImageAnimationTime(group: THREE.Object3D, timeMs: number) {
  group.traverse((child) => {
    const setTime = child.userData.setAnimationTime;

    if (typeof setTime === "function") {
      setTime(timeMs);
    }
  });
}
