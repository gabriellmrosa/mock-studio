/**
 * Leva um `<video>` a um instante e espera o quadro chegar (`seeked`). É o
 * passo de cada quadro da exportação de vídeo, para cada tela com vídeo.
 *
 * Um seek que não responde não derruba a exportação de cara, por dois motivos
 * vistos com uma gravação de tela do iPhone (HEVC):
 *
 * - o primeiro seek depois de enviar o arquivo liga o decodificador do Mac e
 *   levou 2,4 s, contra uns 20 ms dos outros; numa máquina ocupada ele pode
 *   passar do limite. Por isso tenta de novo antes de desistir;
 * - com a página escondida (outra aba, outro app), o navegador pode suspender
 *   um vídeo sem som e só responder quando ela volta. Então, se o limite
 *   estoura com a página escondida, espera ela voltar e tenta de novo, sem
 *   contar a tentativa.
 *
 * A causa da falha que o usuário viu não foi reproduzida; as duas cobrem o
 * que se mediu (ver `docs/open-work.md`).
 */

/** Quanto cada tentativa espera pelo `seeked`. */
export const SEEK_TIMEOUT_MS = 5000;

/** Tentativas com a página visível antes de a exportação falhar. */
export const SEEK_ATTEMPTS = 3;

type SeekableVideo = Pick<
  HTMLVideoElement,
  "addEventListener" | "currentTime" | "removeEventListener" | "seeking"
>;

type VisibilitySource = Pick<
  Document,
  "addEventListener" | "removeEventListener" | "visibilityState"
>;

export type SeekVideoOptions = {
  attempts?: number;
  /** De onde vem a visibilidade da página (o `document`, fora dos testes). */
  page?: VisibilitySource;
  timeoutMs?: number;
};

export async function seekVideo(
  element: SeekableVideo,
  seconds: number,
  {
    attempts = SEEK_ATTEMPTS,
    page = document,
    timeoutMs = SEEK_TIMEOUT_MS,
  }: SeekVideoOptions = {},
) {
  const target = Math.max(0, seconds);
  let failures = 0;

  while (true) {
    // Seek para onde já está não dispara `seeked`. Numa nova tentativa, também
    // é o caso de o seek anterior ter chegado depois do limite.
    if (Math.abs(element.currentTime - target) < 0.0005 && !element.seeking) {
      return;
    }

    if (await trySeek(element, target, timeoutMs)) {
      return;
    }

    if (page.visibilityState === "hidden") {
      await waitUntilVisible(page);
      continue;
    }

    failures += 1;

    if (failures >= attempts) {
      throw new Error("O vídeo da tela não respondeu ao seek.");
    }
  }
}

/** `true` quando o `seeked` chega dentro do limite. */
function trySeek(element: SeekableVideo, target: number, timeoutMs: number) {
  return new Promise<boolean>((resolve) => {
    const timeout = window.setTimeout(() => {
      element.removeEventListener("seeked", handleSeeked);
      resolve(false);
    }, timeoutMs);

    function handleSeeked() {
      window.clearTimeout(timeout);
      resolve(true);
    }

    element.addEventListener("seeked", handleSeeked, { once: true });
    element.currentTime = target;
  });
}

function waitUntilVisible(page: VisibilitySource) {
  return new Promise<void>((resolve) => {
    function handleChange() {
      if (page.visibilityState !== "hidden") {
        page.removeEventListener("visibilitychange", handleChange);
        resolve();
      }
    }

    page.addEventListener("visibilitychange", handleChange);
  });
}
