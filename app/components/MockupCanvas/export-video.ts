"use client";

import * as THREE from "three";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  getActiveScreenVideos,
  getScreenVideoTime,
  type SceneObject,
} from "../../lib/scene-objects";
import {
  getScreenVideoElement,
  setScreenVideoShown,
} from "../../lib/screen-texture";
import {
  getVideoExportFormat,
  type VideoExportSettings,
} from "../../lib/video-export";
import {
  isGradientLook,
  paintBackgroundLook,
  type BackgroundLook,
} from "../../lib/canvas-background";
import { seekVideo } from "../../lib/video-seek";
import {
  EXPORT_AUDIO_CHANNELS,
  EXPORT_AUDIO_SAMPLE_RATE,
} from "../../lib/audio-files";
import { hideEditorOnlyObjects } from "./editor-only";
import { flipPixelRows, getSupersampleScale } from "./export-photo";

/**
 * Exportação de vídeo quadro a quadro. Nada aqui depende do relógio nem do
 * requestAnimationFrame: cada quadro posiciona a cena no seu instante, leva os
 * vídeos das telas ao quadro exato e só então renderiza. Um computador lento
 * demora mais, mas não perde quadros — e a aba pode ficar em segundo plano
 * (se o navegador suspender o vídeo de uma tela, `seekVideo` espera a aba
 * voltar em vez de falhar).
 */

export type VideoFrameRendererDeps = {
  /** Um quadro do R3F sob demanda: roda os useFrame (compositor das telas). */
  advance: (timestamp: number) => void;
  /** Põe cada objeto na pose de um instante da cena. */
  applyPoses: (timeMs: number) => void | Promise<void>;
  camera: THREE.Camera;
  gl: THREE.WebGLRenderer;
  gridRef: { current: { visible: boolean } | null };
  /** Os objetos exportados (os de quando a exportação começou). */
  objects: () => SceneObject[];
  /** Devolve a cena ao que o editor mostrava antes. */
  restore: () => void;
  scene: THREE.Scene;
};

export type VideoFrameRenderer = {
  /** O quadro pronto, no tamanho do arquivo. */
  canvas: OffscreenCanvas;
  end: () => void;
  render: (timeMs: number) => Promise<void>;
};

/**
 * Prepara a renderização: render target com superamostragem e buffers
 * reaproveitados entre quadros (alocar 30 MB por quadro em 4K travaria o GC).
 */
