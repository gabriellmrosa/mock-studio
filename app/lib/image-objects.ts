import { cloneKeyframes } from "./scene-motion";
import type { ImageObject } from "./scene-objects";
import { STICKER_ASPECT, getStickerUrl } from "./stickers";

/**
 * A imagem solta da cena: um plano com um PNG ou SVG, como o texto um objeto
 * com pose, opacidade e keyframes próprios. O que ela mostra fica em
 * `SceneImage`.
 *
 * O arquivo nunca entra em template nem em link (são bytes demais para o
 * `localStorage` e para a URL): o que se guarda é a proporção. Sem arquivo, o
 * objeto é um espaço vazio (um círculo branco convidando ao upload) no mesmo
 * lugar e com a mesma proporção — a referência de onde a imagem estava, para
 * quem abre o template enviar de novo. O espaço vazio é só do editor: não sai na
 * exportação. Um sticker do acervo é diferente: é do app e volta com a arte.
 */
export type SceneImage = {
  /** Largura sobre altura. Com arquivo, é a dele; sem, a do espaço vazio. */
  aspect: number;
  /** Vetor (SVG): é desenhado na textura em tamanho máximo, não no natural. */
  isVector: boolean;
  name: string | null;
  /**
   * Contorno branco e sombra de adesivo, desenhados na textura. Nasce ligado
   * nos stickers e desligado numa imagem enviada.
   */
  outline: boolean;
  /**
   * O sticker do acervo (`stickers.ts`), quando a imagem é um. Diferente de um
   * arquivo enviado, ele é do app: vai no template e no link (é só o id) e
   * volta com a arte, não como espaço vazio.
   */
  stickerId: string | null;
  /** O arquivo (blob URL ou o do sticker); `null` é o espaço vazio. */
  url: string | null;
};

/**
 * A largura da imagem na cena, em unidades, a mesma para todas: a altura vem
 * da proporção, e o tamanho se muda pela escala (que é pose e anima). Assim, o
 * objeto não "cresce" na cena quando se envia um arquivo de outra proporção.
 * É perto da largura de um celular.
 */
export const IMAGE_BASE_WIDTH = 200;

/**
 * A margem que o contorno e a sombra pedem em volta da arte, por lado, em
 * fração do lado maior dela. A textura e o plano crescem nessa proporção, e a
 * arte continua do mesmo tamanho. O espaço vazio também a usa, para a sombra.
 */
export const IMAGE_OUTLINE_MARGIN = 0.07;

export const MIN_IMAGE_ASPECT = 0.05;
export const MAX_IMAGE_ASPECT = 20;

/** O que o navegador decodifica sem travar a aba; acima, o arquivo é recusado. */
export const MAX_IMAGE_FILE_BYTES = 15 * 1024 * 1024;

/** PNG e SVG: o que a interface oferece. */
export const IMAGE_OBJECT_ACCEPT = "image/png,image/svg+xml";

export const DEFAULT_IMAGE: SceneImage = {
  aspect: 1,
  isVector: false,
  name: null,
  outline: false,
  stickerId: null,
  url: null,
};

/**
 * O que um sticker do acervo faz da imagem. A proporção é a do acervo, e o
 * contorno nasce ligado: é o que o faz parecer um adesivo.
 */
export function getStickerImage(stickerId: string): SceneImage {
  return {
    aspect: STICKER_ASPECT,
    isVector: true,
    name: null,
    outline: true,
    stickerId,
    url: getStickerUrl(stickerId),
  };
}

export function normalizeImageAspect(value: unknown): number {
  const aspect = typeof value === "number" && Number.isFinite(value) ? value : 1;

  return Math.min(MAX_IMAGE_ASPECT, Math.max(MIN_IMAGE_ASPECT, aspect));
}

/** Largura e altura do plano na cena. */
export function getImageSize(aspect: number): [number, number] {
  return [IMAGE_BASE_WIDTH, IMAGE_BASE_WIDTH / normalizeImageAspect(aspect)];
}

/**
 * A pose com que a imagem nasce: de frente para a câmera, como o texto (os
 * aparelhos giram 180° porque os modelos olham para trás no arquivo).
 */
export const DEFAULT_IMAGE_POSE = {
  opacity: 1,
  positionX: 0,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scale: 1,
} as const;

