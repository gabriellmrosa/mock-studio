import type { DeviceModelId } from "../models/device-models";
import { createAudioObject } from "./audio-objects";
import type { SceneImage } from "./image-objects";
import {
  isAudioObject,
  isDeviceObject,
  isImageObject,
  type SceneAudio,
  type SceneObject,
  type ScreenFit,
  type ScreenVideo,
} from "./scene-objects";
import type { TemplateMode } from "./scene-templates";

// ---------------------------------------------------------------------------
// Cache em memória da sessão por template.
//
// Templates no localStorage não guardam arquivos (estourariam a cota e blob
// URLs só valem nesta aba). Enquanto a aba estiver aberta, este mapa lembra as
// telas (imagens e vídeos, inclusive a tela externa do Duo), imagens soltas /
// GIFs e música de cada template — assim olhar outro template e voltar não
// obriga o usuário a reenviar tudo. Ao fechar ou recarregar a aba, tudo some
// junto com os blob URLs.
// ---------------------------------------------------------------------------

type DeviceSessionMedia = {
  imageFit: ScreenFit;
  imageName: string | null;
  imageUrl: string | null;
  modelId: DeviceModelId;
  outerImageFit: ScreenFit;
  outerImageName: string | null;
  outerImageUrl: string | null;
  outerScreenSource: "image" | "video";
  outerScreenVideo: ScreenVideo | null;
  screenSource: "image" | "video";
  screenVideo: ScreenVideo | null;
};

type ImageSessionMedia = {
  animation: SceneImage["animation"];
  aspect: number;
  isVector: boolean;
  name: string | null;
  url: string;
};

type AudioSessionMedia = {
  audio: SceneAudio;
  isVisible: boolean;
  name: string;
};

export type TemplateSessionMedia = {
  audio: AudioSessionMedia | null;
  devices: Array<DeviceSessionMedia | null>;
  images: Array<ImageSessionMedia | null>;
};

const sessionMediaByTemplateId = new Map<string, TemplateSessionMedia>();

function cloneScreenVideo(video: ScreenVideo | null): ScreenVideo | null {
  return video ? { ...video, fit: { ...video.fit } } : null;
}

/** Captura todas as mídias enviadas da cena atual para lembrar nesta sessão. */
export function captureTemplateMedia(objects: SceneObject[]): TemplateSessionMedia {
  const devices: Array<DeviceSessionMedia | null> = [];
  const images: Array<ImageSessionMedia | null> = [];
  let audio: AudioSessionMedia | null = null;

  for (const object of objects) {
    if (isDeviceObject(object)) {
      const hasAnyMedia =
        object.imageName !== null ||
        object.screenVideo !== null ||
        object.outerImageName !== null ||
        object.outerScreenVideo !== null;

      devices.push(
        hasAnyMedia
          ? {
              imageFit: { ...object.imageFit },
              imageName: object.imageName,
              imageUrl: object.imageName !== null ? object.imageUrl : null,
              modelId: object.modelId,
              outerImageFit: { ...object.outerImageFit },
              outerImageName: object.outerImageName,
              outerImageUrl:
                object.outerImageName !== null ? object.outerImageUrl : null,
              outerScreenSource: object.outerScreenSource,
              outerScreenVideo: cloneScreenVideo(object.outerScreenVideo),
              screenSource: object.screenSource,
              screenVideo: cloneScreenVideo(object.screenVideo),
            }
          : null,
      );
      continue;
    }

    if (isImageObject(object)) {
      // Stickers já voltam com a arte pelo id no template; só imagens/GIFs enviados precisam do cache.
      images.push(
        !object.image.stickerId && object.image.url !== null
          ? {
              animation: object.image.animation,
              aspect: object.image.aspect,
              isVector: object.image.isVector,
              name: object.image.name,
              url: object.image.url,
            }
          : null,
      );
      continue;
    }

    if (isAudioObject(object) && object.audio) {
      audio = {
        audio: { ...object.audio },
        isVisible: object.isVisible,
        name: object.name,
      };
    }
  }

  return { audio, devices, images };
}

/** Guarda em memória as mídias atuais de um template nesta aba. */
export function saveTemplateSessionMedia(
  templateId: string,
  objects: SceneObject[],
) {
  sessionMediaByTemplateId.set(templateId, captureTemplateMedia(objects));
}

/** Remove o cache de sessão de um template (ex.: quando o usuário o apaga). */
export function clearTemplateSessionMedia(templateId: string) {
  sessionMediaByTemplateId.delete(templateId);
}

/** Limpa todo o cache de sessão (útil em testes). */
export function clearAllTemplateSessionMedia() {
  sessionMediaByTemplateId.clear();
}

