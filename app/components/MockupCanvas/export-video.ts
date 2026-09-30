"use client";

import * as THREE from "three";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  getActiveScreenVideo,
  getScreenVideoTime,
  type SceneObject,
} from "../../lib/scene-objects";
import { getScreenVideoElement } from "../../lib/screen-texture";
import {
  getVideoExportFormat,
  type VideoExportSettings,
} from "../../lib/video-export";
import { flipPixelRows, getSupersampleScale } from "./export-photo";

/**
 * Exportação de vídeo quadro a quadro. Nada aqui depende do relógio nem do
 * requestAnimationFrame: cada quadro posiciona a cena no seu instante, leva os
 * vídeos das telas ao quadro exato e só então renderiza. Um computador lento
 * demora mais, mas não perde quadros — e a aba pode ficar em segundo plano.
 */

/** Um vídeo de tela que não termina o seek neste tempo trava a exportação. */
const SEEK_TIMEOUT_MS = 5000;

export type VideoFrameRendererDeps = {
  /** Um quadro do R3F sob demanda: roda os useFrame (compositor das telas). */
  advance: (timestamp: number) => void;
  /** Põe cada objeto na pose de um instante da cena. */
  applyPoses: (timeMs: number) => void;
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

async function seekVideo(element: HTMLVideoElement, seconds: number) {
  const target = Math.max(0, seconds);

  // Seek para onde já está não dispara `seeked`.
  if (Math.abs(element.currentTime - target) < 0.0005 && !element.seeking) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      element.removeEventListener("seeked", handleSeeked);
      reject(new Error("O vídeo da tela não respondeu ao seek."));
    }, SEEK_TIMEOUT_MS);

    function handleSeeked() {
      window.clearTimeout(timeout);
      resolve();
    }

    element.addEventListener("seeked", handleSeeked, { once: true });
    element.currentTime = target;
  });
}

/**
 * Prepara a renderização: render target com superamostragem e buffers
 * reaproveitados entre quadros (alocar 30 MB por quadro em 4K travaria o GC).
 */
export function createVideoFrameRenderer(
  deps: VideoFrameRendererDeps,
  size: MotionFrame,
  background: string | null,
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

  for (const object of objects()) {
    getScreenVideoElement(object.id)?.pause();
  }

  return {
    canvas,

    async render(timeMs) {
      applyPoses(timeMs);

      await Promise.all(
        objects().map((object) => {
          const video = getActiveScreenVideo(object);
          const element = getScreenVideoElement(object.id);

          if (!video || !element) {
            return undefined;
          }

          // Como no editor: o último quadro fica um pouco antes do fim.
          const ms = Math.min(
            getScreenVideoTime(video, timeMs),
            video.durationMs - 20,
          );

          return seekVideo(element, ms / 1000);
        }),
      );

      // O `seeked` marca a textura do vídeo para atualizar; este quadro do R3F
      // roda o compositor, que redesenha a tela antes do render abaixo.
      advance(performance.now());

      const previousClearColor = gl.getClearColor(new THREE.Color()).clone();
      const previousClearAlpha = gl.getClearAlpha();
      const previousTarget = gl.getRenderTarget();

      if (background) {
        gl.setClearColor(new THREE.Color(background), 1);
      } else {
        gl.setClearColor(previousClearColor, 0);
      }

      scene.background = null;

      // Como no PNG: o grid do chão só entra com fundo.
      if (gridRef.current) {
        gridRef.current.visible = background !== null;
      }

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
      }

      gl.setRenderTarget(target);
      gl.render(scene, camera);
      gl.readRenderTargetPixels(target, 0, 0, renderWidth, renderHeight, pixels);
      gl.setRenderTarget(previousTarget);
      gl.setClearColor(previousClearColor, previousClearAlpha);

      flipPixelRows(pixels, renderWidth, renderHeight, fullImage.data);
      fullContext.putImageData(fullImage, 0, 0);
      context.clearRect(0, 0, size.width, size.height);
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
  frameTimes,
  onProgress,
  renderer,
  settings,
  signal,
}: {
  frameTimes: number[];
  onProgress: (done: number, total: number) => void;
  renderer: VideoFrameRenderer;
  settings: VideoExportSettings;
  signal: AbortSignal;
}) {
  const {
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
  await output.start();

  const frameDuration = 1 / settings.fps;

  try {
    for (const [index, timeMs] of frameTimes.entries()) {
      if (signal.aborted) {
        throw new VideoExportCanceledError();
      }

      await renderer.render(timeMs);
      await source.add(index * frameDuration, frameDuration);
      onProgress(index + 1, frameTimes.length);
    }

    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    throw error;
  }

  return new Blob([output.target.buffer!], {
    type: format === "mp4" ? "video/mp4" : "video/webm",
  });
}
