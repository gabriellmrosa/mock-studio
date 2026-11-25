"use client";

import {
  DEVICE_MODELS,
  type DeviceModelId,
} from "../models/device-models";
import {
  DEFAULT_OBJECT_TRANSFORM,
  OBJECT_POSITION_MULTIPLIER,
} from "./scene-presets";
import {
  createMissingScreenDataUrl,
  createPlaceholderDataUrl,
} from "./placeholder-image";
import type { PendingScreen } from "./screen-memory";
import {
  cloneKeyframes,
  type Keyframe,
  type MotionTransform,
} from "./scene-motion";
import type { SceneImage } from "./image-objects";
import type { SceneText } from "./text-objects";

/**
 * Enquadramento do conteúdo na tela, sobre o recorte "cover" automático.
 * - `crop*`: fração de cada borda do arquivo a esconder (0 a 0.25), para
 *   molduras gravadas junto — gravações de tela espelhadas costumam trazer uma.
 *   É uma máscara: o conteúdo não muda de tamanho nem de lugar, e a faixa
 *   cortada mostra o `background`.
 * - `zoom`: 0.5 a 3. Abaixo de 1 o conteúdo fica menor que a tela e o resto é
 *   preenchido com `background`, como as faixas cortadas.
 * - `panX`/`panY`: -1 a 1, o deslocamento em frações do tamanho da imagem na
 *   tela (já com o zoom): 0,5 anda meia largura dela, 1 uma largura inteira.
 *   O vão que fica mostra o `background` — dá para compor um print que vaza
 *   da tela. Positivo move o conteúdo para a direita e para cima, em qualquer
 *   zoom.
 *
 *   Já foi a fração da folga (o quanto a imagem passa da tela): num eixo sem
 *   folga — uma imagem quadrada na tela alta do relógio — a posição não movia
 *   nada, e abaixo de 100% de zoom a direção se invertia. O enquadramento não
 *   vai para templates nem links, então mudar a unidade não afeta nada salvo.
 */
export type ScreenFit = {
  background: string;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  panX: number;
  panY: number;
  zoom: number;
};

export const DEFAULT_SCREEN_FIT: ScreenFit = {
  // O branco do fundo da tela no modo Estático.
  background: "#ffffff",
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  cropTop: 0,
  panX: 0,
  panY: 0,
  zoom: 1,
};
export const MIN_SCREEN_ZOOM = 0.5;
export const MAX_SCREEN_ZOOM = 3;
/** Até onde a posição vai: ±1 = uma largura (ou altura) inteira da imagem. */
export const MAX_SCREEN_PAN = 1;
export const MAX_SCREEN_CROP = 0.25;

/**
 * Gravação de tela enviada pelo usuário. Fica como blob URL (não data URL,
 * como a imagem): um vídeo em base64 pesaria dezenas de MB na memória. Não é
 * revogado ao ser trocado — o mesmo vídeo pode estar num objeto duplicado ou
 * na cena do outro modo, e um blob de arquivo só referencia o arquivo em
 * disco, então mantê-lo custa pouco. Como as imagens, não entra em templates.
 */
export type ScreenVideo = {
  durationMs: number;
  /** Enquadramento próprio: imagem e vídeo raramente pedem o mesmo. */
  fit: ScreenFit;
  name: string;
  /** Instante da cena em que o clipe começa, no modo Movimento. */
  startMs: number;
  /**
   * Quanto do arquivo fica de fora no começo e no fim, em ms — o corte feito
   * arrastando as bordas do clipe na timeline. O arquivo não muda.
   */
  trimEndMs: number;
  trimStartMs: number;
  /**
   * Quanto o clipe passa do fim do arquivo, em ms: a borda final arrastada além
   * do último quadro, que fica parado nesse trecho (o "congelar quadro" dos
   * editores de vídeo). Só existe com `trimEndMs` em 0. Ausente = 0.
   */
  holdEndMs?: number;
  url: string;
};

/** Menor clipe que o corte deixa sobrar: abaixo disso some da timeline. */
export const MIN_SCREEN_VIDEO_CLIP_MS = 100;

/**
 * O que um clipe da timeline tem para ser posto e cortado no tempo: o vídeo de
 * uma tela e a música (`SceneAudio`) usam as mesmas contas. Só o vídeo congela
 * o último quadro (`holdEndMs`); a música nunca o tem.
 */
