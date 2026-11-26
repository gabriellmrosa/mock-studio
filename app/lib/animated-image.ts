/**
 * Uma imagem que se mexe — um sticker animado (Lottie) ou um GIF enviado —
 * vista pela cena como uma só coisa: um canvas onde se desenha o quadro de um
 * instante. Quem a usa (a textura do plano, o preview, a exportação) pede
 * `drawAt(tempo)` e sobe o canvas como textura; não sabe de qual formato veio.
 *
 * O quadro de um instante é sempre o mesmo, em qualquer ordem de perguntas: é o
 * que faz a exportação de vídeo (que pede quadro a quadro) sair igual ao
 * preview, e a timeline poder arrastar para trás. Por isso os dois formatos
 * foram escolhidos assim — o Lottie vai a um quadro exato (`goToAndStop`), e
 * os quadros do GIF são decodificados antes e consultados por índice.
 */
export type AnimatedSource = {
  canvas: HTMLCanvasElement;
  /** Duração de uma volta, em ms. */
  durationMs: number;
  /** Desenha o quadro do instante (em ms, com a velocidade já aplicada), em loop. */
  drawAt: (timeMs: number) => void;
  dispose: () => void;
  /**
   * O instante que representa a animação quando ela está parada (o Estático, o
   * PNG): o primeiro quadro de uma animação pode estar quase vazio (uma
   * explosão de confete que ainda não começou), então o do Lottie é o quadro
   * mais cheio.
   */
  posterMs: number;
};

/** O instante dentro de uma volta, com a velocidade e sem passar da duração. */
export function getLoopTime(timeMs: number, durationMs: number, speed = 1) {
  if (!(durationMs > 0)) {
    return 0;
  }

  const scaled = timeMs * speed;

  return ((scaled % durationMs) + durationMs) % durationMs;
}

/**
 * O quadro de um instante, dados os instantes em que cada quadro termina (em
 * ordem crescente): o primeiro cujo fim ainda não passou.
 */
export function findFrameIndex(ends: readonly number[], timeMs: number) {
  let low = 0;
  let high = ends.length - 1;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (timeMs < ends[middle]) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
}

/** Lado maior do que se desenha de uma animação: o limite de custo por quadro. */
export const ANIMATED_LONG_SIDE = 512;

/** Um GIF com mais quadros que isto não é aceito: cada um fica na memória. */
export const MAX_GIF_FRAMES = 300;

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  return canvas;
}

// O lottie-web tem tipos só para o renderizador SVG; o do canvas é o que se usa.
type LottieAnimation = {
  addEventListener: (name: "DOMLoaded", callback: () => void) => void;
  destroy: () => void;
  frameRate: number;
  goToAndStop: (frame: number, isFrame: boolean) => void;
  totalFrames: number;
};

type LottiePlayer = {
  loadAnimation: (config: {
    animationData: unknown;
    autoplay: boolean;
    loop: boolean;
    renderer: "canvas";
    rendererSettings: {
      clearCanvas: boolean;
      context: CanvasRenderingContext2D;
      preserveAspectRatio: string;
    };
  }) => LottieAnimation;
};

/** Quanto do canvas está coberto (0 a 1), medido numa miniatura. */
function measureCoverage(canvas: HTMLCanvasElement, probe: HTMLCanvasElement) {
  const context = probe.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return 0;
  }

  context.clearRect(0, 0, probe.width, probe.height);
  context.drawImage(canvas, 0, 0, probe.width, probe.height);

  const { data } = context.getImageData(0, 0, probe.width, probe.height);
  let covered = 0;

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] > 0) {
      covered += 1;
    }
  }

  return covered / (probe.width * probe.height);
}

/**
 * Um sticker animado (Lottie). O lottie-web vem pelo build leve de canvas
 * (sem expressões, ~200 KB) e só quando o primeiro animado aparece: quem nunca
 * usa um não paga por ele.
 */
