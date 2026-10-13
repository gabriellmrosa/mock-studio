import {
  MOTION_FRAME_MAX,
  clampFrameSide,
  type MotionFrame,
} from "./motion-frame";

/**
 * Exportação de vídeo do Movimento — a parte sem DOM: configurações, atalhos,
 * tamanho de saída e os instantes de cada quadro. O motor que renderiza fica
 * no canvas (export-video.ts), e o modal só escolhe as configurações daqui.
 */

export type VideoFps = 30 | 60;
export type VideoScale = 1 | 2;

export type VideoExportSettings = {
  /** Sem fundo sai WebM transparente; com fundo, MP4. */
  background: boolean;
  fps: VideoFps;
  /** Multiplica o tamanho do quadro: 2× para editar ou recortar depois. */
  scale: VideoScale;
};

export type VideoExportFormat = "mp4" | "webm";

/** Com fundo (MP4), 60 fps, no tamanho do quadro: o vídeo pronto para postar. */
export const DEFAULT_VIDEO_EXPORT_SETTINGS: VideoExportSettings = {
  background: true,
  fps: 60,
  scale: 1,
};

export function getVideoExportFormat(
  settings: VideoExportSettings,
): VideoExportFormat {
  return settings.background ? "mp4" : "webm";
}

/**
 * Tamanho do arquivo: o quadro do Movimento vezes a escala. Passando de 4K no
 * maior lado, reduz os dois lados na mesma proporção; sempre em números pares.
 */
export function getVideoExportSize(
  frame: MotionFrame,
  scale: VideoScale,
): MotionFrame {
  const width = frame.width * scale;
  const height = frame.height * scale;
  const fit = Math.min(1, MOTION_FRAME_MAX / Math.max(width, height));

  return {
    height: clampFrameSide(height * fit),
    width: clampFrameSide(width * fit),
  };
}

/**
 * Instantes (ms) de cada quadro. Inclui o último instante da cena, para o
 * vídeo terminar exatamente na pose final — num mockup, a composição final é
 * o que mais importa.
 */
export function getVideoFrameTimes(durationMs: number, fps: VideoFps) {
  // Arredonda para cima: uma duração que não fecha um quadro ganha mais um,
  // preso ao fim da cena.
  const count = Math.ceil((durationMs * fps) / 1000 - 1e-6) + 1;

  return Array.from({ length: count }, (_, index) =>
    Math.min((index * 1000) / fps, durationMs),
  );
}

export function getVideoExportFilename(
  size: MotionFrame,
  settings: VideoExportSettings,
  timestamp: string,
) {
  return `mock-photo-${size.width}x${size.height}-${settings.fps}fps-${timestamp}.${getVideoExportFormat(settings)}`;
}

/**
 * Tempo que falta, em ms, pelo ritmo até aqui. `null` enquanto o ritmo ainda
 * não diz nada: nos primeiros quadros entram o carregamento do codificador e
 * a primeira busca nos vídeos, e a estimativa sairia muito alta.
 */
export function estimateRemainingMs(
  elapsedMs: number,
  done: number,
  total: number,
) {
  const MIN_FRAMES = 10;
  const MIN_ELAPSED_MS = 1500;

  if (done < MIN_FRAMES || elapsedMs < MIN_ELAPSED_MS || done >= total) {
    return null;
  }

  return (elapsedMs / done) * (total - done);
}