export type TimelineClip = Pick<
  ScreenVideo,
  "durationMs" | "holdEndMs" | "startMs" | "trimEndMs" | "trimStartMs"
>;

/**
 * Quanto o clipe ocupa na cena: o arquivo menos os cortes, mais o último quadro
 * congelado depois do fim (`holdEndMs`).
 */
export function getScreenVideoClipDuration(video: TimelineClip) {
  return Math.max(
    MIN_SCREEN_VIDEO_CLIP_MS,
    video.durationMs -
      (video.trimStartMs ?? 0) -
      (video.trimEndMs ?? 0) +
      (video.holdEndMs ?? 0),
  );
}

export type VideoClipPatch = Partial<
  Pick<ScreenVideo, "holdEndMs" | "startMs" | "trimEndMs" | "trimStartMs">
>;

/**
 * Corta uma borda do clipe, como num editor de vídeo, a partir do clipe como
 * estava no início do arrasto. Na borda do começo o resto do vídeo não sai do
 * lugar: o clipe começa depois na cena na mesma medida em que o arquivo é
 * cortado. Nenhum corte passa do arquivo nem deixa menos que o clipe mínimo,
 * e o começo não vai para antes do zero da cena. A borda do fim pode passar do
 * arquivo: aí o último quadro fica parado (`holdEndMs`).
 */
export function trimVideoClip(
  video: TimelineClip,
  edge: "start" | "end",
  deltaMs: number,
): VideoClipPatch {
  const trimStartMs = video.trimStartMs ?? 0;
  const trimEndMs = video.trimEndMs ?? 0;

  if (edge === "end") {
    const max = video.durationMs - trimStartMs - MIN_SCREEN_VIDEO_CLIP_MS;
    // Uma medida só para a borda final: positiva é o corte do fim do arquivo,
    // negativa é o último quadro congelado depois dele. Puxar para dentro
    // corta; empurrar além do fim do arquivo congela, sem limite.
    const end = Math.min(max, trimEndMs - (video.holdEndMs ?? 0) - deltaMs);

    return { holdEndMs: Math.max(0, -end), trimEndMs: Math.max(0, end) };
  }

  const min = Math.max(0, trimStartMs - video.startMs);
  const max = video.durationMs - trimEndMs - MIN_SCREEN_VIDEO_CLIP_MS;
  const next = Math.min(max, Math.max(min, trimStartMs + deltaMs));

  return {
    startMs: video.startMs + (next - trimStartMs),
    trimStartMs: next,
  };
}

/**
 * Tempo do arquivo num instante da cena, ou `null` fora do clipe. Como num
 * editor de vídeo, o clipe só existe no trecho dele na timeline: antes e
 * depois a tela não mostra o vídeo. O fim é inclusivo — a cena que termina
 * junto com o clipe acaba no último quadro dele, não numa tela vazia.
 */
export function getScreenVideoTime(
  video: TimelineClip,
  sceneTimeMs: number,
): number | null {
  const offset = sceneTimeMs - video.startMs;

  if (offset < 0 || offset > getScreenVideoClipDuration(video)) {
    return null;
  }

  // No trecho congelado, o tempo fica no fim do arquivo: o último quadro.
  return Math.min(
    (video.trimStartMs ?? 0) + offset,
    video.durationMs - (video.trimEndMs ?? 0),
  );
}

/**
 * Se a tela está no último quadro do arquivo — o trecho congelado
 * (`holdEndMs`) ou o instante exato do fim. Ali o vídeo não pode tocar: o
 * `play()` de um `<video>` no fim o faz voltar ao começo, e tocando, a tela
 * piscava entre o primeiro e o último quadro.
 */
export function isScreenVideoAtFileEnd(
  video: ScreenVideo,
  sceneTimeMs: number,
) {
  const timeMs = getScreenVideoTime(video, sceneTimeMs);

  return timeMs !== null && timeMs >= video.durationMs - (video.trimEndMs ?? 0);
}

/** Vídeo que a tela mostra de fato: o enviado, e só se for a fonte escolhida. */
export function getActiveScreenVideo(object: DeviceObject) {
  return object.screenSource === "video" ? object.screenVideo : null;
}

/** As telas de um objeto: a principal e, no dobrável, a de fora. */
export type ScreenId = "main" | "outer";