export async function loadLottieSource(url: string): Promise<AnimatedSource> {
  const [{ default: lottie }, data] = await Promise.all([
    import("lottie-web/build/player/lottie_light_canvas"),
    fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error("Não foi possível abrir a animação.");
      }

      return response.json() as Promise<{ h: number; w: number }>;
    }),
  ]);

  const aspect = data.w / data.h;
  const canvas = makeCanvas(
    aspect >= 1 ? ANIMATED_LONG_SIDE : ANIMATED_LONG_SIDE * aspect,
    aspect >= 1 ? ANIMATED_LONG_SIDE / aspect : ANIMATED_LONG_SIDE,
  );
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível preparar a animação.");
  }

  const animation = (lottie as unknown as LottiePlayer).loadAnimation({
    animationData: data,
    autoplay: false,
    loop: false,
    renderer: "canvas",
    rendererSettings: {
      clearCanvas: true,
      context,
      preserveAspectRatio: "xMidYMid meet",
    },
  });

  await new Promise<void>((resolve) =>
    animation.addEventListener("DOMLoaded", () => resolve()),
  );

  const durationMs = (animation.totalFrames / animation.frameRate) * 1000;
  const lastFrame = Math.max(0, animation.totalFrames - 1);

  function drawAt(timeMs: number) {
    const frame = (getLoopTime(timeMs, durationMs) / durationMs) * lastFrame;

    animation.goToAndStop(frame, true);
  }

  // O quadro mais cheio entre doze amostras: o "cartaz" da animação.
  const probe = makeCanvas(48, 48);
  let posterMs = 0;
  let bestCoverage = -1;

  for (let sample = 0; sample < 12; sample += 1) {
    const timeMs = (sample / 12) * durationMs;

    drawAt(timeMs);

    const coverage = measureCoverage(canvas, probe);

    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      posterMs = timeMs;
    }
  }

  return {
    canvas,
    dispose: () => animation.destroy(),
    drawAt,
    durationMs,
    posterMs,
  };
}

/** O que se sabe de um GIF sem desenhá-lo. */
export type GifInfo = { frames: number };

/** O navegador decodifica GIF quadro a quadro (`ImageDecoder`)? Nem todos. */
export function canDecodeGif() {
  return typeof ImageDecoder !== "undefined";
}

/** Quantos quadros tem o GIF; `null` se este navegador não os separa. */
export async function readGifInfo(data: ArrayBuffer): Promise<GifInfo | null> {
  if (!canDecodeGif()) {
    return null;
  }

  const decoder = new ImageDecoder({ data, type: "image/gif" });

  try {
    await decoder.tracks.ready;

    return { frames: decoder.tracks.selectedTrack?.frameCount ?? 1 };
  } finally {
    decoder.close();
  }
}

/**
 * Um GIF enviado. Todos os quadros são decodificados antes, já no tamanho em
 * que serão desenhados (`ANIMATED_LONG_SIDE`), e guardados como bitmaps: o
 * quadro de um instante é então uma consulta, e não uma decodificação — o que a
 * exportação, que pede um quadro por vez, não esperaria.
 */
export async function loadGifSource(url: string): Promise<AnimatedSource> {
  const data = await (await fetch(url)).arrayBuffer();
  const decoder = new ImageDecoder({ data, type: "image/gif" });

  await decoder.tracks.ready;

  const count = decoder.tracks.selectedTrack?.frameCount ?? 0;

  if (count < 1 || count > MAX_GIF_FRAMES) {
    decoder.close();
    throw new Error("O GIF tem quadros demais.");
  }

  const frames: ImageBitmap[] = [];
  const ends: number[] = [];
  let total = 0;
  let width = 1;
  let height = 1;

  try {
    for (let index = 0; index < count; index += 1) {
      const { image } = await decoder.decode({ frameIndex: index });

      if (index === 0) {
        const scale = Math.min(
          1,
          ANIMATED_LONG_SIDE / Math.max(image.displayWidth, image.displayHeight),
        );

        width = Math.max(1, Math.round(image.displayWidth * scale));
        height = Math.max(1, Math.round(image.displayHeight * scale));
      }

      // `duration` vem em microssegundos; os navegadores tratam um quadro de
      // até 10 ms como 100 ms.
      const rawMs = (image.duration ?? 100_000) / 1000;

      frames.push(
        await createImageBitmap(image, {
          resizeHeight: height,
          resizeQuality: "high",
          resizeWidth: width,
        }),
      );
      image.close();
      total += rawMs <= 10 ? 100 : rawMs;
      ends.push(total);
    }
  } finally {
    decoder.close();
  }

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível preparar o GIF.");
  }

  return {
    canvas,
    dispose: () => frames.forEach((frame) => frame.close()),
    drawAt: (timeMs) => {
      const frame = frames[findFrameIndex(ends, getLoopTime(timeMs, total))];

      context.clearRect(0, 0, width, height);
      context.drawImage(frame, 0, 0, width, height);
    },
    durationMs: total,
    posterMs: 0,
  };
}
