/**
 * Tamanho do quadro do Movimento: a área, em pixels, que o vídeo vai ter. O
 * canvas do Movimento assume essa proporção, então o que se compõe é o que sai.
 * Só existe no Movimento — o PNG do Estático é recortado depois, fora do app.
 */
export type MotionFrame = {
  height: number;
  width: number;
};

export const DEFAULT_MOTION_FRAME: MotionFrame = { height: 1080, width: 1920 };

/** Lado mínimo e máximo, em pixels. O máximo é o do maior PNG (4K). */
export const MOTION_FRAME_MIN = 64;
export const MOTION_FRAME_MAX = 3840;

export const MOTION_FRAME_PRESETS: Array<MotionFrame & { label: string }> = [
  { height: 1080, label: "16:9", width: 1920 },
  { height: 1080, label: "1:1", width: 1080 },
  { height: 1350, label: "4:5", width: 1080 },
  { height: 1920, label: "9:16", width: 1080 },
];

/**
 * Leva um lado para a faixa aceita e para um número par: codificadores de
 * vídeo (H.264 em 4:2:0) não aceitam dimensões ímpares.
 */
export function clampFrameSide(value: number) {
  if (!Number.isFinite(value)) {
    return MOTION_FRAME_MIN;
  }

  const clamped = Math.min(MOTION_FRAME_MAX, Math.max(MOTION_FRAME_MIN, value));

  return Math.round(clamped / 2) * 2;
}

/**
 * Muda um lado. Com a proporção travada, o outro acompanha; se o outro sair
 * da faixa, é ele que limita, e o lado pedido recua para manter a proporção.
 */
export function resizeMotionFrame(
  frame: MotionFrame,
  side: keyof MotionFrame,
  value: number,
  keepRatio: boolean,
): MotionFrame {
  const next = clampFrameSide(value);

  if (!keepRatio) {
    return { ...frame, [side]: next };
  }

  const other: keyof MotionFrame = side === "width" ? "height" : "width";
  const ratio = frame[other] / frame[side];
  const otherValue = clampFrameSide(next * ratio);

  return {
    [other]: otherValue,
    [side]: clampFrameSide(otherValue / ratio),
  } as MotionFrame;
}

function isSameFrame(a: MotionFrame, b: MotionFrame) {
  return a.width === b.width && a.height === b.height;
}

export function findMotionFramePreset(frame: MotionFrame) {
  return MOTION_FRAME_PRESETS.find((preset) => isSameFrame(preset, frame)) ?? null;
}

/**
 * Proporção para exibir: a razão de um atalho quando bate com um, senão a
 * largura sobre a altura com duas casas (648 × 412 → "1.57:1").
 */
export function formatMotionFrameRatio(frame: MotionFrame, locale: string) {
  const ratio = frame.width / frame.height;
  const preset = MOTION_FRAME_PRESETS.find(
    (item) => Math.abs(item.width / item.height - ratio) < 0.001,
  );

  if (preset) {
    return preset.label;
  }

  return `${ratio.toLocaleString(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}:1`;
}

/** Leitura defensiva de um quadro salvo: fora do formato, `null`. */
export function normalizeMotionFrame(value: unknown): MotionFrame | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const { height, width } = value as Partial<MotionFrame>;

  if (typeof width !== "number" || typeof height !== "number") {
    return null;
  }

  return { height: clampFrameSide(height), width: clampFrameSide(width) };
}