/**
 * Chave de uma tela no registro de elementos de vídeo (`getScreenVideoElement`)
 * e nas telas escondidas fora do clipe. A principal usa o id do objeto, como
 * sempre usou; a de fora, o id com um sufixo — assim dois vídeos do mesmo
 * objeto nunca dividem o elemento nem a posição no tempo.
 */
export function getScreenVideoKey(objectId: string, screen: ScreenId = "main") {
  return screen === "outer" ? `${objectId}:outer` : objectId;
}

/** O vídeo da tela de fora do dobrável, se for a fonte escolhida nela. */
export function getActiveOuterScreenVideo(object: DeviceObject) {
  return object.outerScreenSource === "video" ? object.outerScreenVideo : null;
}

/** Enquadramento do que a tela de fora mostra agora: o do vídeo ou o da imagem. */
export function getActiveOuterScreenFit(object: DeviceObject): ScreenFit {
  return {
    ...DEFAULT_SCREEN_FIT,
    ...(getActiveOuterScreenVideo(object)?.fit ?? object.outerImageFit),
  };
}

export type ActiveScreenVideo = {
  /** Chave no registro de elementos de vídeo. */
  key: string;
  screen: ScreenId;
  video: ScreenVideo;
};

/**
 * Todos os vídeos que o objeto mostra agora, um por tela: quem posiciona o
 * vídeo no tempo (o canvas, a exportação, a timeline) passa por aqui, e
 * assim vale igual para uma tela ou duas.
 */
export function getActiveScreenVideos(object: SceneObject): ActiveScreenVideo[] {
  // Texto e imagem solta não têm tela, logo nenhum vídeo: quem percorre os objetos da cena
  // (timeline, exportação, controlador) não precisa separar os aparelhos antes.
  if (!isDeviceObject(object)) {
    return [];
  }

  const main = getActiveScreenVideo(object);
  const outer = getActiveOuterScreenVideo(object);

  return [
    ...(main
      ? [{ key: getScreenVideoKey(object.id), screen: "main" as const, video: main }]
      : []),
    ...(outer
      ? [
          {
            key: getScreenVideoKey(object.id, "outer"),
            screen: "outer" as const,
            video: outer,
          },
        ]
      : []),
  ];
}

/**
 * Enquadramento do que a tela mostra agora: o do vídeo ou o da imagem.
 * Completa com os padrões para aceitar enquadramentos de antes dos campos
 * novos (cena ainda na memória durante um hot reload).
 */
export function getActiveScreenFit(object: DeviceObject): ScreenFit {
  return {
    ...DEFAULT_SCREEN_FIT,
    ...(getActiveScreenVideo(object)?.fit ?? object.imageFit),
  };
}

export type DeviceObject = {
  kind: "device";
  colors: Record<string, string>;
  debugMode: boolean;
  debugPartColors: Record<string, string>;
  deletable: boolean;
  deviceTheme: string;
  id: string;
  /** Enquadramento da imagem; volta ao automático quando ela é trocada. */
  imageFit: ScreenFit;
  /**
   * Nome do arquivo enviado, para a linha do arquivo no Inspector — a imagem
   * é guardada como data URL, que não carrega nome. `null` = placeholder.
   */
  imageName: string | null;
  imageUrl: string;
  /**
   * A segunda tela de um dobrável, a de fora: imagem ou vídeo, cada um com o
   * nome e o enquadramento próprios, como na tela principal. `null` =
   * placeholder. Os outros modelos não a usam.
   */
  outerImageFit: ScreenFit;
  outerImageName: string | null;
  outerImageUrl: string | null;
  outerScreenSource: "image" | "video";
  outerScreenVideo: ScreenVideo | null;
  isVisible: boolean;
  /**
   * O que a tela mostra. Imagem e vídeo são guardados lado a lado: trocar de
   * fonte não apaga a outra. Com "video" e sem vídeo enviado, vale a imagem.
   */
  screenSource: "image" | "video";
  screenVideo: ScreenVideo | null;
  /**
   * O que um template guardou de cada tela e ainda espera o arquivo (ver
   * `screen-memory.ts`): a tela pede o arquivo de novo pelo nome e, quando ele
   * chega, aplica o enquadramento e o tempo salvos. Ausente = nada pendente.
   */
  pendingScreen?: PendingScreen | null;
  pendingOuterScreen?: PendingScreen | null;
  /** Vazio = objeto estático. Ver [scene-motion.ts](app/lib/scene-motion.ts). */
  keyframes: Keyframe[];
  modelId: DeviceModelId;
  name: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  /** 0 a 1; em 0 o objeto some da cena (mas continua na lista). */
  opacity: number;
  /** Abertura do dobrável em graus: 180 aberto, 0 fechado. */
  foldAngle: number;
  showDeviceShell: boolean;
  showNotebookKeyboard: boolean;
  showTabletBezel: boolean;
  /**
   * Acabamento fosco, no lugar do polido do arquivo. Só o Duo e o relógio
   * usam (`MODELS_WITH_FINISH`): os materiais deles reagem ao ambiente da
   * cena, então a troca aparece. Nasce ligado, para o aparelho entrar na cena
   * com o visual dos outros.
   */
  matteFinish: boolean;
};

