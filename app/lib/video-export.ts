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

export type VideoExportPresetId = "web" | "social" | "master";

export const VIDEO_EXPORT_PRESETS: Array<{
  id: VideoExportPresetId;
  settings: VideoExportSettings;
}> = [
  { id: "social", settings: { background: true, fps: 60, scale: 1 } },
  { id: "web", settings: { background: false, fps: 30, scale: 1 } },
  { id: "master", settings: { background: true, fps: 60, scale: 2 } },
];

export const DEFAULT_VIDEO_EXPORT_PRESET: VideoExportPresetId = "social";

export function getVideoExportPreset(id: VideoExportPresetId) {
  return VIDEO_EXPORT_PRESETS.find((preset) => preset.id === id)!.settings;
}

/** O atalho que as configurações formam, ou `null` se foram personalizadas. */
export function findVideoExportPreset(
  settings: VideoExportSettings,
): VideoExportPresetId | null {
  return (
    VIDEO_EXPORT_PRESETS.find(
      ({ settings: preset }) =>
        preset.background === settings.background &&
        preset.fps === settings.fps &&
        preset.scale === settings.scale,
    )?.id ?? null
  );
}

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
