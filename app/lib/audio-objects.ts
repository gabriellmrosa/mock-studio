import {
  MIN_SCREEN_VIDEO_CLIP_MS,
  getScreenVideoClipDuration,
  getScreenVideoTime,
  isAudioObject,
  trimVideoClip,
  type AudioObject,
  type AudioSettings,
  type SceneAudio,
  type SceneObject,
} from "./scene-objects";

/**
 * A música do Vídeo (`AudioObject`): uma por cena, um clipe na timeline com a
 * forma de onda. É posta e cortada como o vídeo das telas — as mesmas contas,
 * menos o último quadro parado, que no som não existe. A duração da cena não
 * vem dela: o vídeo dura o que os keyframes e os clipes de vídeo mandam, e a
 * música é cortada no fim (decisão do usuário).
 */

/** O seletor de arquivos da música: os formatos que os navegadores tocam. */
export const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,.mp3,.m4a,.aac,.wav";

export const MAX_AUDIO_VOLUME = 1;

export function createAudioObject({
  audio,
  name,
}: {
  /** `null` quando volta de um template, esperando o arquivo. */
  audio: SceneAudio | null;
  name: string;
}): AudioObject {
  return {
    kind: "audio",
    audio,
    deletable: true,
    id: crypto.randomUUID(),
    isVisible: true,
    keyframes: [],
    name,
    opacity: 1,
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 1,
  };
}

/** Um arquivo que acabou de chegar: inteiro, no começo da cena, no volume cheio e sem fades. */
export function createSceneAudio({
  durationMs,
  name,
  url,
}: Pick<SceneAudio, "durationMs" | "name" | "url">): SceneAudio {
  return {
    durationMs,
    fadeInMs: 0,
    fadeOutMs: 0,
    name,
    startMs: 0,
    trimEndMs: 0,
    trimStartMs: 0,
    url,
    volume: 1,
  };
}

/** Quanto o clipe ocupa na cena: o arquivo menos os cortes. */
export function getAudioClipDuration(audio: SceneAudio | AudioSettings) {
  return getScreenVideoClipDuration(audio);
}

/** Tempo do arquivo num instante da cena, ou `null` fora do clipe. */
export function getAudioTime(audio: SceneAudio, sceneTimeMs: number) {
  return getScreenVideoTime(audio, sceneTimeMs);
}

/**
 * O volume num instante da cena: o do clipe, subindo no fade-in e descendo no
 * fade-out, em linha reta. Fora do clipe, 0. Os fades nunca passam do clipe: se
 * os dois juntos não cabem, cada um vale até onde o outro deixa.
 */
export function getAudioGain(audio: SceneAudio, sceneTimeMs: number) {
  if (getAudioTime(audio, sceneTimeMs) === null) {
    return 0;
  }

  const offset = sceneTimeMs - audio.startMs;
  const remaining = getAudioClipDuration(audio) - offset;
  const fadeIn = audio.fadeInMs > 0 ? offset / audio.fadeInMs : 1;
  const fadeOut = audio.fadeOutMs > 0 ? remaining / audio.fadeOutMs : 1;

  return audio.volume * Math.max(0, Math.min(1, fadeIn, fadeOut));
}

export type AudioClipPatch = Partial<
  Pick<SceneAudio, "startMs" | "trimEndMs" | "trimStartMs">
>;

/**
 * Corta uma borda do clipe, a partir de como ele estava no começo do arrasto.
 * As contas são as do vídeo (`trimVideoClip`); a borda do fim não passa do
 * arquivo, porque no som não há último quadro para congelar.
 */
export function trimAudioClip(
  audio: SceneAudio,
  edge: "start" | "end",
  deltaMs: number,
): AudioClipPatch {
  const patch = trimVideoClip(audio, edge, deltaMs);

  return edge === "end"
    ? { trimEndMs: patch.trimEndMs ?? 0 }
    : { startMs: patch.startMs, trimStartMs: patch.trimStartMs };
}

/** Os fades dentro do clipe: cada um, no máximo, o clipe inteiro. */
export function clampAudioFades(audio: SceneAudio): SceneAudio {
  const duration = getAudioClipDuration(audio);

  return {
    ...audio,
    fadeInMs: Math.min(Math.max(0, audio.fadeInMs), duration),
    fadeOutMs: Math.min(Math.max(0, audio.fadeOutMs), duration),
  };
}

/** O que vai para o template: tudo, menos o arquivo. */
export function toAudioSettings(audio: SceneAudio): AudioSettings {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { url, ...settings } = audio;

  return settings;
}

/**
 * O arquivo que acabou de chegar. Com o que um template guardou (`pending`), ele
 * volta com o lugar, os cortes, o volume e os fades de então — e os cortes
 * encolhem se o arquivo for mais curto, como no vídeo. Trocando um arquivo que
 * já estava, ficam o lugar, o volume e os fades; os cortes eram do outro.
 */
export function applyAudioFile(
  arrived: Pick<SceneAudio, "durationMs" | "name" | "url">,
  previous: SceneAudio | AudioSettings | null | undefined,
  isPending: boolean,
): SceneAudio {
  const audio = createSceneAudio(arrived);

  if (!previous) {
    return audio;
  }

  const room = Math.max(0, audio.durationMs - MIN_SCREEN_VIDEO_CLIP_MS);
  const trimStartMs = isPending ? Math.min(previous.trimStartMs, room) : 0;
  const trimEndMs = isPending
    ? Math.min(previous.trimEndMs, room - trimStartMs)
    : 0;

  return clampAudioFades({
    ...audio,
    fadeInMs: previous.fadeInMs,
    fadeOutMs: previous.fadeOutMs,
    startMs: previous.startMs,
    trimEndMs,
    trimStartMs,
    volume: previous.volume,
  });
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(max, Math.max(min, number));
}

/**
 * Leitura defensiva do que um template ou link guardou da música: sem nome não
 * há o que pedir de volta (`null`); os números voltam para os limites.
 */
export function normalizeAudioSettings(value: unknown): AudioSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const audio = value as Record<string, unknown>;
  const name =
    typeof audio.name === "string" && audio.name.trim()
      ? audio.name.trim().slice(0, 200)
      : null;

  if (!name) {
    return null;
  }

  const max = Number.MAX_SAFE_INTEGER;

  return {
    durationMs: clamp(audio.durationMs, 0, max, 0),
    fadeInMs: clamp(audio.fadeInMs, 0, max, 0),
    fadeOutMs: clamp(audio.fadeOutMs, 0, max, 0),
    name,
    startMs: clamp(audio.startMs, 0, max, 0),
    trimEndMs: clamp(audio.trimEndMs, 0, max, 0),
    trimStartMs: clamp(audio.trimStartMs, 0, max, 0),
    volume: clamp(audio.volume, 0, MAX_AUDIO_VOLUME, 1),
  };
}

/** As músicas com arquivo: as que a timeline desenha e o play toca. */
export function getSceneAudios(
  objects: SceneObject[],
): Array<AudioObject & { audio: SceneAudio }> {
  return objects.filter(
    (object): object is AudioObject & { audio: SceneAudio } =>
      isAudioObject(object) && object.audio !== null,
  );
}