/** O texto de uma cena: o que ele diz e como se vê. Ver `text-objects.ts`. */
export type TextObject = {
  kind: "text";
  deletable: boolean;
  id: string;
  isVisible: boolean;
  keyframes: Keyframe[];
  name: string;
  opacity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
  text: SceneText;
};

/** Uma imagem solta (PNG, SVG): um plano na cena. Ver `image-objects.ts`. */
export type ImageObject = {
  kind: "image";
  deletable: boolean;
  id: string;
  image: SceneImage;
  isVisible: boolean;
  keyframes: Keyframe[];
  name: string;
  opacity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
};

/**
 * A câmera da cena, na lista como um objeto que não se apaga. Não tem malha: o
 * que ela tem são os keyframes (a órbita em `transform.orbit`), e a pose abaixo
 * é só para ela caber onde o resto trata um objeto qualquer — fica sempre nos
 * zeros. Ver `camera-objects.ts`.
 */
export type CameraObject = {
  kind: "camera";
  deletable: false;
  id: string;
  isVisible: boolean;
  keyframes: Keyframe[];
  name: string;
  opacity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
};

/**
 * O fundo da cena, na lista como um objeto que não se apaga, logo abaixo da
 * câmera. Como ela, não tem malha: o que tem são os keyframes (o fundo de cada
 * instante em `transform.background`), e a pose abaixo fica sempre nos zeros.
 * Sem keyframes, vale o fundo da cena (o do painel Fundo e grade). Ver
 * `background-objects.ts`.
 */
export type BackgroundObject = Omit<CameraObject, "kind"> & { kind: "background" };

/**
 * A música do Vídeo, um arquivo de áudio enviado. Como o vídeo das telas, fica
 * como blob URL e não vai para o template; é um clipe na timeline, posto e
 * cortado do mesmo jeito (`TimelineClip`). Cortar o começo faz a música tocar a
 * partir dali. Ver `audio-objects.ts`.
 */
export type SceneAudio = {
  durationMs: number;
  /** Quanto o som leva para subir no começo do clipe e descer no fim, em ms. */
  fadeInMs: number;
  fadeOutMs: number;
  name: string;
  /** Instante da cena em que o clipe começa. */
  startMs: number;
  trimEndMs: number;
  trimStartMs: number;
  url: string;
  /** 0 a 1. */
  volume: number;
};

/** O que um template lembra da música: tudo, menos o arquivo. */
export type AudioSettings = Omit<SceneAudio, "url">;

/**
 * A música da cena, na lista como um objeto (só no Vídeo, uma por cena). Não
 * tem malha nem keyframes: a pose abaixo é só para caber onde o resto trata um
 * objeto qualquer, e fica nos zeros. `isVisible` em falso é a música muda.
 */
export type AudioObject = {
  kind: "audio";
  /** `null` enquanto espera o arquivo que um template pediu (`pendingAudio`). */
  audio: SceneAudio | null;
  deletable: boolean;
  id: string;
  isVisible: boolean;
  keyframes: Keyframe[];
  name: string;
  opacity: number;
  /** O que veio de um template e espera o arquivo; ausente = nada pendente. */
  pendingAudio?: AudioSettings | null;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
};

export type SceneObject =
  | DeviceObject
  | TextObject
  | ImageObject
  | CameraObject
  | BackgroundObject
  | AudioObject;

