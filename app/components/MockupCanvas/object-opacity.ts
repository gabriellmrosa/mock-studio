"use client";

import * as THREE from "three";

/**
 * Opacidade de um objeto da cena (o grupo de um aparelho), com cara de fade
 * de editor de vídeo: o objeto desbota como uma camada só.
 *
 * Deixar cada material translúcido sozinho não basta — vira raio-X: através
 * da tela aparecem a traseira, as câmeras, o miolo. Por isso o objeto
 * translúcido é desenhado em duas passadas: primeiro só a profundidade, depois
 * a cor, que então só passa na superfície da frente. Vidros (materiais que já
 * vêm translúcidos) ficam fora da passada de profundidade, ou tapariam a tela
 * que está atrás deles.
 *
 * Os modelos são clonados com `SkeletonUtils.clone`, que compartilha os
 * materiais do GLB entre aparelhos iguais: mudar a opacidade no material de
 * um celular apagaria todos. Por isso, enquanto um objeto está translúcido,
 * cada mesh dele usa uma cópia própria do material — e só enquanto: de volta
 * a 100%, os materiais originais voltam e as cópias são descartadas. A cópia
 * é sincronizada com o original a cada quadro, porque os modelos mexem nos
 * materiais deles (a textura da tela, as cores) sem trocá-los.
 */

type OwnedMaterial = {
  material: THREE.Material;
  source: THREE.Material;
  /**
   * Versão do original já levada à cópia. Quando o modelo pede recompilação
   * do original (ex.: a tela ganhou textura), a cópia também precisa.
   */
  sourceVersion: number;
};

type OwnedMesh = {
  /** Gêmea da mesh que só escreve profundidade; `null` em vidros. */
  depth: THREE.Mesh | null;
  materials: OwnedMaterial[];
};

type GroupState = Map<THREE.Mesh, OwnedMesh>;

const groups = new WeakMap<THREE.Object3D, GroupState>();

/** Materiais da passada de profundidade, um por lado (frente, verso, ambos). */
const depthMaterials = new Map<THREE.Side, THREE.Material>();

function getDepthMaterial(side: THREE.Side) {
  let material = depthMaterials.get(side);

  if (!material) {
    // Transparente só para entrar na lista dos transparentes, onde a ordem
    // de desenho é controlada; não pinta cor nenhuma.
    material = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      side,
      transparent: true,
    });
    depthMaterials.set(side, material);
  }

  return material;
}

function isDepthTwin(object: THREE.Object3D) {
  return object.userData.isOpacityDepth === true;
}

function createDepthTwin(mesh: THREE.Mesh, side: THREE.Side) {
  const depth = new THREE.Mesh(mesh.geometry, getDepthMaterial(side));

  depth.userData.isOpacityDepth = true;
  // Antes da cor do próprio objeto (ver orderObjectGroups).
  depth.renderOrder = -1;
  // Não pode ser clicada nem contar como a mesh de verdade.
  depth.raycast = () => undefined;
  mesh.add(depth);

  return depth;
}

function release(owned: OwnedMesh) {
  for (const entry of owned.materials) {
    entry.material.dispose();
  }

  owned.depth?.removeFromParent();
}

/** Devolve os materiais originais e descarta cópias e gêmeas. */
function restore(state: GroupState) {
  for (const [mesh, owned] of state) {
    const sources = owned.materials.map((entry) => entry.source);

    mesh.material = Array.isArray(mesh.material) ? sources : sources[0];
    release(owned);
  }
}

function ownedFor(state: GroupState, mesh: THREE.Mesh): OwnedMesh {
  const current = state.get(mesh);
  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];
  const next = materials.map((material, index) => {
    const entry = current?.materials[index];

    // A nossa cópia, ou o mesmo original de antes: continua valendo.
    if (entry && (entry.material === material || entry.source === material)) {
      return entry;
    }

    // O modelo trocou o material (tema, cores): copia o novo.
    entry?.material.dispose();

    const copy = material.clone();

    copy.transparent = true;

    return { material: copy, source: material, sourceVersion: material.version };
  });

  // Vidro já é translúcido: não escreve profundidade, nem na passada extra.
  const isGlass = next.every((entry) => entry.source.transparent);
  let depth = current?.depth ?? null;

  if (isGlass && depth) {
    depth.removeFromParent();
    depth = null;
  } else if (!isGlass && !depth) {
    depth = createDepthTwin(mesh, next[0].source.side);
  }

  const owned = { depth, materials: next };

  state.set(mesh, owned);

  return owned;
}

export function applyObjectOpacity(group: THREE.Object3D, opacity: number) {
  const target = Math.min(1, Math.max(0, opacity));
  const state = groups.get(group);

  // Totalmente transparente é ausência: escondido, sem escrever
  // profundidade (um objeto invisível não pode tapar o que está atrás).
  group.visible = target > 0;

  if (target >= 1) {
    if (state) {
      restore(state);
      groups.delete(group);
    }

    return;
  }

  if (target <= 0) {
    return;
  }

  const owned = state ?? new Map();

  groups.set(group, owned);

  // Lista antes de mexer: a travessia não pode visitar as gêmeas recém-criadas.
  const meshes: THREE.Mesh[] = [];

  group.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.isMesh && mesh.material && !isDepthTwin(mesh)) {
      meshes.push(mesh);
    }
  });

  for (const mesh of meshes) {
    const { materials } = ownedFor(owned, mesh);

    for (const entry of materials) {
      // Traz o que o modelo mudou no original (textura, cor) e aplica a
      // opacidade por cima.
      entry.material.copy(entry.source);
      entry.material.opacity = entry.source.opacity * target;
      entry.material.transparent = true;

      if (entry.sourceVersion !== entry.source.version) {
        entry.sourceVersion = entry.source.version;
        entry.material.needsUpdate = true;
      }
    }

    mesh.material = Array.isArray(mesh.material)
      ? materials.map((entry) => entry.material)
      : materials[0].material;
  }
}

const worldPosition = new THREE.Vector3();

/**
 * Ordem de desenho dos transparentes, por objeto: do mais distante da câmera
 * para o mais próximo, e cada objeto inteiro de uma vez (profundidade e cor
 * juntas). Sem isso, a passada de profundidade de um objeto translúcido na
 * frente esconderia outro translúcido atrás dele.
 *
 * O three ordena os transparentes pelo `renderOrder` do grupo mais próximo de
 * cada mesh: por isso a ordem vai em todos os grupos de dentro do objeto.
 */
export function orderObjectGroups(
  objectGroups: Iterable<THREE.Object3D>,
  camera: THREE.Camera,
) {
  const sorted = [...objectGroups]
    .map((group) => ({
      distance: group.getWorldPosition(worldPosition).distanceToSquared(
        camera.position,
      ),
      group,
    }))
    .sort((a, b) => b.distance - a.distance);

  // A partir de 1: o resto da cena (o grid do chão) fica em 0 e é desenhado
  // antes — senão a profundidade de um objeto translúcido o esconderia.
  sorted.forEach(({ group }, index) => {
    group.traverse((child) => {
      if ((child as THREE.Group).isGroup) {
        child.renderOrder = index + 1;
      }
    });
  });
}
