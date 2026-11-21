"use client";

import { memo, useMemo } from "react";
import {
  WAVEFORM_PEAKS_PER_SECOND,
  getAudioPeaks,
} from "../../lib/audio-files";
import type { SceneAudio } from "../../lib/scene-objects";

/** Mais colunas que isso não se distinguem num clipe da timeline. */
const MAX_WAVEFORM_COLUMNS = 1200;

/**
 * Os picos do trecho que toca (sem os cortes), no máximo `maxColumns` colunas:
 * cada coluna é o maior pico do seu pedaço, para um som curto e forte não
 * sumir na redução.
 */
export function getVisiblePeaks(
  peaks: Float32Array,
  trimStartMs: number,
  trimEndMs: number,
  durationMs: number,
  maxColumns = MAX_WAVEFORM_COLUMNS,
) {
  const perMs = WAVEFORM_PEAKS_PER_SECOND / 1000;
  const first = Math.max(0, Math.floor(trimStartMs * perMs));
  const last = Math.min(peaks.length, Math.ceil((durationMs - trimEndMs) * perMs));
  const visible = peaks.subarray(first, Math.max(first, last));
  const step = Math.max(1, Math.ceil(visible.length / maxColumns));
  const columns: number[] = [];

  for (let index = 0; index < visible.length; index += step) {
    let peak = 0;

    for (let offset = index; offset < Math.min(visible.length, index + step); offset += 1) {
      peak = Math.max(peak, visible[offset]);
    }

    columns.push(peak);
  }

  return columns;
}

/**
 * A forma de onda dentro do clipe da música: um contorno espelhado em torno do
 * meio, esticado na largura do clipe. Ajuda a cortar e a pôr keyframes na
 * batida. Sem os picos (o arquivo ainda não foi lido), nada.
 */
function AudioWaveform({
  audio,
}: {
  audio: Pick<SceneAudio, "durationMs" | "trimEndMs" | "trimStartMs" | "url">;
}) {
  const { durationMs, trimEndMs, trimStartMs, url } = audio;
  const path = useMemo(() => {
    const peaks = getAudioPeaks(url);

    if (!peaks) {
      return null;
    }

    const columns = getVisiblePeaks(peaks, trimStartMs, trimEndMs, durationMs);

    if (columns.length === 0) {
      return null;
    }

    // Uma coluna a mais no fim, para o contorno chegar à borda direita.
    const top = columns.map((peak, index) => `${index},${50 - peak * 48}`);
    const bottom = columns
      .map((peak, index) => `${index},${50 + peak * 48}`)
      .reverse();

    return {
      d: `M0,50 L${top.join(" L")} L${columns.length},50 L${bottom.join(" L")} Z`,
      width: columns.length,
    };
  }, [durationMs, trimEndMs, trimStartMs, url]);

  if (!path) {
    return null;
  }

  return (
    <svg
      aria-hidden
      className="motion-timeline-waveform"
      data-testid="audio-waveform"
      preserveAspectRatio="none"
      viewBox={`0 0 ${path.width} 100`}
    >
      <path d={path.d} />
    </svg>
  );
}

export default memo(AudioWaveform);
