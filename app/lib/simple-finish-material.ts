import * as THREE from "three";

/**
 * Acabamento das partes coloridas dos aparelhos. Só fosco: havia uma opção
 * "brilhante" (Phong), mas o brilho do Phong só aparece com luz direta, e a
 * cena é iluminada apenas pelo ambiente de estúdio — o resultado saía idêntico
 * ao fosco, e a opção foi removida.
 */
export function createSimpleFinishMaterial(color: string) {
  return new THREE.MeshLambertMaterial({ color });
}
