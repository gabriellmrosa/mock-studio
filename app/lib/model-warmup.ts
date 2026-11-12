/**
 * Os modelos 3D que NÃO são o da abertura (o padrão, `apple_iphone_14_pro_orange`,
 * é carregado pelo próprio componente). Juntos passam de 45 MB.
 *
 * Cada componente chamava `useGLTF.preload` no próprio módulo, e como o
 * catálogo importa todos, a página começava baixando os cinco arquivos ao
 * mesmo tempo — o modelo que aparece na tela (4 MB) disputava a banda com os
 * outros 47 MB: com 20 Mbps, a cena demorava 6,3 s para ficar pronta, contra
 * 2,8 s quando só ele é baixado. Agora só o padrão é pré-carregado, e os
 * demais são aquecidos aqui, depois que a cena ficou pronta.
 */
export const WARMUP_MODEL_URLS = [
  "/models/iphone-duo.glb",
  "/models/smartwatch.glb",
  "/models/notebook.glb",
  "/models/smartphone.glb",
] as const;

let started = false;

/**
 * Baixa os modelos restantes, um de cada vez, quando o navegador está ocioso.
 * Só enche o cache HTTP — não decodifica nada, que numa thread ocupada seria
 * um engasgo —, então trocar de aparelho depois pega o arquivo daqui. É
 * seguro chamar mais de uma vez: só a primeira faz algo.
 */
export function warmUpModels() {
  if (started || typeof window === "undefined") {
    return;
  }

  started = true;

  const whenIdle = (task: () => void) =>
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(task, { timeout: 4000 })
      : window.setTimeout(task, 1500);

  const queue = [...WARMUP_MODEL_URLS];

  const next = () => {
    const url = queue.shift();

    if (!url) {
      return;
    }

    // Um por vez, e o próximo só depois deste terminar: sem competir entre si
    // nem com o que a pessoa pedir no meio do caminho.
    fetch(url)
      .then((response) => response.arrayBuffer())
      .catch(() => undefined)
      .finally(() => whenIdle(next));
  };

  whenIdle(next);
}
