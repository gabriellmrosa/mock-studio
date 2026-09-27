"use client";

/**
 * Vídeos HDR nas telas. Gravações de tela de iPhone e Mac costumam sair em
 * HEVC 10 bits, primárias BT.2020 e curva PQ — mesmo com conteúdo SDR dentro
 * (o arquivo de teste declara `max_content=100` nits). O Chrome entrega esses
 * valores crus à textura WebGL, sem conversão: o branco de 100 nits vira ~50%
 * de cinza e a tela inteira parece coberta por um véu.
 *
 * O caminho do canvas 2D não resolve: ali o Chrome converte, mas com o branco
 * de referência do HDR (203 nits), então uma gravação de tela ainda sai com o
 * branco em ~72%. Por isso a conversão é nossa, com o branco em 100 nits — o
 * branco de uma tela gravada.
 *
 * Medido no arquivo de teste (fundo branco da UI): WebGL cru = 129/255, canvas
 * 2D = 184/255.
 */

export type HdrTransfer = "pq" | "hlg";

/** Branco do SDR numa gravação de tela em PQ: o conteúdo é SDR de 100 nits. */
const SDR_WHITE_NITS = 100;

/**
 * Curva do vídeo, lida do quadro já decodificado. `VideoFrame` (WebCodecs) é
 * o único jeito de o navegador contar isso; sem ele, assume SDR.
 */
export function detectHdrTransfer(video: HTMLVideoElement): HdrTransfer | null {
  if (typeof VideoFrame === "undefined") {
    return null;
  }

  try {
    const frame = new VideoFrame(video);
    // A tipagem do TS ainda não lista "pq" nem "hlg", mas o Chrome os devolve.
    const transfer: string | null = frame.colorSpace.transfer;

    frame.close();

    return transfer === "pq" || transfer === "hlg" ? transfer : null;
  } catch {
    return null;
  }
}

/**
 * Funções GLSL de conversão, usadas pela composição da tela
 * ([screen-compositor.ts](app/lib/screen-compositor.ts)). Recebem o sinal cru
 * (textura sem espaço de cor) e devolvem luz linear BT.709 com o branco em 1.
 */
export const HDR_TO_SDR_GLSL = /* glsl */ `
  // SMPTE ST 2084 (PQ): sinal -> nits.
  vec3 pqToNits(vec3 signal) {
    const float m1 = 0.1593017578125;
    const float m2 = 78.84375;
    const float c1 = 0.8359375;
    const float c2 = 18.8515625;
    const float c3 = 18.6875;
    vec3 p = pow(max(signal, 0.0), vec3(1.0 / m2));

    return 10000.0 * pow(max(p - c1, 0.0) / (c2 - c3 * p), vec3(1.0 / m1));
  }

  // ARIB STD-B67 (HLG): sinal -> luz de cena, 0 a 1.
  vec3 hlgToScene(vec3 signal) {
    const float a = 0.17883277;
    const float b = 0.28466892;
    const float c = 0.55991073;
    vec3 low = signal * signal / 3.0;
    vec3 high = (exp((signal - c) / a) + b) / 12.0;

    return mix(low, high, step(0.5, signal));
  }

  // transferMode: 1 = PQ, 2 = HLG.
  vec3 hdrToSdrLinear(vec3 signal, int transferMode) {
    vec3 linear2020 = transferMode == 1
      ? pqToNits(signal) / ${SDR_WHITE_NITS.toFixed(1)}
      // No HLG o branco de referência é o sinal 0.75 (luz de cena 0.26496).
      : hlgToScene(signal) / 0.26496;

    // BT.2020 -> BT.709 em luz linear (colunas: a GLSL é column-major).
    const mat3 toRec709 = mat3(
      1.6605, -0.1246, -0.0182,
      -0.5876, 1.1329, -0.1006,
      -0.0728, -0.0083, 1.1187
    );

    // Corta no branco em vez de comprimir os realces: qualquer compressão que
    // pegue acima de 1 também puxa o branco para baixo (com joelho em 0.9 o
    // branco saía 249 em vez de 255), e uma gravação de tela não tem nada
    // acima do branco.
    return min(max(toRec709 * linear2020, 0.0), 1.0);
  }
`;
