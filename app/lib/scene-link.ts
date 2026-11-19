import {
  isValidTemplate,
  normalizeTemplate,
  type SceneTemplate,
} from "./scene-templates";

/**
 * Link do projeto: a cena inteira dentro da própria URL, para abri-la em
 * outro navegador — os templates ficam no `localStorage` de cada um, e o
 * Safari, que ainda não mostra vídeo transparente, precisa mandar a cena para
 * o Chrome, o Edge ou o Firefox.
 *
 * Vai depois do `#`, que o navegador nunca envia a servidor nenhum: a cena não
 * sai do computador de quem copia. É o mesmo conteúdo de um template —
 * composição, poses, keyframes, câmera, fundo e tamanho do vídeo —, sem as
 * imagens e vídeos das telas, comprimido (deflate) e em base64 de URL.
 */

const HASH_PREFIX = "#scene=";
/** Versão do formato do link, independente da dos templates salvos. */
const LINK_VERSION = 1;
/**
 * Teto em bytes para o JSON descomprimido de um link ou código colado. Uma
 * cena real fica em poucos KB; limitar a leitura impede que um payload
 * adulterado (bomba de descompressão) consuma memória e trave a aba. 5 MB é o
 * tamanho do `localStorage`: nenhum template que o próprio app guarda passa
 * disso, então nenhum código que ele gera é recusado.
 */
export const MAX_DECODED_LINK_BYTES = 5_000_000;

type LinkPayload = {
  template: Omit<SceneTemplate, "createdAt" | "id">;
  v: number;
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function transform(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
  maxBytes?: number,
) {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);

  if (maxBytes === undefined) {
    return new Uint8Array(await new Response(output).arrayBuffer());
  }

  const reader = output.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      total += value.byteLength;

      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("O conteúdo do link ultrapassa o tamanho máximo.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}

/**
 * Só o conteúdo de um template, comprimido e em texto: o que vai depois de
 * `#scene=` num link. É o que se compartilha à mão ("Compartilhar template" e
 * "Importar template"), igual em qualquer endereço do app.
 */
export async function createSceneCode(template: SceneTemplate) {
  // `id` e `createdAt` são de quem salva: quem abre o código cria os seus.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, id, ...fields } = template;
  const payload: LinkPayload = { template: fields, v: LINK_VERSION };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = await transform(json, new CompressionStream("deflate-raw"));

  return toBase64Url(compressed);
}

/** A URL que abre esta cena, a partir do endereço atual do app. */
export async function createSceneLink(template: SceneTemplate, baseUrl: string) {
  const url = new URL(baseUrl);

  url.hash = "";

  return `${url.toString()}${HASH_PREFIX}${await createSceneCode(template)}`;
}

/** O conteúdo do link, se o endereço trouxer um. */
export function readSceneLinkHash(hash: string) {
  return hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : null;
}

/**
 * O código colado à mão ("Importar template"): aceita só o código ou um link
 * inteiro (de onde sai o que vem depois de `#scene=`). `null` se o texto não
 * parece um código — vazio, ou com letras que o formato nunca usa.
 */
export function extractSceneLink(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf(HASH_PREFIX);
  const encoded =
    start === -1 ? trimmed : trimmed.slice(start + HASH_PREFIX.length);

  return /^[A-Za-z0-9_-]+$/.test(encoded) ? encoded : null;
}

/**
 * O link que veio no endereço ao abrir a página: `undefined` enquanto ninguém
 * olhou, depois o conteúdo (ou `null`).
 */
let takenFromUrl: string | null | undefined;

/**
 * Tira a cena do endereço na primeira vez que alguém olha, guardando o
 * conteúdo. Quem lê a URL (o analytics) tem de chamar isto antes: a cena não
 * pode sair do computador, e assim tanto faz quem roda primeiro.
 */
export function clearSceneLinkFromUrl() {
  if (takenFromUrl !== undefined) {
    return;
  }

  takenFromUrl = readSceneLinkHash(window.location.hash);

  if (takenFromUrl !== null) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }
}

/**
 * O link do endereço, uma vez só: depois de entregue, não abre de novo — nem
 * num segundo efeito do modo estrito do React, nem ao recarregar.
 */
export function consumeSceneLinkFromUrl() {
  clearSceneLinkFromUrl();

  const encoded = takenFromUrl ?? null;

  takenFromUrl = null;

  return encoded;
}

/**
 * A cena do link, validada como um template salvo; `null` se o link estiver
 * cortado, corrompido ou for de um formato que este app não conhece.
 */
export async function decodeSceneLink(
  encoded: string,
): Promise<SceneTemplate | null> {
  try {
    const json = await transform(
      fromBase64Url(encoded),
      new DecompressionStream("deflate-raw"),
      MAX_DECODED_LINK_BYTES,
    );
    const payload = JSON.parse(new TextDecoder().decode(json)) as Partial<LinkPayload>;
    const template = {
      ...payload.template,
      createdAt: Date.now(),
      id: crypto.randomUUID(),
    };

    if (payload.v !== LINK_VERSION || !isValidTemplate(template)) {
      return null;
    }

    return normalizeTemplate(template);
  } catch {
    return null;
  }
}
