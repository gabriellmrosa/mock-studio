import {
  DEFAULT_SCREEN_FIT,
  MAX_SCREEN_CROP,
  MAX_SCREEN_PAN,
  MAX_SCREEN_ZOOM,
  MIN_SCREEN_VIDEO_CLIP_MS,
  MIN_SCREEN_ZOOM,
  type ScreenFit,
  type ScreenVideo,
} from "./scene-objects";

/**
 * O que um template lembra de uma tela, já que o arquivo dela não vai junto
 * (estouraria o `localStorage`, e é um blob URL que só vale nesta aba): se ela
 * mostrava imagem ou vídeo, o nome de cada arquivo, o enquadramento e o corte
 * de cada um e, no vídeo, o tempo do clipe. Ao aplicar o template, a tela pede
 * o arquivo de novo pelo nome; quando ele chega — qualquer arquivo, mesmo com
 * outro nome (decisão do usuário) —, essas configurações valem para ele.
 */
export type ScreenSettingsVideo = Omit<ScreenVideo, "url">;

export type TemplateScreen = {
  image?: { fit: ScreenFit; name: string };
  source: "image" | "video";
  video?: ScreenSettingsVideo;
};

/**
 * Na cena, o que veio de um template e ainda espera o arquivo: o nome da
 * imagem e o vídeo (sem o arquivo). O enquadramento da imagem já fica no
 * `imageFit` do objeto; o do vídeo só tem onde ficar quando o vídeo existe,
 * então mora aqui até lá.
 */
export type PendingScreen = {
  imageName: string | null;
  video: ScreenSettingsVideo | null;
};

/** Uma tela na cena, nos campos que importam aqui (a de dentro ou a de fora). */
export type ScreenState = {
  imageFit: ScreenFit;
  imageName: string | null;
  pending: PendingScreen | null;
  source: "image" | "video";
  video: ScreenVideo | null;
};

function withoutUrl(video: ScreenVideo): ScreenSettingsVideo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { url, ...settings } = video;

  return { ...settings, fit: { ...settings.fit } };
}

/**
 * A tela como vai para o template. `undefined` quando não há nada a lembrar
 * (nunca recebeu arquivo e mostra imagem): o template de uma cena comum fica
 * como sempre foi.
 */
export function toTemplateScreen(screen: ScreenState): TemplateScreen | undefined {
  const imageName = screen.imageName ?? screen.pending?.imageName ?? null;
  const video = screen.video ? withoutUrl(screen.video) : screen.pending?.video ?? null;

  if (!imageName && !video && screen.source === "image") {
    return undefined;
  }

  return {
    ...(imageName ? { image: { fit: { ...screen.imageFit }, name: imageName } } : {}),
    source: screen.source,
    ...(video ? { video } : {}),
  };
}

/** A tela que um template devolve: a fonte, o enquadramento da imagem e o que espera arquivo. */
export function fromTemplateScreen(screen: TemplateScreen | undefined): {
  imageFit: ScreenFit;
  pending: PendingScreen | null;
  source: "image" | "video";
} {
  if (!screen) {
    return { imageFit: { ...DEFAULT_SCREEN_FIT }, pending: null, source: "image" };
  }

  const imageName = screen.image?.name ?? null;
  const video = screen.video ? { ...screen.video, fit: { ...screen.video.fit } } : null;

  return {
    imageFit: { ...(screen.image?.fit ?? DEFAULT_SCREEN_FIT) },
    pending: imageName || video ? { imageName, video } : null,
    source: screen.source,
  };
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(max, Math.max(min, number));
}

