"use client";

import {
  getAudibleAudios,
  getAudioGain,
  getAudioTime,
  mixSceneAudio,
} from "./audio-objects";
import type { AudioObject, SceneAudio, SceneObject } from "./scene-objects";

/**
 * O lado do navegador da música: ler o arquivo, guardar a forma de onda e tocar
 * no play. A forma de onda e o `<audio>` ficam aqui, guardados pelo blob URL,
 * fora do estado do React e do template: são derivados do arquivo, que também
 * não entra em template. Como os blobs dos vídeos, nada é liberado — desfazer a
 * remoção da música precisa do arquivo de volta.
 */

/** Quantos picos por segundo a forma de onda guarda: um a cada 20 ms. */
export const WAVEFORM_PEAKS_PER_SECOND = 50;

/**
 * Maior arquivo aceito. Para desenhar a forma de onda o áudio é decodificado
 * inteiro na memória (uns 10 MB por minuto em estéreo): um arquivo enorme
 * travaria a aba.
 */
export const MAX_AUDIO_FILE_BYTES = 100 * 1024 * 1024;

/** O quanto o som pode escorregar do relógio da cena antes de ser corrigido. */
const AUDIO_DRIFT_TOLERANCE_S = 0.2;

const peaksByUrl = new Map<string, Float32Array>();
const elementsByUrl = new Map<string, HTMLAudioElement>();

/**
 * A forma de onda: o pico (0 a 1) de cada trecho de `1 / peaksPerSecond`
 * segundo, o maior entre os canais.
 */
export function computeWaveformPeaks(
  channels: Float32Array[],
  sampleRate: number,
  peaksPerSecond = WAVEFORM_PEAKS_PER_SECOND,
) {
  const length = channels[0]?.length ?? 0;
  const bucket = Math.max(1, Math.round(sampleRate / peaksPerSecond));
  const peaks = new Float32Array(Math.ceil(length / bucket));

  for (let index = 0; index < peaks.length; index += 1) {
    const end = Math.min(length, (index + 1) * bucket);
    let peak = 0;

    for (const channel of channels) {
      for (let sample = index * bucket; sample < end; sample += 1) {
        const value = Math.abs(channel[sample]);

        if (value > peak) {
          peak = value;
        }
      }
    }

    peaks[index] = Math.min(1, peak);
  }

  return peaks;
}

/**
 * Lê um arquivo de áudio enviado: a duração exata e a forma de onda saem da
 * decodificação (que também prova que o navegador sabe tocar o formato). Lança
 * um erro se o arquivo for grande demais ou não for áudio.
 */
export async function readAudioFile(
  file: File,
): Promise<Pick<SceneAudio, "durationMs" | "name" | "url">> {
  if (file.size > MAX_AUDIO_FILE_BYTES) {
    throw new Error("Arquivo de áudio grande demais.");
  }

  // Um contexto offline decodifica sem tocar nada: não esbarra na regra de
  // autoplay e não abre a saída de som.
  const context = new OfflineAudioContext(1, 1, 44_100);
  const decoded = await context.decodeAudioData(await file.arrayBuffer());
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) =>
    decoded.getChannelData(index),
  );
  const url = URL.createObjectURL(file);

  peaksByUrl.set(url, computeWaveformPeaks(channels, decoded.sampleRate));

  return {
    durationMs: Math.round(decoded.duration * 1000),
    name: file.name,
    url,
  };
}

export function getAudioPeaks(url: string) {
  return peaksByUrl.get(url) ?? null;
}

function getAudioElement(url: string) {
  let element = elementsByUrl.get(url);

  if (!element) {
    element = new Audio(url);
    element.preload = "auto";
    elementsByUrl.set(url, element);
  }

  return element;
}

/**
 * O que a música deve fazer num instante da cena tocando: calar (fora do clipe,
 * ou muda) ou tocar, de onde e em que volume.
 */
export function getAudioPlayback(
  object: AudioObject & { audio: SceneAudio },
  sceneTimeMs: number,
  sceneDurationMs?: number,
): { gain: number; timeS: number } | null {
  const timeMs = getAudioTime(object.audio, sceneTimeMs);

  if (timeMs === null || !object.isVisible) {
    return null;
  }

  return {
    gain: getAudioGain(object.audio, sceneTimeMs, sceneDurationMs),
    timeS: timeMs / 1000,
  };
}

/**
 * Um quadro do play: cada música no tempo do relógio da cena, com o volume
 * dele. Só corrige a posição quando escorrega demais — um seek a cada quadro
 * picotaria o som. O que não está tocando (fora do clipe, removido) para.
 */
export function syncAudioPlayback(
  objects: Array<AudioObject & { audio: SceneAudio }>,
  sceneTimeMs: number,
  sceneDurationMs: number,
) {
  const playingUrls = new Set<string>();

  for (const object of objects) {
    const playback = getAudioPlayback(object, sceneTimeMs, sceneDurationMs);

    if (!playback) {
      continue;
    }

    const element = getAudioElement(object.audio.url);

    playingUrls.add(object.audio.url);
    element.volume = Math.min(1, Math.max(0, playback.gain));

    if (element.paused) {
      element.currentTime = playback.timeS;
      void element.play().catch(() => undefined);
    } else if (
      Math.abs(element.currentTime - playback.timeS) > AUDIO_DRIFT_TOLERANCE_S
    ) {
      element.currentTime = playback.timeS;
    }
  }

  for (const [url, element] of elementsByUrl) {
    if (!playingUrls.has(url) && !element.paused) {
      element.pause();
    }
  }
}

/** Fim do play: toda música para. */
export function stopAudioPlayback() {
  for (const element of elementsByUrl.values()) {
    if (!element.paused) {
      element.pause();
    }
  }
}

/** A taxa do áudio exportado: a do Opus (WebM), que o AAC (MP4) também aceita. */
export const EXPORT_AUDIO_SAMPLE_RATE = 48_000;
export const EXPORT_AUDIO_CHANNELS = 2;

/**
 * O áudio do vídeo exportado: as músicas que se ouvem, decodificadas de novo já
 * na taxa da exportação (o navegador reamostra) e misturadas por tempo, sem
 * tocar nada — sai igual por mais lenta que seja a exportação. `lengthMs` é o
 * tamanho da trilha (o do vídeo, que vai um quadro além da cena); o fade do fim
 * é o da cena. `null` quando não há o que se ouvir.
 */
export async function renderSceneAudio({
  lengthMs,
  objects,
  sceneDurationMs,
}: {
  lengthMs: number;
  objects: SceneObject[];
  sceneDurationMs: number;
}) {
  const audibles = getAudibleAudios(objects, sceneDurationMs);

  if (audibles.length === 0) {
    return null;
  }

  const context = new OfflineAudioContext(
    EXPORT_AUDIO_CHANNELS,
    1,
    EXPORT_AUDIO_SAMPLE_RATE,
  );
  const tracks = await Promise.all(
    audibles.map(async ({ audio }) => {
      const file = await (await fetch(audio.url)).arrayBuffer();
      const decoded = await context.decodeAudioData(file);

      return {
        audio,
        channels: Array.from({ length: decoded.numberOfChannels }, (_, index) =>
          decoded.getChannelData(index),
        ),
      };
    }),
  );

  return mixSceneAudio({
    length: Math.ceil((lengthMs / 1000) * EXPORT_AUDIO_SAMPLE_RATE),
    numberOfChannels: EXPORT_AUDIO_CHANNELS,
    sampleRate: EXPORT_AUDIO_SAMPLE_RATE,
    sceneDurationMs,
    tracks,
  });
}