export function createVideoFrameRenderer(
  deps: VideoFrameRendererDeps,
  size: MotionFrame,
  /**
   * O fundo de cada instante (o Fundo pode animar), ou `null` para
   * transparente. A grade de cada quadro já vem posta por `applyPoses`.
   */
  getBackground: ((timeMs: number) => BackgroundLook) | null,
): VideoFrameRenderer {
  const { advance, applyPoses, camera, gl, gridRef, objects, restore, scene } =
    deps;
  const scale = getSupersampleScale(gl, size.width, size.height);
  const renderWidth = size.width * scale;
  const renderHeight = size.height * scale;
  const target = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  target.samples = gl.capabilities.isWebGL2 ? 8 : 0;
  target.texture.colorSpace = gl.outputColorSpace;

  const pixels = new Uint8Array(renderWidth * renderHeight * 4);
  const full = new OffscreenCanvas(renderWidth, renderHeight);
  const fullContext = full.getContext("2d")!;
  const fullImage = fullContext.createImageData(renderWidth, renderHeight);
  const canvas = new OffscreenCanvas(size.width, size.height);
  const context = canvas.getContext("2d")!;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const previousAspect =
    camera instanceof THREE.PerspectiveCamera ? camera.aspect : null;
  const previousGridVisible = gridRef.current?.visible ?? true;
  const previousBackground = scene.background;

  for (const { key } of objects().flatMap(getActiveScreenVideos)) {
    getScreenVideoElement(key)?.pause();
  }

  return {
    canvas,

    async render(timeMs) {
      // Primeiro os vídeos das telas, que levam tempo. Durante essa espera o
      // React pode atualizar o canvas (o progresso muda a cada quadro) e
      // reaplicar a pose do instante parado na timeline; por isso a pose do
      // quadro vem depois, e daí até o render nada mais espera.
      await Promise.all(
        objects().flatMap(getActiveScreenVideos).map(({ key, video }) => {
          const element = getScreenVideoElement(key);

          if (!element) {
            return undefined;
          }

          const sourceMs = getScreenVideoTime(video, timeMs);

          // Como no editor: fora do clipe, a tela só com o fundo.
          setScreenVideoShown(key, sourceMs !== null);

          if (sourceMs === null) {
            return undefined;
          }

          // Como no editor: o último quadro fica um pouco antes do fim.
          const ms = Math.min(sourceMs, video.durationMs - 20);

          return seekVideo(element, ms / 1000);
        }),
      );

      // O texto recompõe quando o espaço entre letras muda (num worker): o
      // quadro só sai depois, ou sairia com o espaço do quadro anterior.
      await applyPoses(timeMs);

      // O `seeked` marca a textura do vídeo para atualizar; este quadro do R3F
      // roda o compositor, que redesenha a tela antes do render abaixo.
      advance(performance.now());

      const previousClearColor = gl.getClearColor(new THREE.Color()).clone();
      const previousClearAlpha = gl.getClearAlpha();
      const previousTarget = gl.getRenderTarget();

      // Uma cor lisa é a de limpeza do próprio render; um degradê é pintado
      // por baixo da cena (transparente) na hora de compor o quadro, como o
      // editor faz com o CSS atrás do canvas.
      const look = getBackground?.(timeMs) ?? null;
      const gradientLook = look && isGradientLook(look) ? look : null;

      if (look && !gradientLook) {
        gl.setClearColor(new THREE.Color(look.color), 1);
      } else {
        gl.setClearColor(previousClearColor, 0);
      }

      scene.background = null;

      // Como no PNG: o grid do chão só entra com fundo. Com fundo, ele já está
      // como o instante pede (`applyPoses` o pôs: cores e visibilidade).
      if (gridRef.current && !look) {
        gridRef.current.visible = false;
      }

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
      }

      gl.setRenderTarget(target);

      // O espaço vazio de uma imagem sem arquivo é do editor: não sai no vídeo.
      const showEditorOnly = hideEditorOnlyObjects(scene);

      try {
        gl.render(scene, camera);
      } finally {
        showEditorOnly();
      }

      gl.readRenderTargetPixels(target, 0, 0, renderWidth, renderHeight, pixels);
      gl.setRenderTarget(previousTarget);
      gl.setClearColor(previousClearColor, previousClearAlpha);

      flipPixelRows(pixels, renderWidth, renderHeight, fullImage.data);
      fullContext.putImageData(fullImage, 0, 0);
      context.clearRect(0, 0, size.width, size.height);

      if (gradientLook) {
        paintBackgroundLook(context, size.width, size.height, gradientLook);
      }

      context.drawImage(full, 0, 0, size.width, size.height);
    },

    end() {
      target.dispose();
      scene.background = previousBackground;

      if (gridRef.current) {
        gridRef.current.visible = previousGridVisible;
      }

      if (camera instanceof THREE.PerspectiveCamera && previousAspect !== null) {
        camera.aspect = previousAspect;
        camera.updateProjectionMatrix();
      }

      restore();
    },
  };
}

export class VideoExportCanceledError extends Error {
  constructor() {
    super("Exportação de vídeo cancelada.");
    this.name = "VideoExportCanceledError";
  }
}

const CODECS = { mp4: "avc", webm: "vp9" } as const;
/** O áudio de cada formato: AAC no MP4, Opus no WebM (inclusive transparente). */
const AUDIO_CODECS = { mp4: "aac", webm: "opus" } as const;

/**
 * Se o navegador codifica a música nesse formato. Sem isso o vídeo sai mesmo
 * assim, sem som — o dialog avisa antes.
 */