/** A pose editável de um objeto: a do texto é a mesma, menos a abertura. */
export type PosePatch = Partial<
  Pick<
    DeviceObject,
    | "foldAngle"
    | "opacity"
    | "positionX"
    | "positionY"
    | "positionZ"
    | "rotationX"
    | "rotationY"
    | "rotationZ"
    | "scale"
  >
> &
  // Estilo do texto que anima por keyframe (só o texto os tem).
  Partial<Pick<MotionTransform, "letterSpacing" | "textColor">>;

export function isDeviceObject(object: SceneObject): object is DeviceObject {
  return object.kind === "device";
}

export function isTextObject(object: SceneObject): object is TextObject {
  return object.kind === "text";
}

export function isImageObject(object: SceneObject): object is ImageObject {
  return object.kind === "image";
}

export function isCameraObject(object: SceneObject): object is CameraObject {
  return object.kind === "camera";
}

export function isBackgroundObject(object: SceneObject): object is BackgroundObject {
  return object.kind === "background";
}

export function isAudioObject(object: SceneObject): object is AudioObject {
  return object.kind === "audio";
}

/**
 * O que está na lista mas não se desenha: a câmera, o Fundo e a música. Não
 * entram na cena 3D nem na conta dos objetos carregados.
 */
export function isUndrawnObject(object: SceneObject) {
  return isCameraObject(object) || isBackgroundObject(object) || isAudioObject(object);
}

// Placeholders são gerados em runtime (canvas) no tamanho de upload
// recomendado de cada modelo — não há mais PNGs estáticos em public/.
const MODEL_PLACEHOLDER_SIZES: Record<DeviceModelId, [number, number]> = {
  smartphone: [1290, 2748],
  smartphone2: [1290, 2748],
  smartphone3: [1290, 2755],
  smartwatch: [1290, 1452],
  notebook: [2755, 1684],
  tablet: [1668, 2388],
  // A tela de dentro, deitada: é a principal do dobrável.
  duo: [2670, 1878],
};

/** A tela de fora do Duo, em pé. */
export const DUO_OUTER_SCREEN_SIZE: [number, number] = [1398, 2034];

// Fração da altura usada como fonte no placeholder. O padrão (0.042) deixa o
// texto uniforme na maioria dos modelos; smartwatch e notebook têm a tela
// ocupando menos do enquadramento, então recebem um valor maior para o texto
// renderizado aparecer no mesmo tamanho visual.
const DEFAULT_PLACEHOLDER_FONT_SCALE = 0.042;
const MODEL_PLACEHOLDER_FONT_SCALE: Partial<Record<DeviceModelId, number>> = {
  smartwatch: 0.098,
  notebook: 0.066,
  duo: 0.06,
};

// Sentinel usado quando o canvas 2D não está disponível (SSR/jsdom); no
// browser a textura nunca vê esse valor porque o cache é preenchido no client.
const PLACEHOLDER_URL_PREFIX = "placeholder://";

const placeholderUrlCache = new Map<DeviceModelId, string>();

const SPAWN_GAP_WORLD_X = 28;

export function getPlaceholderImageUrl(modelId: DeviceModelId = "smartphone") {
  const cached = placeholderUrlCache.get(modelId);
  if (cached) {
    return cached;
  }

  const [width, height] = MODEL_PLACEHOLDER_SIZES[modelId];
  const fontScale =
    MODEL_PLACEHOLDER_FONT_SCALE[modelId] ?? DEFAULT_PLACEHOLDER_FONT_SCALE;
  const url =
    createPlaceholderDataUrl(width, height, fontScale) ??
    `${PLACEHOLDER_URL_PREFIX}${modelId}`;

  placeholderUrlCache.set(modelId, url);
  return url;
}

let duoOuterPlaceholderUrl: string | null = null;

/** Placeholder da tela de fora do Duo, no tamanho recomendado dela. */
export function getDuoOuterPlaceholderImageUrl() {
  duoOuterPlaceholderUrl ??=
    createPlaceholderDataUrl(...DUO_OUTER_SCREEN_SIZE, 0.05) ??
    `${PLACEHOLDER_URL_PREFIX}duo-outer`;

  return duoOuterPlaceholderUrl;
}

const missingScreenUrlCache = new Map<string, string>();

/**
 * A tela que pede o arquivo de volta (ver `createMissingScreenDataUrl`), no
 * tamanho da tela do modelo — ou da de fora do Duo. Guardada por texto: a
 * mesma URL a cada render, para a textura não ser refeita.
 */