export function createImageObject({
  deletable = true,
  id,
  image,
  name,
}: {
  deletable?: boolean;
  id?: string;
  image?: Partial<SceneImage>;
  name: string;
}): ImageObject {
  return {
    kind: "image",
    deletable,
    id: id ?? crypto.randomUUID(),
    image: {
      ...DEFAULT_IMAGE,
      ...image,
      aspect: normalizeImageAspect(image?.aspect),
    },
    isVisible: true,
    keyframes: [],
    name,
    ...DEFAULT_IMAGE_POSE,
  };
}

/** Quanto a cópia fica deslocada do original, em unidades de posição. */
const DUPLICATE_OFFSET = 0.15;

/**
 * Duplica uma imagem um pouco abaixo e à direita do original, com o mesmo
 * arquivo (o blob URL é de leitura, não precisa de cópia) e keyframes de ids
 * novos — a seleção da timeline os procura na cena toda.
 */
export function duplicateImageObject({
  id,
  name,
  source,
}: {
  id?: string;
  name: string;
  source: ImageObject;
}): ImageObject {
  return {
    ...source,
    deletable: true,
    id: id ?? crypto.randomUUID(),
    image: { ...source.image },
    keyframes: cloneKeyframes(source.keyframes),
    name,
    positionX: source.positionX + DUPLICATE_OFFSET,
    positionY: source.positionY - DUPLICATE_OFFSET,
  };
}

type PoseFields = Pick<
  ImageObject,
  | "opacity"
  | "positionX"
  | "positionY"
  | "positionZ"
  | "rotationX"
  | "rotationY"
  | "rotationZ"
  | "scale"
>;

/** Se a imagem já está na pose de partida — aí o reset não teria o que fazer. */
export function isDefaultImagePose(object: PoseFields) {
  return (Object.keys(DEFAULT_IMAGE_POSE) as (keyof PoseFields)[]).every(
    (key) => object[key] === DEFAULT_IMAGE_POSE[key],
  );
}

export function resetImageObject(object: ImageObject): ImageObject {
  return { ...object, ...DEFAULT_IMAGE_POSE };
}

/**
 * A proporção de um SVG pelo que ele declara: o `viewBox` ou, sem ele, a
 * `width` e a `height`. O navegador decodifica um SVG sem tamanho como 0×0 ou
 * com o padrão de 300×150, então o que está escrito no arquivo é a fonte mais
 * confiável. `null` quando não há nenhum dos dois.
 */
export function getSvgAspect(source: string): number | null {
  const root = new DOMParser().parseFromString(source, "image/svg+xml")
    .documentElement;

  if (!root || root.localName !== "svg") {
    return null;
  }

  const box = (root.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  if (box.length === 4 && box[2] > 0 && box[3] > 0) {
    return box[2] / box[3];
  }

  const width = parseFloat(root.getAttribute("width") ?? "");
  const height = parseFloat(root.getAttribute("height") ?? "");

  return width > 0 && height > 0 ? width / height : null;
}

/**
 * Confere o arquivo e o lê como imagem da cena: o blob URL, a proporção e se é
 * vetor. Recusa o que o navegador não decodifica (o mesmo caminho da textura,
 * um `<img>`) e o que passa do limite. Um SVG só é carregado assim, como
 * imagem — o que desliga os scripts dele.
 */
export async function readImageFile(file: File): Promise<SceneImage> {
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    throw new Error("O arquivo é grande demais.");
  }

  const isVector = file.type === "image/svg+xml";
  const url = URL.createObjectURL(file);
  const image = new Image();

  try {
    image.src = url;
    await image.decode();

    const declared = isVector ? getSvgAspect(await file.text()) : null;
    const natural =
      image.naturalWidth && image.naturalHeight
        ? image.naturalWidth / image.naturalHeight
        : null;
    const aspect = declared ?? natural;

    if (aspect === null) {
      throw new Error("A imagem não tem tamanho.");
    }

    return {
      aspect: normalizeImageAspect(aspect),
      isVector,
      name: file.name,
      outline: false,
      stickerId: null,
      url,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error instanceof Error
      ? error
      : new Error("O navegador não decodifica esta imagem.");
  }
}
