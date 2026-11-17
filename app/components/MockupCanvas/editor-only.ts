import type * as THREE from "three";

/**
 * Esconde da cena o que só existe para quem edita — o espaço vazio de uma imagem
 * que ainda não tem arquivo (`userData.editorOnly`) —, para a exportação não o
 * levar. Devolve a função que desfaz, a chamar quando o quadro já foi lido do alvo:
 * o editor não pode ficar sem o espaço vazio.
 */
export function hideEditorOnlyObjects(scene: THREE.Object3D): () => void {
  const hidden: THREE.Object3D[] = [];

  scene.traverse((child) => {
    if (child.userData.editorOnly && child.visible) {
      child.visible = false;
      hidden.push(child);
    }
  });

  return () => {
    for (const child of hidden) {
      child.visible = true;
    }
  };
}