export function getMissingScreenImageUrl(
  screen: DeviceModelId | "duo-outer",
  title: string,
  hint: string,
) {
  const key = `${screen}\n${title}\n${hint}`;
  const cached = missingScreenUrlCache.get(key);

  if (cached) {
    return cached;
  }

  const [width, height] =
    screen === "duo-outer" ? DUO_OUTER_SCREEN_SIZE : MODEL_PLACEHOLDER_SIZES[screen];
  const fontScale =
    screen === "duo-outer"
      ? 0.05
      : (MODEL_PLACEHOLDER_FONT_SCALE[screen] ?? DEFAULT_PLACEHOLDER_FONT_SCALE);
  const url =
    createMissingScreenDataUrl(width, height, fontScale, title, hint) ??
    (screen === "duo-outer"
      ? getDuoOuterPlaceholderImageUrl()
      : getPlaceholderImageUrl(screen));

  missingScreenUrlCache.set(key, url);
  return url;
}

export function isPlaceholderImageUrl(imageUrl: string) {
  if (imageUrl.startsWith(PLACEHOLDER_URL_PREFIX)) {
    return true;
  }

  return [...placeholderUrlCache.values()].includes(imageUrl);
}

function hasSameModelAtTransform(
  object: SceneObject,
  modelId: DeviceModelId,
  positionY: number,
  positionZ: number,
) {
  return (
    isDeviceObject(object) &&
    object.modelId === modelId &&
    object.positionY === positionY &&
    object.positionZ === positionZ
  );
}

function isOnTransformPlane(
  object: SceneObject,
  positionY: number,
  positionZ: number,
) {
  return object.positionY === positionY && object.positionZ === positionZ;
}

function getNormalizedSpawnWidth(modelId: DeviceModelId, scale = 1) {
  return (DEVICE_MODELS[modelId].spawnFootprintWidth * scale) / OBJECT_POSITION_MULTIPLIER;
}

function getOffsetSpawnTransformForPlane(
  objects: SceneObject[],
  modelId: DeviceModelId,
  positionY: number,
  positionZ: number,
  scale = 1,
) {
  const objectsOnPlane = objects.filter(
    (object): object is DeviceObject =>
      isDeviceObject(object) &&
      hasSameModelAtTransform(object, modelId, positionY, positionZ),
  );

  if (objectsOnPlane.length === 0) {
    return {
      positionX: DEFAULT_OBJECT_TRANSFORM.positionX,
      positionY,
      positionZ,
    };
  }

  const nextWidth = getNormalizedSpawnWidth(modelId, scale);
  const gapX = SPAWN_GAP_WORLD_X / OBJECT_POSITION_MULTIPLIER;
  const rightmostEdge = Math.max(
    ...objectsOnPlane.map(
      (object) =>
        object.positionX + getNormalizedSpawnWidth(object.modelId, object.scale) / 2,
    ),
  );

  return {
    positionX: rightmostEdge + nextWidth / 2 + gapX,
    positionY,
    positionZ,
  };
}

export function getSequentialSpawnTransform(
  objects: SceneObject[],
  modelId: DeviceModelId,
  scale = 1,
) {
  const { positionY, positionZ } = DEFAULT_OBJECT_TRANSFORM;
  // Só os aparelhos entram na conta: o texto não tem a largura de um modelo.
  const objectsOnPlane = objects.filter(
    (object): object is DeviceObject =>
      isDeviceObject(object) && isOnTransformPlane(object, positionY, positionZ),
  );

  if (objectsOnPlane.length === 0) {
    return {
      positionX: DEFAULT_OBJECT_TRANSFORM.positionX,
      positionY,
      positionZ,
    };
  }

  const nextWidth = getNormalizedSpawnWidth(modelId, scale);
  const gapX = SPAWN_GAP_WORLD_X / OBJECT_POSITION_MULTIPLIER;
  const rightmostEdge = Math.max(
    ...objectsOnPlane.map(
      (object) =>
        object.positionX + getNormalizedSpawnWidth(object.modelId, object.scale) / 2,
    ),
  );

  return {
    positionX: rightmostEdge + nextWidth / 2 + gapX,
    positionY,
    positionZ,
  };
}

