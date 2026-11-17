import type * as THREE from "three";

/**
 * O pedaço do `Text` do troika que o movimento escreve direto, sem passar pelo
 * React (como a opacidade, que é o `fillOpacity` dele).
 */
type TroikaText = THREE.Object3D & {
  color: string;
  letterSpacing: number;
  sync: (callback?: () => void) => void;
};

/**
 * Leva a cor e o espaço entre letras de um texto ao valor do quadro. A cor é
 * um uniform. O espaço entre letras muda a posição de cada letra, então o troika
 * recompõe o texto num worker: vale no quadro seguinte, não no mesmo. A
 * promessa resolve quando a composição termina; o preview a ignora (uma letra
 * atrasada por um quadro não se vê), a exportação a espera para o quadro sair
 * com o espaço certo.
 */
export function applyTextStyle(
  group: THREE.Object3D,
  { color, letterSpacing }: { color: string; letterSpacing: number },
): Promise<void> | undefined {
  let pending: Promise<void> | undefined;

  group.traverse((child) => {
    if (!("fillOpacity" in child)) {
      return;
    }

    const text = child as unknown as TroikaText;

    text.color = color;

    if (text.letterSpacing !== letterSpacing) {
      text.letterSpacing = letterSpacing;
      pending = new Promise<void>((resolve) => text.sync(resolve));
    }
  });

  return pending;
}