function normalizeFit(value: unknown): ScreenFit {
  const fit = (value && typeof value === "object" ? value : {}) as Partial<ScreenFit>;

  return {
    background:
      typeof fit.background === "string" && /^#[0-9a-f]{6}$/i.test(fit.background)
        ? fit.background
        : DEFAULT_SCREEN_FIT.background,
    cropBottom: clamp(fit.cropBottom, 0, MAX_SCREEN_CROP, 0),
    cropLeft: clamp(fit.cropLeft, 0, MAX_SCREEN_CROP, 0),
    cropRight: clamp(fit.cropRight, 0, MAX_SCREEN_CROP, 0),
    cropTop: clamp(fit.cropTop, 0, MAX_SCREEN_CROP, 0),
    panX: clamp(fit.panX, -MAX_SCREEN_PAN, MAX_SCREEN_PAN, 0),
    panY: clamp(fit.panY, -MAX_SCREEN_PAN, MAX_SCREEN_PAN, 0),
    zoom: clamp(fit.zoom, MIN_SCREEN_ZOOM, MAX_SCREEN_ZOOM, 1),
  };
}

function normalizeName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
}

/**
 * Leitura defensiva (template, link, código colado): o que não fizer sentido
 * cai fora, e os números voltam para dentro dos limites dos controles.
 */
export function normalizeTemplateScreen(value: unknown): TemplateScreen | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const screen = value as Record<string, unknown>;
  const image = screen.image as Record<string, unknown> | undefined;
  const video = screen.video as Record<string, unknown> | undefined;
  const imageName = normalizeName(image?.name);
  const videoName = normalizeName(video?.name);

  return {
    ...(imageName ? { image: { fit: normalizeFit(image?.fit), name: imageName } } : {}),
    source: screen.source === "video" ? "video" : "image",
    ...(videoName && video
      ? {
          video: {
            durationMs: clamp(video.durationMs, 0, Number.MAX_SAFE_INTEGER, 0),
            fit: normalizeFit(video.fit),
            name: videoName,
            startMs: clamp(video.startMs, 0, Number.MAX_SAFE_INTEGER, 0),
            trimEndMs: clamp(video.trimEndMs, 0, Number.MAX_SAFE_INTEGER, 0),
            trimStartMs: clamp(video.trimStartMs, 0, Number.MAX_SAFE_INTEGER, 0),
            ...(typeof video.holdEndMs === "number" && video.holdEndMs > 0
              ? { holdEndMs: clamp(video.holdEndMs, 0, Number.MAX_SAFE_INTEGER, 0) }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * O vídeo que acabou de chegar, com o que estava salvo: enquadramento, início
 * na cena e cortes. O arquivo novo pode ser mais curto que os cortes salvos
 * (outra versão da gravação): eles encolhem para sobrar ao menos o clipe
 * mínimo.
 */
export function applyPendingVideo(
  video: ScreenVideo,
  pending: ScreenSettingsVideo | null | undefined,
): ScreenVideo {
  if (!pending) {
    return video;
  }

  const room = Math.max(0, video.durationMs - MIN_SCREEN_VIDEO_CLIP_MS);
  const trimStartMs = Math.min(pending.trimStartMs, room);
  const trimEndMs = Math.min(pending.trimEndMs, room - trimStartMs);

  return {
    ...video,
    fit: { ...pending.fit },
    // O quadro congelado depois do fim vale para qualquer arquivo: o clipe
    // continua até onde estava na cena.
    holdEndMs: pending.holdEndMs ?? 0,
    startMs: pending.startMs,
    trimEndMs,
    trimStartMs,
  };
}

/**
 * O nome do arquivo que a tela está pedindo de volta, ou `null`: o da fonte
 * que ela mostra (imagem ou vídeo), se ele veio de um template e ainda não
 * chegou.
 */
export function getMissingScreenFileName(
  source: "image" | "video",
  pending: PendingScreen | null | undefined,
) {
  if (!pending) {
    return null;
  }

  return source === "video" ? pending.video?.name ?? null : pending.imageName;
}

/**
 * O pendente sem a parte que acabou de chegar (ou que o usuário tirou): `null`
 * quando não sobra nada esperando arquivo.
 */
export function withoutPending(
  pending: PendingScreen | null | undefined,
  part: "image" | "video",
): PendingScreen | null {
  if (!pending) {
    return null;
  }

  const next: PendingScreen =
    part === "image" ? { ...pending, imageName: null } : { ...pending, video: null };

  return next.imageName || next.video ? next : null;
}