export function getOffsetSpawnTransform(
  objects: SceneObject[],
  modelId: DeviceModelId,
) {
  const { positionY, positionZ } = DEFAULT_OBJECT_TRANSFORM;
  return getOffsetSpawnTransformForPlane(objects, modelId, positionY, positionZ);
}

export function createSceneObject({
  deletable = true,
  id,
  modelId = "smartphone",
  name,
}: {
  deletable?: boolean;
  id?: string;
  modelId?: DeviceModelId;
  name: string;
}): DeviceObject {
  const model = DEVICE_MODELS[modelId];

  return {
    kind: "device",
    colors: { ...(model.themes[model.defaultTheme] ?? {}) },
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deletable,
    deviceTheme: model.defaultTheme,
    id: id ?? crypto.randomUUID(),
    imageFit: { ...DEFAULT_SCREEN_FIT },
    imageName: null,
    imageUrl: getPlaceholderImageUrl(modelId),
    outerImageFit: { ...DEFAULT_SCREEN_FIT },
    outerImageName: null,
    outerImageUrl: null,
    outerScreenSource: "image",
    outerScreenVideo: null,
    isVisible: true,
    screenSource: "image",
    screenVideo: null,
    keyframes: [],
    modelId,
    name,
    ...DEFAULT_OBJECT_TRANSFORM,
    showDeviceShell: true,
    showNotebookKeyboard: true,
    showTabletBezel: true,
    matteFinish: true,
  };
}

export function duplicateSceneObject({
  id,
  name,
  objects,
  source,
}: {
  id?: string;
  name: string;
  objects: SceneObject[];
  source: DeviceObject;
}): DeviceObject {
  const spawnTransform = getOffsetSpawnTransformForPlane(
    objects,
    source.modelId,
    source.positionY,
    source.positionZ,
    source.scale,
  );

  return {
    ...source,
    deletable: true,
    id: id ?? crypto.randomUUID(),
    // Ids de keyframe precisam ser únicos na cena: a seleção da timeline os
    // procura sem saber de qual objeto são.
    keyframes: cloneKeyframes(source.keyframes),
    name,
    ...spawnTransform,
  };
}

/** Se o objeto já está na pose padrão — aí o reset não teria o que fazer. */
export function isDefaultObjectTransform(object: DeviceObject) {
  return (
    Object.keys(DEFAULT_OBJECT_TRANSFORM) as (keyof typeof DEFAULT_OBJECT_TRANSFORM)[]
  ).every((key) => object[key] === DEFAULT_OBJECT_TRANSFORM[key]);
}

export function resetSceneObject(object: DeviceObject): DeviceObject {
  return {
    ...object,
    ...DEFAULT_OBJECT_TRANSFORM,
  };
}

/**
 * Próximo nome sequencial livre (`${prefix} 1`, `${prefix} 2`, ...) usando
 * `max + 1` sobre os objetos atuais da cena (como Figma e After Effects).
 * Chamado dentro do updater funcional do estado, evita nomes repetidos tanto ao
 * adicionar rápido quanto depois de apagar um objeto, sem preencher lacunas no
 * fim da lista.
 */
export function getNextSequentialName(
  objects: readonly Pick<SceneObject, "name">[],
  prefix: string,
): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped} (\\d+)$`);
  let max = 0;

  for (const object of objects) {
    const match = pattern.exec(object.name);
    if (match) {
      const n = Number(match[1]);
      if (n > max) {
        max = n;
      }
    }
  }

  return `${prefix} ${max + 1}`;
}

export function changeSceneObjectModel(
  object: DeviceObject,
  modelId: DeviceModelId,
): DeviceObject {
  const model = DEVICE_MODELS[modelId];

  return {
    ...object,
    colors: { ...(model.themes[model.defaultTheme] ?? {}) },
    debugMode: false,
    debugPartColors: { ...model.initialDebugColors },
    deviceTheme: model.defaultTheme,
    imageFit: { ...DEFAULT_SCREEN_FIT },
    imageName: null,
    imageUrl: getPlaceholderImageUrl(modelId),
    outerImageFit: { ...DEFAULT_SCREEN_FIT },
    outerImageName: null,
    outerImageUrl: null,
    outerScreenSource: "image",
    outerScreenVideo: null,
    modelId,
    screenSource: "image",
    screenVideo: null,
    showDeviceShell: true,
    showNotebookKeyboard: true,
    showTabletBezel: true,
    matteFinish: true,
  };
}
