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
) {
  const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);

  return new Uint8Array(await new Response(output).arrayBuffer());
}

/** A URL que abre esta cena, a partir do endereço atual do app. */
export async function createSceneLink(template: SceneTemplate, baseUrl: string) {
  // `id` e `createdAt` são de quem salva: quem abre o link cria os seus.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, id, ...fields } = template;
  const payload: LinkPayload = { template: fields, v: LINK_VERSION };
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const compressed = await transform(json, new CompressionStream("deflate-raw"));
  const url = new URL(baseUrl);

  url.hash = "";

  return `${url.toString()}${HASH_PREFIX}${toBase64Url(compressed)}`;
}

/** O conteúdo do link, se o endereço trouxer um. */
export function readSceneLinkHash(hash: string) {
  return hash.startsWith(HASH_PREFIX) ? hash.slice(HASH_PREFIX.length) : null;
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