export async function canExportAudio(settings: VideoExportSettings) {
  if (typeof window === "undefined" || !("AudioEncoder" in window)) {
    return false;
  }

  const { canEncodeAudio } = await import("mediabunny");

  return canEncodeAudio(AUDIO_CODECS[getVideoExportFormat(settings)], {
    numberOfChannels: EXPORT_AUDIO_CHANNELS,
    sampleRate: EXPORT_AUDIO_SAMPLE_RATE,
  });
}

/** Se o navegador codifica esse formato nesse tamanho. */
export async function canExportVideo(
  settings: VideoExportSettings,
  size: MotionFrame,
) {
  if (typeof window === "undefined" || !("VideoEncoder" in window)) {
    return false;
  }

  const { canEncodeVideo } = await import("mediabunny");

  return canEncodeVideo(CODECS[getVideoExportFormat(settings)], {
    height: size.height,
    width: size.width,
  });
}

/**
 * Codifica os quadros num arquivo. A `mediabunny` só é carregada aqui, na
 * primeira exportação: quem não exporta vídeo não baixa o codificador.
 */
export async function encodeVideo({
  audio,
  frameTimes,
  onProgress,
  renderer,
  settings,
  signal,
}: {
  /**
   * A música já misturada (`renderSceneAudio`), um canal por array, do zero da
   * cena até o fim do último quadro; `null` = vídeo sem trilha de áudio.
   */
  audio: Float32Array<ArrayBuffer>[] | null;
  frameTimes: number[];
  onProgress: (done: number, total: number) => void;
  renderer: VideoFrameRenderer;
  settings: VideoExportSettings;
  signal: AbortSignal;
}) {
  const {
    AudioBufferSource,
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
    QUALITY_VERY_HIGH,
    WebMOutputFormat,
  } = await import("mediabunny");
  const format = getVideoExportFormat(settings);
  const output = new Output({
    format:
      format === "mp4"
        ? new Mp4OutputFormat({ fastStart: "in-memory" })
        : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  // Transparente é para site: qualidade alta com arquivo leve. O MP4 é o
  // "master", com mais bits.
  const source = new CanvasSource(renderer.canvas, {
    alpha: format === "webm" ? "keep" : "discard",
    bitrate: format === "webm" ? QUALITY_HIGH : QUALITY_VERY_HIGH,
    codec: CODECS[format],
  });

  output.addVideoTrack(source, { frameRate: settings.fps });

  const audioSource = audio
    ? new AudioBufferSource({
        codec: AUDIO_CODECS[format],
        quality: QUALITY_HIGH,
      })
    : null;

  if (audioSource) {
    output.addAudioTrack(audioSource);
  }

  await output.start();

  const frameDuration = 1 / settings.fps;
  let audioSent = 0;

  /**
   * Manda a música até o fim do quadro `index`. Vai junto com os quadros, e não
   * de uma vez no começo: o arquivo intercala áudio e vídeo pelo tempo, e uma
   * trilha inteira na frente esperaria pelo vídeo.
   */
  async function sendAudioUntil(seconds: number) {
    if (!audio || !audioSource) {
      return;
    }

    const end = Math.min(
      audio[0].length,
      Math.round(seconds * EXPORT_AUDIO_SAMPLE_RATE),
    );

    if (end <= audioSent) {
      return;
    }

    const chunk = new AudioBuffer({
      length: end - audioSent,
      numberOfChannels: audio.length,
      sampleRate: EXPORT_AUDIO_SAMPLE_RATE,
    });

    audio.forEach((channel, index) =>
      chunk.copyToChannel(channel.subarray(audioSent, end), index),
    );
    audioSent = end;
    await audioSource.add(chunk);
  }

  try {
    for (const [index, timeMs] of frameTimes.entries()) {
      if (signal.aborted) {
        throw new VideoExportCanceledError();
      }

      await renderer.render(timeMs);
      await source.add(index * frameDuration, frameDuration);
      await sendAudioUntil((index + 1) * frameDuration);
      onProgress(index + 1, frameTimes.length);
    }

    audioSource?.close();
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }

  return new Blob([output.target.buffer!], {
    type: format === "mp4" ? "video/mp4" : "video/webm",
  });
}