/**
 * Reaplica as mídias guardadas na sessão sobre os objetos recém-reconstruídos
 * por `applySceneTemplate`, preservando telas, imagens soltas e música.
 */
export function restoreTemplateSessionMedia(
  templateId: string,
  objects: SceneObject[],
  mode: TemplateMode,
): SceneObject[] {
  const media = sessionMediaByTemplateId.get(templateId);

  if (!media) {
    return objects;
  }

  let deviceIndex = 0;
  let imageIndex = 0;
  let restoredAudio = false;

  const nextObjects = objects.map((object): SceneObject => {
    if (isDeviceObject(object)) {
      const saved = media.devices[deviceIndex++] ?? null;

      if (!saved || saved.modelId !== object.modelId) {
        return object;
      }

      const nextImageUrl = saved.imageUrl ?? object.imageUrl;
      const nextImageName = saved.imageName ?? object.imageName;
      const nextImageFit = saved.imageName
        ? { ...saved.imageFit }
        : object.imageFit;
      const nextScreenVideo =
        cloneScreenVideo(saved.screenVideo) ?? object.screenVideo;
      const nextPendingImageName = nextImageName
        ? null
        : (object.pendingScreen?.imageName ?? null);
      const nextPendingVideo = nextScreenVideo
        ? null
        : (object.pendingScreen?.video ?? null);
      const nextPendingScreen =
        nextPendingImageName || nextPendingVideo
          ? { imageName: nextPendingImageName, video: nextPendingVideo }
          : null;
      const nextScreenSource =
        saved.screenSource === "video" && nextScreenVideo
          ? "video"
          : saved.screenSource === "image" && nextImageName
            ? "image"
            : object.screenSource;

      const nextOuterImageUrl = saved.outerImageUrl ?? object.outerImageUrl;
      const nextOuterImageName = saved.outerImageName ?? object.outerImageName;
      const nextOuterImageFit = saved.outerImageName
        ? { ...saved.outerImageFit }
        : object.outerImageFit;
      const nextOuterScreenVideo =
        cloneScreenVideo(saved.outerScreenVideo) ?? object.outerScreenVideo;
      const nextPendingOuterImageName = nextOuterImageName
        ? null
        : (object.pendingOuterScreen?.imageName ?? null);
      const nextPendingOuterVideo = nextOuterScreenVideo
        ? null
        : (object.pendingOuterScreen?.video ?? null);
      const nextPendingOuterScreen =
        nextPendingOuterImageName || nextPendingOuterVideo
          ? {
              imageName: nextPendingOuterImageName,
              video: nextPendingOuterVideo,
            }
          : null;
      const nextOuterScreenSource =
        saved.outerScreenSource === "video" && nextOuterScreenVideo
          ? "video"
          : saved.outerScreenSource === "image" && nextOuterImageName
            ? "image"
            : object.outerScreenSource;

      return {
        ...object,
        imageFit: nextImageFit,
        imageName: nextImageName,
        imageUrl: nextImageUrl,
        outerImageFit: nextOuterImageFit,
        outerImageName: nextOuterImageName,
        outerImageUrl: nextOuterImageUrl,
        outerScreenSource: nextOuterScreenSource,
        outerScreenVideo: nextOuterScreenVideo,
        pendingOuterScreen: nextPendingOuterScreen,
        pendingScreen: nextPendingScreen,
        screenSource: nextScreenSource,
        screenVideo: nextScreenVideo,
      };
    }

    if (isImageObject(object)) {
      const saved = media.images[imageIndex++] ?? null;

      if (!saved || object.image.stickerId || object.image.url !== null) {
        return object;
      }

      return {
        ...object,
        image: {
          ...object.image,
          animation: saved.animation,
          aspect: saved.aspect,
          isVector: saved.isVector,
          name: saved.name,
          url: saved.url,
        },
      };
    }

    if (isAudioObject(object) && media.audio && !object.audio) {
      restoredAudio = true;

      return {
        ...object,
        audio: { ...media.audio.audio },
        isVisible: media.audio.isVisible,
        pendingAudio: null,
      };
    }

    return object;
  });

  // Se o usuário adicionou música no Vídeo sem sobrescrever o template, traz
  // a trilha de volta também ao retornar para o template na mesma sessão.
  if (mode === "motion" && media.audio && !restoredAudio) {
    nextObjects.push({
      ...createAudioObject({
        audio: { ...media.audio.audio },
        name: media.audio.name,
      }),
      isVisible: media.audio.isVisible,
    });
  }

  return nextObjects;
}
