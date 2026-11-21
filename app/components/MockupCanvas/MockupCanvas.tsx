"use client";

import "./MockupCanvas.css";
import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as THREE from "three";
import {
  Canvas,
  flushSync,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  Bounds,
  CameraControls,
  Environment,
  Grid,
  useBounds,
} from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import type { AppCopy, Locale, UiTheme } from "../../lib/i18n";
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "../../lib/storage";
import {
  CanvasErrorBoundary,
  CanvasRecoveryCard,
} from "./CanvasErrorBoundary";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  getActiveOuterScreenFit,
  getActiveOuterScreenVideo,
  getActiveScreenFit,
  getActiveScreenVideo,
  getActiveScreenVideos,
  getScreenVideoKey,
  getScreenVideoTime,
  isScreenVideoAtFileEnd,
  isDeviceObject,
  isImageObject,
  isTextObject,
  isUndrawnObject,
  DEFAULT_SCREEN_FIT,
  getMissingScreenImageUrl,
  type CameraObject,
  type DeviceObject,
  type SceneObject,
} from "../../lib/scene-objects";
import { getMissingScreenFileName } from "../../lib/screen-memory";
import {
  clearScreenFitOverrides,
  getScreenVideoElement,
  setScreenFitOverride,
  setScreenVideoShown,
} from "../../lib/screen-texture";
import {
  sampleAnimatedScreenFit,
  sampleScreenFit,
} from "../../lib/screen-fit-motion";
import type { CameraPose } from "../../lib/scene-templates";
import {
  AUTO_OBJECT_POSITIONS,
  OBJECT_POSITION_MULTIPLIER,
  OBJECT_POSITION_MULTIPLIER_Z,
} from "../../lib/scene-presets";
import {
  getPlaybackTimeMs,
  getSceneMotionDuration,
  hasMotion,
  sampleDisplayedMotion,
  sampleMotion,
} from "../../lib/scene-motion";
import { DEVICE_MODELS } from "../../models/device-models";
import FloatingCanvasControls from "../FloatingCanvasControls/FloatingCanvasControls";
import {
  downloadBlob,
  exportCanvasPhoto,
  formatTimestampForFilename,
} from "./export-photo";
import ActivityNotice from "../ActivityNotice/ActivityNotice";
import { SegmentedTabs } from "../EditorPrimitives/EditorPrimitives";
import ExportProgressDialog, {
  type VideoExportProgress,
} from "../FloatingCanvasControls/ExportProgressDialog";
import {
  VideoExportCanceledError,
  createVideoFrameRenderer,
  encodeVideo,
} from "./export-video";
import {
  getCameraLimits,
  getOrbitBoundary,
  type VisibleShare,
} from "./camera-limits";
import {
  FULL_ALIGNMENT_AREA,
  collectWorldVertices,
  getAlignmentOffset,
  type AlignmentArea,
  type ObjectAlignment,
} from "./object-alignment";
import { applyObjectOpacity, orderObjectGroups } from "./object-opacity";
import type { CanvasGrid } from "../../lib/canvas-grid";
import {
  DEFAULT_CANVAS_COLOR,
  getBackgroundLook,
  getBackgroundLookCss,
  getCanvasBackgroundCss,
  getSceneBackgroundLook,
  sampleBackgroundLook,
  type BackgroundLook,
  type CanvasBackground,
} from "../../lib/canvas-background";
import { findBackgroundObject } from "../../lib/background-objects";
import type { Keyframe as MotionKeyframe } from "../../lib/scene-motion";
import type { BackgroundEditor } from "../BackgroundFields/BackgroundFields";
import {
  DEFAULT_CAMERA_FOV,
  lookAtToOrbit,
  orbitToLookAt,
  type CameraOrbit,
} from "../../lib/camera-orbit";
import { createCameraObject, findCameraObject } from "../../lib/camera-objects";
import { applyImageAnimationTime } from "./image-animation";
import { applyTextStyle } from "./text-style";
import { SceneImageMesh } from "./SceneImageMesh";
import { SceneTextMesh } from "./SceneTextMesh";
import { applyDuoFoldAngle, Duo } from "../Duo";
import { warmUpModels } from "../../lib/model-warmup";
import TimelineResizeHandle, {
  clampTimelineHeight,
} from "../MotionTimeline/TimelineResizeHandle";
import {
  estimateRemainingMs,
  getVideoExportFilename,
  getVideoExportSize,
  getVideoFrameTimes,
  type VideoExportSettings,
} from "../../lib/video-export";

/** Um pedido de exportação de vídeo, já com tudo decidido pelo modal. */
export type VideoExportRequest = {
  /** Com o fundo da cena (o do Fundo em cada quadro), ou transparente. */
  background: boolean;
  frameTimes: number[];
  onProgress: (done: number, total: number) => void;
  settings: VideoExportSettings;
  signal: AbortSignal;
  size: MotionFrame;
};

export type VideoExportHandler = (request: VideoExportRequest) => Promise<Blob>;

export type ExportPreset = {
  height: number;
  label: string;
  width: number;
  // Quando true, o PNG é exportado com a cor de fundo do canvas (backgroundColor).
  // Quando false/omitido, o fundo fica transparente (comportamento padrão).
  includeBackground?: boolean;
  /** O fundo: uma cor lisa é a de limpeza; um degradê sai pintado por baixo. */
  backgroundLook?: BackgroundLook;
};

type MockupCanvasProps = {
  /** O estilo do fundo: chão 3D (com as linhas) ou liso, com degradê ou não. */
  background: CanvasBackground;
  bgColor: string | null;
  copy: AppCopy;
  /** As linhas do chão: a cor (ou automática) e a opacidade. */
  grid: CanvasGrid;
  isUiHidden: boolean;
  locale: Locale;
  objects: SceneObject[];
  /**
   * O que os campos do fundo editam (o fundo da cena ou o keyframe do Fundo
   * selecionado), ou `null` quando o Fundo anima e nenhum keyframe dele está
   * selecionado.
   */
  backgroundEditor: BackgroundEditor | null;
  onCameraApiReady: (api: CameraApi | null) => void;
  /** A câmera parou depois de um gesto: quem mostra a órbita a lê de novo. */
  onCameraRest?: () => void;
  /**
   * A câmera parou depois de uma ação do usuário sobre a vista (gesto, setas,
   * zoom, "Enquadrar cena", "Enquadrar objeto", "Resetar câmera"), e não por
   * um keyframe ou template: quem tem um keyframe da câmera selecionado grava
   * nele a vista nova.
   */
  onCameraViewEdited?: () => void;
  /** A URL desta cena, para abrir em outro navegador (ver scene-link.ts). */
  onCreateProjectLink?: () => Promise<string>;
  onNotify?: (tone: "error" | "success", message: string) => void;
  onSaveTemplate?: () => void;
  onSelectObject: (id: string) => void;
  onTemplateApplied: () => void;
  onToggleUiHidden: () => void;
  // Enquadramento a restaurar — o de um template ou o de um modo ao voltar
  // para ele —, aplicado como último passo, quando a cena assenta.
  pendingCameraPose: CameraPose | null;
  /** O pendente é um template: a cena fica bloqueada por um loading. */
  isApplyingTemplate: boolean;
  /** Instante inicial do preview de movimento; null = parado. */
  motionStartedAt: number | null;
  /** Instante da cena a exibir quando parado; null = mostrar a pose estática. */
  motionPlayheadMs: number | null;
  isMotionMode: boolean;
  /**
   * Tamanho do vídeo, só no Movimento: o canvas assume a proporção dele, então
   * a câmera, o auto-fit e o "Enquadrar cena" já enxergam o quadro final.
   */
  motionFrame: MotionFrame | null;
  onMotionModeChange: (isMotionMode: boolean) => void;
  /** Para o preview: exportar vídeo toma conta da cena. */
  onStopMotion: () => void;
  /** A timeline em si; o canvas só reserva o rodapé para ela. */
  timeline: ReactNode;
  scaleOverrides: ScaleOverrides;
  spawnOverrides: SpawnOverrides;
  uiTheme: UiTheme;
};

export type CameraApi = {
  fitObject: (id: string) => void;
  /** Volta a vista ao enquadramento de todos os objetos, com a lente padrão. */
  resetView: () => void;
  /**
   * Quanto mover um objeto, em coordenadas do mundo, para alinhá-lo ao quadro
   * do canvas — no Movimento, o do vídeo exportado —, sem mudar a distância
   * até a câmera. `null` se o objeto não está na cena.
   */
  getAlignmentOffset: (
    id: string,
    alignment: ObjectAlignment,
  ) => [number, number, number] | null;
  getPose: () => CameraPose | null;
  setPose: (pose: CameraPose) => void;
  /** A câmera como órbita (o que se anima); `null` sem câmera de perspectiva. */
  getOrbit: () => CameraOrbit | null;
  /** O intervalo de distância que a trava da cena permite agora. */
  getDistanceRange: () => [number, number] | null;
  /** Leva a câmera a uma órbita, na hora (um campo do Inspector mudou). */
  setOrbit: (orbit: CameraOrbit) => void;
};

type ViewportControlsApi = {
  fitToScene: () => void;
  panDown: () => void;
  panLeft: () => void;
  panRight: () => void;
  panUp: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export type SpawnOverrides = Record<number, [number, number, number]>;
export type ScaleOverrides = Record<number, number>;

type SceneBridgeProps = MockupCanvasProps & {
  /** Preparo do primeiro quadro de um modo (ver prepareModeFrame). */
  modeFrameRef: { current: ((pose: CameraPose | null) => void) | null };
  /** A área de referência do alinhamento no Estático (ver `.canvas-align-area`). */
  alignmentAreaRef: { current: HTMLDivElement | null };
  /** O fundo que o editor mostra agora (no Vídeo, o do playhead). */
  backgroundLook: BackgroundLook;
  /** O fundo da cena, quando o Fundo não tem keyframes. */
  sceneBackgroundLook: BackgroundLook;
  /** O quadro do vídeo, cujo fundo o play escreve direto. */
  frameRef: { current: HTMLDivElement | null };
  // true quando todos os objetos visíveis já resolveram — só então a pose
  // pendente é considerada aplicada em definitivo.
  isSceneSettled: boolean;
  onExportReady: (
    handler: ((preset: ExportPreset) => Promise<void>) | null,
  ) => void;
  onObjectLoadStateChange: (id: string, isLoading: boolean) => void;
  onObjectResolved: (id: string) => void;
  onSelectObject: (id: string) => void;
  onVideoExportReady: (handler: VideoExportHandler | null) => void;
  onViewportControlsReady: (api: ViewportControlsApi | null) => void;
  sceneFitKey: string;
  spawnOverrides: SpawnOverrides;
};


const TIMELINE_HEIGHT_KEY = "mock-photo-timeline-height";

const CAMERA_POSITION: [number, number, number] = [0, 0, 5];
const CAMERA_FOV = 45;
// Passo das setas de pan, como fração da distância da câmera ao alvo — o
// deslocamento acompanha o zoom em vez de ser fixo em pixels.
const PAN_STEP_RATIO = 0.04;
const ANGLE_LIMITS = {
  maxAzimuthAngle: 0.85,
  maxPolarAngle: Math.PI * 0.68,
  minAzimuthAngle: -0.85,
  minPolarAngle: Math.PI * 0.32,
};
/**
 * Com a câmera animada o limite do gesto sairia no caminho: uma volta de 360°
 * passa de qualquer azimute. Livre na horizontal, e na vertical só um pouco
 * antes dos polos, onde a órbita giraria de ponta-cabeça.
 */
const ANIMATED_ANGLE_LIMITS = {
  maxAzimuthAngle: Infinity,
  maxPolarAngle: Math.PI * (1 - 5 / 180),
  minAzimuthAngle: -Infinity,
  minPolarAngle: Math.PI * (5 / 180),
};
function getObjectPosition(
  index: number,
  overrides: SpawnOverrides,
): [number, number, number] {
  if (overrides[index]) return overrides[index];
  if (AUTO_OBJECT_POSITIONS[index]) return AUTO_OBJECT_POSITIONS[index];
  const side = index % 2 === 0 ? 1 : -1;
  const ring = Math.floor(index / 2);
  return [side * (0.7 + ring * 0.28), 0, side * 0.12];
}

/**
 * A posição de um texto: só o que o usuário escreveu nos campos. Os aparelhos
 * ganham uma posição de partida por índice (lado a lado) e um deslocamento do
 * modelo; o texto não — nasce onde o usuário o põe, sem empurrar nem ser
 * empurrado pelos aparelhos.
 */
function getResolvedTextPosition(object: {
  positionX: number;
  positionY: number;
  positionZ: number;
}): [number, number, number] {
  return [
    object.positionX * OBJECT_POSITION_MULTIPLIER,
    object.positionY * OBJECT_POSITION_MULTIPLIER,
    object.positionZ * OBJECT_POSITION_MULTIPLIER_Z,
  ];
}

function getResolvedObjectPosition(
  object: SceneObject,
  index: number,
  overrides: SpawnOverrides,
  modelSpawnOffset: [number, number, number],
): [number, number, number] {
  const [baseX, baseY, baseZ] = getObjectPosition(index, overrides);
  const [offX, offY, offZ] = modelSpawnOffset;

  return [
    baseX + offX + object.positionX * OBJECT_POSITION_MULTIPLIER,
    baseY + offY + object.positionY * OBJECT_POSITION_MULTIPLIER,
    baseZ + offZ + object.positionZ * OBJECT_POSITION_MULTIPLIER_Z,
  ];
}

/**
 * Escreve no grupo a pose de um objeto num instante da cena. É o que o preview
 * faz a cada quadro e o que a exportação de vídeo faz por quadro — a mesma
 * conta, para o arquivo não divergir do editor. Sem keyframes, não mexe.
 */
/**
 * O enquadramento que a tela mostra parada: o do arquivo e, no Vídeo, com o
 * zoom, a posição e o fundo do playhead.
 */
function getDisplayedScreenFit(
  object: DeviceObject,
  screen: "main" | "outer",
  playheadMs: number | null,
) {
  const base =
    screen === "outer" ? getActiveOuterScreenFit(object) : getActiveScreenFit(object);

  return playheadMs === null
    ? base
    : sampleScreenFit(object.keyframes, playheadMs, screen, base);
}

/** O enquadramento animado de cada tela do aparelho num instante, ou nada. */
function applyScreenFits(object: DeviceObject, timeMs: number) {
  setScreenFitOverride(
    getScreenVideoKey(object.id, "main"),
    sampleAnimatedScreenFit(object.keyframes, timeMs, "main", getActiveScreenFit(object)),
  );

  if (object.modelId === "duo") {
    setScreenFitOverride(
      getScreenVideoKey(object.id, "outer"),
      sampleAnimatedScreenFit(
        object.keyframes,
        timeMs,
        "outer",
        getActiveOuterScreenFit(object),
      ),
    );
  }
}

function applyMotionPose(
  group: THREE.Group,
  object: SceneObject,
  index: number,
  timeMs: number,
  spawnOverrides: SpawnOverrides,
): Promise<void> | undefined {
  // Uma imagem animada toca no Vídeo mesmo sem keyframes (então não há pose a
  // escrever, só o instante): o do objeto é o da cena menos o seu início.
  if (isImageObject(object) && object.image.animation) {
    applyImageAnimationTime(
      group,
      Math.max(0, timeMs - (object.keyframes[0]?.timeMs ?? 0)),
    );
  }

  // Zoom, posição e fundo de cada tela que anima, para o compositor ler no
  // mesmo quadro (ele roda antes do render da cena).
  if (isDeviceObject(object)) {
    applyScreenFits(object, timeMs);
  }

  const sampled = sampleDisplayedMotion(object, timeMs);

  if (!sampled) {
    return undefined;
  }

  // Reusa a mesma resolução de posição do render estático para o preview não
  // divergir do que o objeto mostra parado.
  const [x, y, z] = isDeviceObject(object)
    ? getResolvedObjectPosition(
        { ...object, ...sampled },
        index,
        spawnOverrides,
        DEVICE_MODELS[object.modelId].modelSpawnOffset,
      )
    : getResolvedTextPosition(sampled);

  group.position.set(x, y, z);
  group.rotation.set(
    (sampled.rotationX * Math.PI) / 180,
    (sampled.rotationY * Math.PI) / 180,
    (sampled.rotationZ * Math.PI) / 180,
  );
  group.scale.setScalar(sampled.scale);
  // Junto com a pose, no mesmo quadro: o OpacityController roda antes do
  // preview em cada quadro e, sozinho, deixaria a opacidade um quadro atrás —
  // no primeiro quadro do play, com a da pose estática (um objeto que entra
  // invisível piscaria). O userData fica para ele manter o valor depois.
  group.userData.opacity = sampled.opacity;
  applyObjectOpacity(group, sampled.opacity);

  // A abertura do dobrável é pose também, e vai pelo mesmo caminho.
  if (isDeviceObject(object) && object.modelId === "duo") {
    applyDuoFoldAngle(group, sampled.foldAngle ?? object.foldAngle);
  }

  // Cor e espaço entre letras do texto: também pose. Quem devolve a promessa é
  // a exportação, que espera a composição antes de renderizar o quadro.
  if (isTextObject(object)) {
    return applyTextStyle(group, {
      color: sampled.textColor ?? object.text.color,
      letterSpacing: sampled.letterSpacing ?? object.text.letterSpacing,
    });
  }

  return undefined;
}

/**
 * Leva a opacidade de cada objeto aos materiais, a cada quadro. A opacidade
 * fica em `userData` do grupo — vinda do render parado ou escrita pelo preview
 * e pela exportação de vídeo, que também a aplicam na hora (applyMotionPose)
 * —, e este controlador a mantém: os modelos trocam materiais quando querem.
 */
function OpacityController({
  groupsRef,
}: {
  groupsRef: { current: Map<string, THREE.Group> };
}) {
  useFrame(({ camera }) => {
    orderObjectGroups(groupsRef.current.values(), camera);

    for (const group of groupsRef.current.values()) {
      applyObjectOpacity(group, group.userData.opacity ?? 1);
    }
  });

  return null;
}

function SceneBridge({
  alignmentAreaRef,
  backgroundLook,
  copy,
  frameRef,
  motionFrame,
  sceneBackgroundLook,
  modeFrameRef,
  isSceneSettled,
  objects,
  onCameraApiReady,
  onCameraRest,
  onCameraViewEdited,
  onExportReady,
  onObjectLoadStateChange,
  onObjectResolved,
  motionPlayheadMs,
  motionStartedAt,
  onSelectObject,
  onTemplateApplied,
  onVideoExportReady,
  onViewportControlsReady,
  pendingCameraPose,
  scaleOverrides,
  sceneFitKey,
  spawnOverrides,
}: SceneBridgeProps) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const gridRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Group | null>(null);
  // Refs por objeto: o preview de movimento escreve no grupo direto, e eles
  // nascem dentro de um .map, então não dá para ter um useRef por objeto.
  const objectGroupsRef = useRef(new Map<string, THREE.Group>());
  const { advance, camera, gl, scene, size } = useThree();
  // A câmera da cena e se ela está animada: com keyframes, o limite de ângulo
  // do gesto sai da frente e o auto-enquadramento não briga com ela.
  const cameraObject = findCameraObject(objects);
  const hasCameraMotion = (cameraObject?.keyframes.length ?? 0) > 0;
  // Enquanto um vídeo é exportado, os vídeos das telas são do exportador: o
  // controlador do editor não pode posicioná-los no playhead por cima.
  const isExportingVideoRef = useRef(false);
  // A exportação lê a cena de quando roda, não de quando foi registrada.
  const latestSceneRef = useRef({
    motionPlayheadMs,
    objects,
    sceneBackgroundLook,
    spawnOverrides,
  });
  latestSceneRef.current = {
    motionPlayheadMs,
    objects,
    sceneBackgroundLook,
    spawnOverrides,
  };
  const backgroundObject = motionFrame ? findBackgroundObject(objects) : null;
  const isBackgroundAnimated = (backgroundObject?.keyframes.length ?? 0) > 0;

  // Parado, a grade é a do fundo de agora. Vai direto aos uniformes (além das
  // props): o play os escreve quadro a quadro, e uma prop que o React acha que
  // não mudou não seria reposta quando ele para.
  useLayoutEffect(() => {
    if (motionStartedAt === null) {
      applyBackgroundLook(gridRef.current, null, backgroundLook);
    }
  }, [backgroundLook, motionStartedAt]);

  function handleObjectDoubleClick(
    event: ThreeEvent<MouseEvent>,
    objectId: string,
  ) {
    event.stopPropagation();
    onSelectObject(objectId);
  }

  useEffect(() => {
    onExportReady(async (preset) => {
      await exportCanvasPhoto({ camera, gl, gridRef, preset, scene });
    });

    return () => {
      onExportReady(null);
    };
  }, [camera, gl, onExportReady, scene, size]);

  useEffect(() => {
    function applyPoses(
      timeMs: number,
      {
        objects: current,
        sceneBackgroundLook: sceneLook,
        spawnOverrides: overrides,
      } = latestSceneRef.current,
    ) {
      // O fundo do instante: a grade sempre; o quadro, só com o Fundo
      // animado (sem ele, o quadro é do React, que mostra o palco do tema).
      const backgroundKeyframes = findBackgroundObject(current)?.keyframes ?? [];

      applyBackgroundLook(
        gridRef.current,
        backgroundKeyframes.length > 0 ? frameRef.current : null,
        getSceneBackgroundLook(backgroundKeyframes, sceneLook, timeMs),
      );

      // Mesma contagem do render: a posição de spawn depende do índice entre
      // os aparelhos visíveis (o texto não entra na conta).
      let deviceIndex = 0;
      const pending: Array<Promise<void>> = [];

      // A câmera, com a mesma conta do preview: a cena exportada tem a órbita
      // de cada quadro, e só assim o arquivo sai igual ao que o editor mostra.
      const controls = controlsRef.current;
      const orbit = sampleMotion(
        findCameraObject(current) ?? EMPTY_CAMERA,
        timeMs,
      )?.orbit;

      if (controls && orbit) {
        applyCameraOrbit(controls, orbit, sceneRef.current, FULL_VISIBLE_SHARE);
      }

      current
        .filter((object) => object.isVisible)
        .forEach((object) => {
          const group = objectGroupsRef.current.get(object.id);
          const index = isDeviceObject(object) ? deviceIndex++ : 0;

          if (group) {
            const composed = applyMotionPose(
              group,
              object,
              index,
              timeMs,
              overrides,
            );

            if (composed) pending.push(composed);
          }
        });

      return Promise.all(pending).then(() => undefined);
    }

    onVideoExportReady(async (request) => {
      isExportingVideoRef.current = true;
      // O vídeo é da cena de quando se clicou em exportar: os painéis
      // continuam abertos, e mexer num objeto agora não pode mudar o arquivo
      // no meio.
      const exported = latestSceneRef.current;

      const renderer = createVideoFrameRenderer(
        {
          advance,
          applyPoses: (timeMs) => applyPoses(timeMs, exported),
          camera,
          gl,
          gridRef,
          objects: () => exported.objects,
          // Volta ao instante que o editor mostrava; os vídeos das telas o
          // controlador reposiciona sozinho no próximo quadro.
          restore: () => {
            void applyPoses(latestSceneRef.current.motionPlayheadMs ?? 0);
            // Parada, a tela é a das props: o enquadramento por quadro sai.
            clearScreenFitOverrides();
          },
          scene,
        },
        request.size,
        request.background
          ? (timeMs) =>
              getSceneBackgroundLook(
                findBackgroundObject(exported.objects)?.keyframes ?? [],
                exported.sceneBackgroundLook,
                timeMs,
              )
          : null,
      );

      try {
        return await encodeVideo({
          frameTimes: request.frameTimes,
          onProgress: request.onProgress,
          renderer,
          settings: request.settings,
          signal: request.signal,
        });
      } finally {
        renderer.end();
        isExportingVideoRef.current = false;
      }
    });

    return () => {
      onVideoExportReady(null);
    };
  }, [advance, camera, frameRef, gl, onVideoExportReady, scene]);

  const visibleObjects = objects.filter((object) => object.isVisible);
  const sceneDurationMs = useMemo(() => getSceneMotionDuration(objects), [objects]);
  // A posição de partida de um aparelho depende do índice entre os aparelhos
  // visíveis; o texto não entra na conta, ou criar um texto empurraria os
  // aparelhos para outro lugar.
  const deviceIndexById = new Map(
    visibleObjects.filter(isDeviceObject).map((object, index) => [object.id, index]),
  );

  return (
    <>
      <Environment preset="studio" />
      {motionStartedAt !== null && isBackgroundAnimated && backgroundObject ? (
        <BackgroundMotion
          frameRef={frameRef}
          gridRef={gridRef}
          keyframes={backgroundObject.keyframes}
          sceneDurationMs={sceneDurationMs}
          startedAt={motionStartedAt}
        />
      ) : null}
      <Grid
        ref={gridRef}
        // No fundo liso não há chão (opacidade 0). As exportações leem esta
        // visibilidade.
        visible={backgroundLook.grid.opacity > 0}
        position={[0, -300, 0]}
        cellSize={50}
        cellThickness={0.5}
        cellColor={backgroundLook.grid.cell}
        sectionSize={200}
        sectionThickness={1}
        sectionColor={backgroundLook.grid.section}
        fadeDistance={5500}
        fadeStrength={0.9}
        infiniteGrid
      />
      <Bounds margin={1.18}>
        <group ref={sceneRef}>
          {visibleObjects.map((object) => {
            if (isTextObject(object)) {
              const sampledText =
                motionPlayheadMs !== null
                  ? sampleDisplayedMotion(object, motionPlayheadMs)
                  : null;
              const shownText = sampledText
                ? { ...object, ...sampledText }
                : object;

              return (
                <Suspense
                  key={object.id}
                  fallback={
                    <SceneObjectLoadingFallback
                      id={object.id}
                      onObjectLoadStateChange={onObjectLoadStateChange}
                    />
                  }
                >
                  {motionStartedAt !== null && hasMotion(object) ? (
                    <MotionDriver
                      groupsRef={objectGroupsRef}
                      index={0}
                      object={object}
                      sceneDurationMs={sceneDurationMs}
                      spawnOverrides={spawnOverrides}
                      startedAt={motionStartedAt}
                    />
                  ) : null}
                  <group
                    name={object.id}
                    ref={(node) => {
                      if (node) {
                        objectGroupsRef.current.set(object.id, node);
                      } else {
                        objectGroupsRef.current.delete(object.id);
                      }
                    }}
                    onDoubleClick={(event) =>
                      handleObjectDoubleClick(event, object.id)
                    }
                    position={getResolvedTextPosition(shownText)}
                    rotation={[
                      (shownText.rotationX * Math.PI) / 180,
                      (shownText.rotationY * Math.PI) / 180,
                      (shownText.rotationZ * Math.PI) / 180,
                    ]}
                    scale={shownText.scale}
                    userData-isText
                    userData-opacity={shownText.opacity}
                  >
                    {/* O texto só está pronto depois da composição (a caixa
                        dele ainda não existe antes): é então que a cena o
                        conta como carregado e se enquadra de novo. */}
                    <SceneTextMesh
                      onSync={() => onObjectResolved(object.id)}
                      isPlaying={motionStartedAt !== null}
                      opacity={shownText.opacity}
                      text={{
                        ...object.text,
                        color: sampledText?.textColor ?? object.text.color,
                        letterSpacing:
                          sampledText?.letterSpacing ?? object.text.letterSpacing,
                      }}
                    />
                  </group>
                </Suspense>
              );
            }

            if (isImageObject(object)) {
              const sampledImage =
                motionPlayheadMs !== null
                  ? sampleDisplayedMotion(object, motionPlayheadMs)
                  : null;
              const shownImage = sampledImage
                ? { ...object, ...sampledImage }
                : object;
              // O instante da animação com a cena parada: o playhead menos o
              // início do objeto. No Estático, `null`: o quadro-cartaz.
              const animationTimeMs =
                motionPlayheadMs !== null
                  ? Math.max(
                      0,
                      motionPlayheadMs - (object.keyframes[0]?.timeMs ?? 0),
                    )
                  : null;

              return (
                <Fragment key={object.id}>
                  {motionStartedAt !== null &&
                  (hasMotion(object) || object.image.animation) ? (
                    <MotionDriver
                      groupsRef={objectGroupsRef}
                      index={0}
                      object={object}
                      sceneDurationMs={sceneDurationMs}
                      spawnOverrides={spawnOverrides}
                      startedAt={motionStartedAt}
                    />
                  ) : null}
                  {/* O plano existe desde o primeiro render (com o tamanho
                      da proporção): a cena já pode se enquadrar nele, mesmo
                      com o arquivo ainda decodificando. */}
                  <SceneObjectResolvedReporter
                    id={object.id}
                    modelId="image"
                    onObjectResolved={onObjectResolved}
                  />
                  <group
                    name={object.id}
                    ref={(node) => {
                      if (node) {
                        objectGroupsRef.current.set(object.id, node);
                      } else {
                        objectGroupsRef.current.delete(object.id);
                      }
                    }}
                    onDoubleClick={(event) =>
                      handleObjectDoubleClick(event, object.id)
                    }
                    position={getResolvedTextPosition(shownImage)}
                    rotation={[
                      (shownImage.rotationX * Math.PI) / 180,
                      (shownImage.rotationY * Math.PI) / 180,
                      (shownImage.rotationZ * Math.PI) / 180,
                    ]}
                    scale={shownImage.scale}
                    userData-isImage
                    userData-opacity={shownImage.opacity}
                  >
                    <SceneImageMesh
                      animationTimeMs={animationTimeMs}
                      emptyLabel={copy.imageEmptyLabel}
                      image={object.image}
                      isPlaying={motionStartedAt !== null}
                      opacity={shownImage.opacity}
                    />
                  </group>
                </Fragment>
              );
            }

            // A câmera não se desenha: ela é o ponto de vista, não uma coisa na
            // cena (ver `CameraMotion`). O Fundo também não: ele é o palco e a
            // grade (ver `BackgroundMotion`). Nem a música, que só se ouve.
            if (isUndrawnObject(object)) {
              return null;
            }

            const index = deviceIndexById.get(object.id) ?? 0;
            const model = DEVICE_MODELS[object.modelId];
            // Em modo movimento a cena inteira mostra o instante do playhead.
            // É só exibição: o transform estático do objeto não é tocado.
            const sampled =
              motionPlayheadMs !== null
                ? sampleDisplayedMotion(object, motionPlayheadMs)
                : null;
            const displayed = sampled ? { ...object, ...sampled } : object;

            return (
              <Suspense
                key={object.id}
                fallback={
                  <SceneObjectLoadingFallback
                    id={object.id}
                    onObjectLoadStateChange={onObjectLoadStateChange}
                  />
                }
              >
                <SceneObjectResolvedReporter
                  id={object.id}
                  modelId={object.modelId}
                  onObjectResolved={onObjectResolved}
                />
                {motionStartedAt !== null && hasMotion(object) ? (
                  <MotionDriver
                    groupsRef={objectGroupsRef}
                    index={index}
                    object={object}
                    sceneDurationMs={sceneDurationMs}
                    spawnOverrides={spawnOverrides}
                    startedAt={motionStartedAt}
                  />
                ) : null}
                <group
                  name={object.id}
                  ref={(node) => {
                    if (node) {
                      objectGroupsRef.current.set(object.id, node);
                    } else {
                      objectGroupsRef.current.delete(object.id);
                    }
                  }}
                  onDoubleClick={(event) =>
                    handleObjectDoubleClick(event, object.id)
                  }
                  position={getResolvedObjectPosition(displayed, index, spawnOverrides, model.modelSpawnOffset)}
                  rotation={[
                    (displayed.rotationX * Math.PI) / 180,
                    (displayed.rotationY * Math.PI) / 180,
                    (displayed.rotationZ * Math.PI) / 180,
                  ]}
                  scale={displayed.scale}
                  // Um número, não um objeto: o R3F compara objetos por
                  // referência e reaplicaria a opacidade do instante parado a
                  // cada render — por cima da do preview ou da exportação.
                  userData-opacity={displayed.opacity}
                >
                  <group
                    rotation={model.baseRotation}
                    scale={model.modelScale.map((s) => s * (scaleOverrides[index] ?? 1)) as [number, number, number]}
                  >
                    <group position={model.pivotOffset}>
                    {(() => {
                    // Uma tela de template que espera o arquivo de volta mostra
                    // o pedido, sem o enquadramento salvo (que é do arquivo e
                    // cortaria o texto).
                    const screen = getMissingScreen(object, "main", object.modelId, copy);
                    const outer = getMissingScreen(object, "outer", "duo-outer", copy);

                    return object.modelId === "duo" ? (
                      // O único com duas telas e dobra: recebe a tela de
                      // fora e a abertura, que os outros não têm.
                      <Duo
                        colors={object.colors}
                        debugPartColors={
                          object.debugMode ? object.debugPartColors : undefined
                        }
                        foldAngle={displayed.foldAngle}
                        matteFinish={object.matteFinish}
                        imageUrl={screen?.url ?? object.imageUrl}
                        outerImageUrl={outer?.url ?? object.outerImageUrl}
                        outerScreenFit={
                          outer?.fit ??
                          getDisplayedScreenFit(object, "outer", motionPlayheadMs)
                        }
                        outerVideoKey={getScreenVideoKey(object.id, "outer")}
                        outerVideoUrl={getActiveOuterScreenVideo(object)?.url ?? null}
                        videoUrl={getActiveScreenVideo(object)?.url ?? null}
                        videoKey={object.id}
                        screenFit={
                          screen?.fit ?? getDisplayedScreenFit(object, "main", motionPlayheadMs)
                        }
                        showDeviceShell={object.showDeviceShell}
                        showTabletBezel={object.showTabletBezel}
                      />
                    ) : (
                    <model.component
                      colors={object.colors}
                      debugPartColors={
                        object.debugMode ? object.debugPartColors : undefined
                      }
                      imageUrl={screen?.url ?? object.imageUrl}
                      videoUrl={getActiveScreenVideo(object)?.url ?? null}
                      videoKey={object.id}
                      screenFit={
                        screen?.fit ?? getDisplayedScreenFit(object, "main", motionPlayheadMs)
                      }
                      screenPosition={model.screenPosition}
                      screenSize={model.screenSize}
                      showDeviceShell={object.showDeviceShell}
                      showNotebookKeyboard={object.showNotebookKeyboard}
                      showTabletBezel={object.showTabletBezel}
                      // Só o relógio tem a opção; nos outros a prop iria parar
                      // no grupo 3D, que não a conhece.
                      {...(object.modelId === "smartwatch"
                        ? { matteFinish: object.matteFinish }
                        : {})}
                    />
                    );
                    })()}
                    </group>
                  </group>
                </group>
              </Suspense>
            );
          })}
        </group>
        <OpacityController groupsRef={objectGroupsRef} />
        <CameraMotion
          controlsRef={controlsRef}
          settleKey={`${sceneFitKey}:${isSceneSettled}`}
          motionPlayheadMs={motionPlayheadMs}
          motionStartedAt={motionStartedAt}
          object={cameraObject}
          sceneRef={sceneRef}
        />
        <ScreenVideoController
          isPausedRef={isExportingVideoRef}
          motionPlayheadMs={motionPlayheadMs}
          motionStartedAt={motionStartedAt}
          objects={objects}
        />
        <BoundsResetController
          alignmentAreaRef={alignmentAreaRef}
          modeFrameRef={modeFrameRef}
          controlsRef={controlsRef}
          isSceneSettled={isSceneSettled}
          hasCameraMotion={hasCameraMotion}
          onCameraApiReady={onCameraApiReady}
          onCameraRest={onCameraRest}
          onCameraViewEdited={onCameraViewEdited}
          onTemplateApplied={onTemplateApplied}
          pendingCameraPose={pendingCameraPose}
          sceneFitKey={sceneFitKey}
          onViewportControlsReady={onViewportControlsReady}
          sceneRef={sceneRef}
        />
      </Bounds>
      <CameraControls
        ref={controlsRef}
        makeDefault
        {...(hasCameraMotion ? ANIMATED_ANGLE_LIMITS : ANGLE_LIMITS)}
        dampingFactor={0.08}
        azimuthRotateSpeed={1}
        dollyToCursor
        dollySpeed={3}
        mouseButtons={{
          left: CameraControlsImpl.ACTION.ROTATE,
          middle: CameraControlsImpl.ACTION.DOLLY,
          right: CameraControlsImpl.ACTION.TRUCK,
          wheel: CameraControlsImpl.ACTION.DOLLY,
        }}
        polarRotateSpeed={1}
        touches={{
          one: CameraControlsImpl.ACTION.TOUCH_ROTATE,
          two: CameraControlsImpl.ACTION.TOUCH_DOLLY_TRUCK,
          three: CameraControlsImpl.ACTION.NONE,
        }}
      />
    </>
  );
}

/**
 * Reproduz os keyframes de um objeto escrevendo direto no grupo 3D. Passar por
 * estado do React a cada quadro re-renderizaria a árvore inteira 60x por
 * segundo; aqui o React só sabe do início e do fim do preview.
 */
/** Desvio tolerado no play antes de corrigir com um seek, em segundos. */
const VIDEO_DRIFT_TOLERANCE_S = 0.12;
/** Diferença mínima para valer um seek com o vídeo parado: ~meio quadro. */
const VIDEO_SEEK_EPSILON_S = 0.015;

/**
 * Dono do tempo dos vídeos das telas. A cada quadro decide, por objeto, em que
 * instante o vídeo deve estar:
 * - Movimento parado: no instante do playhead;
 * - Movimento tocando: tocando junto com o relógio da cena, corrigido por seek
 *   só quando se desvia — seek a cada quadro travaria a decodificação.
 * Mesmo padrão do MotionDriver: escreve direto no elemento, sem estado React.
 */
/** Se alguma tela do objeto escolheu vídeo (haja ou não arquivo enviado). */
const hasVideoSource = (object: SceneObject) =>
  isDeviceObject(object) &&
  (object.screenSource === "video" || object.outerScreenSource === "video");

function ScreenVideoController({
  isPausedRef,
  motionPlayheadMs,
  motionStartedAt,
  objects,
}: {
  /** Durante a exportação de vídeo, quem posiciona os vídeos é o exportador. */
  isPausedRef: { current: boolean };
  motionPlayheadMs: number | null;
  motionStartedAt: number | null;
  objects: SceneObject[];
}) {
  const sceneDurationMs = useMemo(() => getSceneMotionDuration(objects), [objects]);

  useFrame(() => {
    if (isPausedRef.current) {
      return;
    }

    // Sem nenhum vídeo escolhido — o caso comum — não há o que montar: este
    // quadro roda a 60 por segundo, e a lista abaixo é uma alocação a cada um.
    if (!objects.some(hasVideoSource)) {
      return;
    }

    // Um vídeo por tela: o dobrável pode ter dois, cada um no seu elemento e
    // no seu trecho da timeline.
    for (const { key, video } of objects.flatMap(getActiveScreenVideos)) {
      const element = getScreenVideoElement(key);

      if (!element || element.readyState < 1) {
        continue;
      }

      const isPlaying = motionStartedAt !== null;
      // Vídeo só existe no Movimento, onde sempre há um instante: o do
      // relógio tocando ou o do playhead.
      const sceneTimeMs = isPlaying
        ? getPlaybackTimeMs(motionStartedAt, Date.now(), sceneDurationMs)
        : (motionPlayheadMs ?? 0);
      const targetMs = getScreenVideoTime(video, sceneTimeMs);

      // Fora do trecho do clipe a tela fica sem vídeo, só com o fundo.
      setScreenVideoShown(key, targetMs !== null);

      if (targetMs === null) {
        if (!element.paused) {
          element.pause();
        }

        continue;
      }

      // O último quadro fica um pouco antes do fim: em `duration` exato alguns
      // navegadores mostram preto.
      const targetS = Math.min(targetMs, video.durationMs - 20) / 1000;

      // No último quadro (o trecho congelado) o vídeo fica parado mesmo
      // tocando: o `play()` ali o mandaria de volta ao começo.
      if (isPlaying && !isScreenVideoAtFileEnd(video, sceneTimeMs)) {
        if (Math.abs(element.currentTime - targetS) > VIDEO_DRIFT_TOLERANCE_S) {
          element.currentTime = Math.max(0, targetS);
        }

        if (element.paused) {
          void element.play().catch(() => undefined);
        }

        continue;
      }

      if (!element.paused) {
        element.pause();
      }

      if (
        !element.seeking &&
        Math.abs(element.currentTime - targetS) > VIDEO_SEEK_EPSILON_S
      ) {
        element.currentTime = Math.max(0, targetS);
      }
    }
  });

  return null;
}

/**
 * Escreve um fundo na cena: as cores e a visibilidade da grade (nos uniformes
 * do material do drei) e, se vier o quadro, o CSS dele. Sem passar pelo React:
 * o play e a exportação chamam por quadro.
 */
function applyBackgroundLook(
  grid: THREE.Mesh | null,
  frame: HTMLDivElement | null,
  look: BackgroundLook,
) {
  if (grid) {
    const { uniforms } = grid.material as THREE.ShaderMaterial;

    (uniforms.cellColor.value as THREE.Color).set(look.grid.cell);
    (uniforms.sectionColor.value as THREE.Color).set(look.grid.section);
    grid.visible = look.grid.opacity > 0;
  }

  if (frame) {
    frame.style.background = getBackgroundLookCss(look);
  }
}

/**
 * O Fundo tocando: o fundo de cada quadro, no relógio da cena (preso no fim,
 * como as poses), escrito direto no quadro e na grade.
 */
function BackgroundMotion({
  frameRef,
  gridRef,
  keyframes,
  sceneDurationMs,
  startedAt,
}: {
  frameRef: { current: HTMLDivElement | null };
  gridRef: { current: THREE.Mesh | null };
  keyframes: MotionKeyframe[];
  sceneDurationMs: number;
  startedAt: number;
}) {
  useFrame(() => {
    const look = sampleBackgroundLook(
      keyframes,
      getPlaybackTimeMs(startedAt, Date.now(), sceneDurationMs),
    );

    if (look) {
      applyBackgroundLook(gridRef.current, frameRef.current, look);
    }
  });

  return null;
}

function MotionDriver({
  groupsRef,
  index,
  object,
  sceneDurationMs,
  spawnOverrides,
  startedAt,
}: {
  groupsRef: { current: Map<string, THREE.Group> };
  index: number;
  object: SceneObject;
  sceneDurationMs: number;
  spawnOverrides: SpawnOverrides;
  startedAt: number;
}) {
  useFrame(() => {
    const group = groupsRef.current.get(object.id);

    if (group) {
      // Preso no fim da cena, como o vídeo: o play para 80 ms depois dele, e
      // esses últimos quadros caíam depois da trilha de quem termina junto
      // com a cena — o objeto saía de cena e, parado, o React não reaplicava
      // a opacidade (o valor dele não mudou), deixando a cena vazia no fim.
      applyMotionPose(
        group,
        object,
        index,
        getPlaybackTimeMs(startedAt, Date.now(), sceneDurationMs),
        spawnOverrides,
      );
    }
  });

  // Fim do play: as telas voltam ao enquadramento das props (o do playhead).
  useEffect(
    () => () => {
      setScreenFitOverride(getScreenVideoKey(object.id, "main"), null);
      setScreenFitOverride(getScreenVideoKey(object.id, "outer"), null);
    },
    [object.id],
  );

  return null;
}

function SceneObjectLoadingFallback({
  id,
  onObjectLoadStateChange,
}: {
  id: string;
  onObjectLoadStateChange: (id: string, isLoading: boolean) => void;
}) {
  useEffect(() => {
    onObjectLoadStateChange(id, true);

    return () => {
      onObjectLoadStateChange(id, false);
    };
  }, [id, onObjectLoadStateChange]);

  return null;
}

function SceneObjectResolvedReporter({
  id,
  modelId,
  onObjectResolved,
}: {
  id: string;
  modelId: string;
  onObjectResolved: (id: string) => void;
}) {
  useEffect(() => {
    onObjectResolved(id);
  }, [id, modelId, onObjectResolved]);

  return null;
}

/**
 * A caixa dos objetos da última vez que a trava foi aplicada, por controle de
 * câmera: a folga do centro da órbita é refeita a cada movimento de um gesto,
 * e medir a cena a cada quadro seria desperdício.
 */
const sceneBoxes = new WeakMap<
  CameraControlsImpl,
  { box: THREE.Box3; visible: VisibleShare }
>();

/**
 * Aplica a trava da câmera (ver camera-limits.ts) para a cena como está
 * agora: distância mínima e máxima, o que a câmera desenha e a caixa do
 * centro da órbita. Barato — a caixa dos objetos, sem percorrer vértices —,
 * por isso roda a cada enquadramento, início de gesto e botão de navegação,
 * e acompanha objetos que se moveram.
 */
function applyCameraLimits(
  controls: CameraControlsImpl,
  sceneGroup: THREE.Object3D,
  visible: VisibleShare,
) {
  const camera = controls.camera;

  if (!(camera instanceof THREE.PerspectiveCamera)) {
    return;
  }

  const box = new THREE.Box3().setFromObject(sceneGroup);
  const limits = getCameraLimits(box, camera.fov);

  if (!limits) {
    return;
  }

  sceneBoxes.set(controls, { box, visible });
  controls.minDistance = limits.minDistance;
  controls.maxDistance = limits.maxDistance;
  camera.near = limits.near;
  camera.far = limits.far;
  camera.updateProjectionMatrix();
  updateOrbitBoundary(controls);
}

/**
 * Leva a câmera a uma órbita, na hora e sem transição: é o que o preview, o
 * play e a exportação de vídeo fazem a cada quadro, a mesma conta nos três.
 * Se a lente mudou, a trava acompanha (os limites de distância e o near/far
 * dependem do campo de visão).
 */
function applyCameraOrbit(
  controls: CameraControlsImpl,
  orbit: CameraOrbit,
  sceneGroup: THREE.Object3D | null,
  visible: VisibleShare,
) {
  const camera = controls.camera;

  if (!(camera instanceof THREE.PerspectiveCamera)) {
    return;
  }

  if (camera.fov !== orbit.fov) {
    camera.fov = orbit.fov;
    camera.updateProjectionMatrix();

    if (sceneGroup) {
      applyCameraLimits(controls, sceneGroup, visible);
    }
  }

  const { position, target } = orbitToLookAt(orbit);

  void controls.setLookAt(...position, ...target, false);
  // A câmera só é posta no próximo quadro do controle; a exportação renderiza
  // antes dele.
  controls.update(0);
}

/** A órbita em que a câmera está agora. */
function readCameraOrbit(controls: CameraControlsImpl): CameraOrbit | null {
  const camera = controls.camera;

  if (!(camera instanceof THREE.PerspectiveCamera)) {
    return null;
  }

  const position = controls.getPosition(new THREE.Vector3());
  const target = controls.getTarget(new THREE.Vector3());

  return lookAtToOrbit(
    [position.x, position.y, position.z],
    [target.x, target.y, target.z],
    camera.fov,
  );
}

/**
 * Conduz a câmera pelos keyframes dela. Parado, a câmera vai ao instante do
 * playhead sempre que ele (ou um keyframe) muda — e entre uma mudança e outra o
 * usuário orbita livre, como um objeto mostrado num keyframe não é o objeto. Em
 * play, escreve direto a cada quadro, sem passar pelo React.
 */
function CameraMotion({
  controlsRef,
  motionPlayheadMs,
  motionStartedAt,
  object,
  sceneRef,
  settleKey,
}: {
  controlsRef: { current: CameraControlsImpl | null };
  /**
   * Muda quando a cena assenta ou se enquadra: a câmera volta ao playhead depois
   * do enquadramento e da trava (que vêm um quadro depois de montar a cena).
   */
  settleKey: string;
  motionPlayheadMs: number | null;
  motionStartedAt: number | null;
  object: CameraObject | null;
  sceneRef: { current: THREE.Group | null };
}) {
  const invalidate = useThree((state) => state.invalidate);
  const keyframes = object?.keyframes ?? [];
  const hasKeyframes = keyframes.length > 0;
  const isPlaying = motionStartedAt !== null;

  useEffect(() => {
    const controls = controlsRef.current;

    if (!object || !controls || !hasKeyframes || isPlaying || motionPlayheadMs === null) {
      return;
    }

    const orbit = sampleMotion(object, motionPlayheadMs)?.orbit;

    if (orbit) {
      applyCameraOrbit(controls, orbit, sceneRef.current, FULL_VISIBLE_SHARE);
      invalidate();
    }
  }, [
    controlsRef,
    hasKeyframes,
    invalidate,
    isPlaying,
    motionPlayheadMs,
    object,
    sceneRef,
    settleKey,
  ]);

  useFrame(() => {
    const controls = controlsRef.current;

    if (!object || !controls || !hasKeyframes || motionStartedAt === null) {
      return;
    }

    const orbit = sampleMotion(object, Date.now() - motionStartedAt)?.orbit;

    if (orbit) {
      applyCameraOrbit(controls, orbit, sceneRef.current, FULL_VISIBLE_SHARE);
    }
  });

  return null;
}

/**
 * O pedido de arquivo de uma tela que veio de um template sem ele (ver
 * `screen-memory.ts`): a imagem com "Envie de novo “nome”" e o enquadramento
 * neutro, para o texto aparecer inteiro. `null` quando a tela tem o que mostrar.
 */
function getMissingScreen(
  object: DeviceObject,
  which: "main" | "outer",
  size: DeviceObject["modelId"] | "duo-outer",
  copy: AppCopy,
) {
  const source = which === "outer" ? object.outerScreenSource : object.screenSource;
  const name = getMissingScreenFileName(
    source,
    which === "outer" ? object.pendingOuterScreen : object.pendingScreen,
  );

  if (!name) {
    return null;
  }

  return {
    fit: DEFAULT_SCREEN_FIT,
    url: getMissingScreenImageUrl(
      size,
      copy.screenMissingTitle.replace("{name}", name),
      source === "video" ? copy.screenMissingHintVideo : copy.screenMissingHint,
    ),
  };
}

/** Uma câmera sem keyframes: `sampleMotion` devolve `null` e nada se mexe. */
const EMPTY_CAMERA: CameraObject = createCameraObject({
  id: "no-camera",
  name: "Camera",
});

/** No Vídeo o canvas inteiro é o quadro: a câmera o vê todo. */
const FULL_VISIBLE_SHARE: VisibleShare = { height: 1, width: 1 };

/** A folga do centro da órbita para a distância de agora (ver getOrbitBoundary). */
function updateOrbitBoundary(controls: CameraControlsImpl) {
  const scene = sceneBoxes.get(controls);
  const camera = controls.camera;

  if (scene && camera instanceof THREE.PerspectiveCamera) {
    const boundary = getOrbitBoundary(
      scene.box,
      controls.distance,
      camera.fov,
      camera.aspect,
      scene.visible,
    );

    // A folga inclui o alvo de agora: o `setBoundary` puxa o alvo para dentro
    // na hora, e um alvo que veio de um keyframe, de um template ou de objetos
    // que saíram de lugar daria um pulo sozinho no começo do gesto. Assim a
    // trava só impede ir mais longe — voltar para os objetos continua livre.
    boundary.expandByPoint(controls.getTarget(new THREE.Vector3()));
    controls.setBoundary(boundary);
  }
}

// O fitToBox encosta o conteúdo nas bordas. O auto-fit inicial respira por
// causa do <Bounds margin={1.18}>, então aqui inflamos a caixa em 9% de cada
// lado para os dois enquadramentos ficarem visualmente iguais.
function fitWithMargin(
  controls: CameraControlsImpl,
  target: THREE.Object3D,
) {
  const box = new THREE.Box3().setFromObject(target);
  const size = box.getSize(new THREE.Vector3());

  box.expandByVector(size.multiplyScalar(0.09));
  controls.fitToBox(box, true);
}

/**
 * A área do alinhamento em frações do canvas. No Estático o canvas passa por
 * baixo dos painéis e da barra flutuante, e a área é o que sobra visível
 * (`.canvas-align-area`, desenhada em CSS com os mesmos tokens do quadro do
 * Movimento). No Movimento — ou sem a interface — não há essa área: vale o
 * canvas todo, que é o quadro do vídeo.
 */
function measureAlignmentArea(
  canvas: HTMLCanvasElement,
  areaElement: HTMLDivElement | null,
): AlignmentArea {
  const canvasRect = canvas.getBoundingClientRect();
  const areaRect = areaElement?.getBoundingClientRect();

  if (!areaRect || canvasRect.width === 0 || canvasRect.height === 0) {
    return FULL_ALIGNMENT_AREA;
  }

  return {
    bottom: (areaRect.bottom - canvasRect.top) / canvasRect.height,
    left: (areaRect.left - canvasRect.left) / canvasRect.width,
    right: (areaRect.right - canvasRect.left) / canvasRect.width,
    top: (areaRect.top - canvasRect.top) / canvasRect.height,
  };
}

function BoundsResetController({
  alignmentAreaRef,
  modeFrameRef,
  controlsRef,
  hasCameraMotion,
  isSceneSettled,
  onCameraApiReady,
  onCameraRest,
  onCameraViewEdited,
  onTemplateApplied,
  pendingCameraPose,
  sceneFitKey,
  onViewportControlsReady,
  sceneRef,
}: {
  hasCameraMotion: boolean;
  alignmentAreaRef: { current: HTMLDivElement | null };
  modeFrameRef: { current: ((pose: CameraPose | null) => void) | null };
  controlsRef: { current: CameraControlsImpl | null };
  isSceneSettled: boolean;
  onCameraApiReady: (api: CameraApi | null) => void;
  /** A câmera parou depois de um gesto: o Inspector lê a órbita de novo. */
  onCameraRest?: () => void;
  /** Ver o `MockupCanvasProps`: a vista nova veio de uma ação do usuário. */
  onCameraViewEdited?: () => void;
  onTemplateApplied: () => void;
  pendingCameraPose: CameraPose | null;
  sceneFitKey: string;
  onViewportControlsReady: (api: ViewportControlsApi | null) => void;
  sceneRef: { current: THREE.Group | null };
}) {
  const bounds = useBounds();
  const { camera, gl, scene } = useThree();

  /** O que se vê do canvas agora (ver VisibleShare). */
  const getVisibleShare = useCallback((): VisibleShare => {
    const area = measureAlignmentArea(gl.domElement, alignmentAreaRef.current);

    return { height: area.bottom - area.top, width: area.right - area.left };
  }, [alignmentAreaRef, gl]);
  // Cena cuja câmera veio de um template. Sem isso, limpar a pose pendente
  // (que está nas deps do effect) dispararia um auto-fit logo depois de
  // restaurar a câmera, desfazendo a restauração.
  const restoredPoseKeyRef = useRef<string | null>(null);
  // A câmera já tem uma vista: o enquadramento inicial (quando a cena abriu e
  // assentou), a de um template ou modo, ou a dos keyframes. Daí em diante ela
  // só se mexe por ação do usuário — entrar, sair ou carregar um objeto, ou
  // mudar o tamanho do vídeo, não reenquadra mais.
  const hasViewRef = useRef(false);
  // O callback vem do page em cada render. Se entrasse nas dependências do
  // effect abaixo, ele reiniciaria a cada render e o cleanup cancelaria o
  // requestAnimationFrame antes de o quadro chegar — nem o enquadramento
  // salvo nem o auto-fit chegariam a rodar.
  const onTemplateAppliedRef = useRef(onTemplateApplied);

  useEffect(() => {
    onTemplateAppliedRef.current = onTemplateApplied;
  }, [onTemplateApplied]);

  // Pelo mesmo motivo: o callback muda a cada render do page.
  const onCameraRestRef = useRef(onCameraRest);

  useEffect(() => {
    onCameraRestRef.current = onCameraRest;
  }, [onCameraRest]);

  const onCameraViewEditedRef = useRef(onCameraViewEdited);

  useEffect(() => {
    onCameraViewEditedRef.current = onCameraViewEdited;
  }, [onCameraViewEdited]);

  // Marca que o próximo "rest" da câmera vem de uma ação do usuário (gesto,
  // botão, enquadrar). O que o código move sozinho (keyframes no playhead,
  // template, troca de modo) não marca, e não é gravado em keyframe nenhum.
  const userMovedRef = useRef(false);

  // O primeiro quadro de um modo, desenhado na hora da troca (ver o
  // useLayoutEffect do MockupCanvas): o tamanho novo do canvas, a câmera de
  // destino — a pose guardada do modo, ou o mesmo enquadramento automático
  // que o efeito abaixo faria um quadro depois — e um render. Quando o efeito
  // roda, a câmera já está onde ele a colocaria: nada se mexe.
  useEffect(() => {
    modeFrameRef.current = (pose) => {
      const controls = controlsRef.current;
      const sceneGroup = sceneRef.current;
      const container = gl.domElement.parentElement;

      if (
        !controls ||
        !sceneGroup ||
        !container ||
        !(camera instanceof THREE.PerspectiveCamera) ||
        container.clientWidth === 0 ||
        container.clientHeight === 0
      ) {
        return;
      }

      gl.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      applyCameraLimits(controls, sceneGroup, getVisibleShare());

      if (pose) {
        const [px, py, pz] = pose.position;
        const [tx, ty, tz] = pose.target;

        void controls.setLookAt(px, py, pz, tx, ty, tz, false);
      } else {
        bounds.refresh(sceneGroup);

        const { center, distance } = bounds.getSize();

        void controls.setLookAt(
          center.x, center.y, center.z + distance,
          center.x, center.y, center.z,
          false,
        );
      }

      controls.update(0);
      gl.render(scene, camera);
    };

    return () => {
      modeFrameRef.current = null;
    };
  }, [bounds, camera, controlsRef, getVisibleShare, gl, modeFrameRef, scene, sceneRef]);

  useEffect(() => {
    const controls = controlsRef.current;
    const sceneGroup = sceneRef.current;

    if (!controls || !sceneGroup) {
      return;
    }

    let frameId = 0;

    frameId = requestAnimationFrame(() => {
      // O canvas pode ter acabado de mudar de forma (entrar no Movimento,
      // trocar o tamanho do vídeo) e o R3F só atualiza a câmera quando mede de
      // novo. O enquadramento depende da proporção, então ela vem direto do
      // contêiner, que já tem o tamanho novo.
      const container = gl.domElement.parentElement;

      if (
        container &&
        camera instanceof THREE.PerspectiveCamera &&
        container.clientWidth > 0 &&
        container.clientHeight > 0
      ) {
        camera.aspect = container.clientWidth / container.clientHeight;
      }

      bounds.refresh(sceneGroup);

      const { center, distance } = bounds.getSize();

      // A trava vem antes da pose: um template salvo longe demais é trazido
      // para dentro do limite.
      applyCameraLimits(controls, sceneGroup, getVisibleShare());

      // Com um template em aplicação, o enquadramento salvo substitui o
      // auto-fit — sem transição, já que a cena está coberta pelo loading.
      // Reaplicamos a cada passada (os objetos resolvem um a um) e só
      // liberamos quando a cena inteira assentou, garantindo que a câmera
      // seja de fato o último passo.
      if (pendingCameraPose && hasCameraMotion) {
        // Uma câmera animada é a do playhead, não a pose que o template trazia
        // (a de quando foi salvo): só se libera o aviso de template aplicado.
        restoredPoseKeyRef.current = sceneFitKey;
        hasViewRef.current = true;

        if (isSceneSettled) {
          onTemplateAppliedRef.current();
        }

        return;
      }

      if (pendingCameraPose) {
        const [px, py, pz] = pendingCameraPose.position;
        const [tx, ty, tz] = pendingCameraPose.target;

        restoredPoseKeyRef.current = sceneFitKey;
        hasViewRef.current = true;

        void controls.setLookAt(px, py, pz, tx, ty, tz, false).then(() => {
          controls.saveState();

          if (isSceneSettled) {
            onTemplateAppliedRef.current();
          }
        });

        return;
      }

      // A câmera desta cena veio de um template: não sobrescreve com o
      // auto-fit quando o effect roda de novo ao limpar a pose pendente.
      if (restoredPoseKeyRef.current === sceneFitKey) {
        return;
      }

      // Uma câmera animada é de quem a animou: entrar um objeto não a reenquadra.
      if (hasCameraMotion) {
        hasViewRef.current = true;
        return;
      }

      // Só o enquadramento inicial é automático. Enquanto a cena abre, os
      // objetos resolvem um a um e ele acompanha; quando ela assenta, a vista
      // fica, e reenquadrar passa a ser só pelo "Enquadrar cena".
      if (hasViewRef.current) {
        return;
      }

      void controls.setLookAt(
        center.x, center.y, center.z + distance,
        center.x, center.y, center.z,
        true,
      ).then(() => {
        controls.saveState();
      });

      if (isSceneSettled) {
        hasViewRef.current = true;
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    bounds,
    camera,
    getVisibleShare,
    controlsRef,
    gl,
    hasCameraMotion,
    isSceneSettled,
    pendingCameraPose,
    sceneFitKey,
    sceneRef,
  ]);

  // Expõe a leitura do enquadramento atual para salvar em um template.
  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    onCameraApiReady({
      // Enquadra um objeto específico — acionado pelo menu do card, então o id
      // vem de quem clicou e não depende da seleção atual.
      fitObject: (id) => {
        const sceneGroup = sceneRef.current;
        const target = sceneGroup?.getObjectByName(id);

        if (!target) {
          return;
        }

        userMovedRef.current = true;
        fitWithMargin(controls, target);
      },
      resetView: () => {
        const sceneGroup = sceneRef.current;

        if (!sceneGroup) {
          return;
        }

        userMovedRef.current = true;
        fitWithMargin(controls, sceneGroup);

        const orbit = readCameraOrbit(controls);

        if (orbit) {
          applyCameraOrbit(
            controls,
            { ...orbit, fov: DEFAULT_CAMERA_FOV },
            sceneGroup,
            getVisibleShare(),
          );
        }
      },
      getAlignmentOffset: (id, alignment) => {
        const target = sceneRef.current?.getObjectByName(id);
        const camera = controls.camera;

        if (!target || !(camera instanceof THREE.PerspectiveCamera)) {
          return null;
        }

        const offset = getAlignmentOffset(
          collectWorldVertices(target),
          camera,
          alignment,
          measureAlignmentArea(gl.domElement, alignmentAreaRef.current),
        );

        return offset ? [offset.x, offset.y, offset.z] : null;
      },
      getPose: () => {
        const position = controls.getPosition(new THREE.Vector3());
        const target = controls.getTarget(new THREE.Vector3());

        return {
          position: [position.x, position.y, position.z],
          target: [target.x, target.y, target.z],
        };
      },
      setPose: (pose) => {
        const [px, py, pz] = pose.position;
        const [tx, ty, tz] = pose.target;

        void controls.setLookAt(px, py, pz, tx, ty, tz, true);
      },
      getOrbit: () => readCameraOrbit(controls),
      getDistanceRange: () => {
        const sceneGroup = sceneRef.current;

        // A trava acompanha a cena: objetos podem ter se movido.
        if (sceneGroup) {
          applyCameraLimits(controls, sceneGroup, getVisibleShare());
        }

        return [controls.minDistance, controls.maxDistance];
      },
      setOrbit: (orbit) => {
        applyCameraOrbit(
          controls,
          orbit,
          sceneRef.current,
          getVisibleShare(),
        );
      },
    });

    return () => {
      onCameraApiReady(null);
    };
  }, [alignmentAreaRef, controlsRef, getVisibleShare, gl, onCameraApiReady, sceneRef]);

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    // A trava acompanha a cena: objetos podem ter se movido desde o último
    // enquadramento. Antes de cada gesto e de cada botão de navegação.
    function refreshLimits() {
      userMovedRef.current = true;

      const sceneGroup = sceneRef.current;

      if (controls && sceneGroup) {
        applyCameraLimits(controls, sceneGroup, getVisibleShare());
      }
    }

    // Depois do movimento a distância mudou: a folga do centro acompanha. Os
    // botões movem sem transição, e aí o camera-controls não avisa "rest": o
    // aviso sai daqui, para os campos da câmera (e o keyframe selecionado)
    // acompanharem a seta e o zoom como acompanham o gesto.
    const navigate = (move: () => void) => () => {
      refreshLimits();
      move();
      updateOrbitBoundary(controls);
      controls.update(0);
      handleRest();
    };

    // Durante o gesto, só a folga muda com o zoom; a caixa é a do início.
    const followGesture = () => updateOrbitBoundary(controls);

    const handleRest = () => {
      onCameraRestRef.current?.();

      if (userMovedRef.current) {
        userMovedRef.current = false;
        onCameraViewEditedRef.current?.();
      }
    };

    controls.addEventListener("controlstart", refreshLimits);
    controls.addEventListener("control", followGesture);
    controls.addEventListener("rest", handleRest);

    onViewportControlsReady({
      // Enquadra todos os objetos visíveis, recalculado na hora — ao contrário
      // do sceneFitKey, que só reage a entrar/sair objeto e ignora posição.
      fitToScene: () => {
        const sceneGroup = sceneRef.current;

        if (!sceneGroup) {
          return;
        }

        refreshLimits();
        fitWithMargin(controls, sceneGroup);
      },
      panDown: navigate(() =>
        controls.truck(0, -controls.distance * PAN_STEP_RATIO, false),
      ),
      panLeft: navigate(() =>
        controls.truck(-controls.distance * PAN_STEP_RATIO, 0, false),
      ),
      panRight: navigate(() =>
        controls.truck(controls.distance * PAN_STEP_RATIO, 0, false),
      ),
      panUp: navigate(() =>
        controls.truck(0, controls.distance * PAN_STEP_RATIO, false),
      ),
      zoomIn: navigate(() => controls.dolly(controls.distance * 0.138, false)),
      zoomOut: navigate(() => controls.dolly(-controls.distance * 0.138, false)),
    });

    return () => {
      controls.removeEventListener("controlstart", refreshLimits);
      controls.removeEventListener("control", followGesture);
      controls.removeEventListener("rest", handleRest);
      onViewportControlsReady(null);
    };
  }, [controlsRef, getVisibleShare, onViewportControlsReady, sceneRef]);

  return null;
}

export default function MockupCanvas(props: MockupCanvasProps) {
  const [viewportControls, setViewportControls] =
    useState<ViewportControlsApi | null>(null);
  // A cor de fundo é controlada pelo page para poder entrar nos templates.
  const canvasBgColor = props.bgColor;
  // O quadro do vídeo: o fundo dele é escrito direto (ver `frameBackground`).
  const frameRef = useRef<HTMLDivElement | null>(null);
  const exportHandlerRef =
    useRef<((preset: ExportPreset) => Promise<void>) | null>(null);
  const [isExportReady, setIsExportReady] = useState(false);
  const [loadingObjectIds, setLoadingObjectIds] = useState<string[]>([]);
  const [resolvedObjectIds, setResolvedObjectIds] = useState<string[]>([]);
  const [incrementalLoadingDelayElapsed, setIncrementalLoadingDelayElapsed] =
    useState(false);
  const [isExporting, setIsExporting] = useState(false);
  // Altura escolhida para a timeline, em px; null = a padrão do token. Fica
  // no navegador, como as preferências do Exportar.
  const [timelineHeight, setTimelineHeight] = useState<number | null>(null);

  useEffect(() => {
    // Lida depois de montar: no servidor não há localStorage, e ler durante
    // o render quebraria a hidratação.
    const stored = Number(readStorageItem(TIMELINE_HEIGHT_KEY));

    if (stored > 0) {
      setTimelineHeight(clampTimelineHeight(stored));
    }
  }, []);

  function changeTimelineHeight(height: number | null) {
    setTimelineHeight(height);

    if (height === null) {
      removeStorageItem(TIMELINE_HEIGHT_KEY);
    } else {
      writeStorageItem(TIMELINE_HEIGHT_KEY, String(height));
    }
  }
  const videoExportHandlerRef = useRef<VideoExportHandler | null>(null);
  const alignmentAreaRef = useRef<HTMLDivElement | null>(null);
  const modeFrameRef = useRef<((pose: CameraPose | null) => void) | null>(null);
  const [isVideoExportReady, setIsVideoExportReady] = useState(false);
  // Quadros prontos da exportação de vídeo em curso; null = nenhuma.
  const [videoProgress, setVideoProgress] =
    useState<VideoExportProgress | null>(null);
  const videoAbortRef = useRef<AbortController | null>(null);
  // Recuperação do visualizador 3D: trocar a `key` remonta apenas o <Canvas>,
  // mantendo a cena, os keyframes e as telas em memória.
  const [canvasRecoveryKey, setCanvasRecoveryKey] = useState(0);
  const [isWebGlLost, setIsWebGlLost] = useState(false);
  const webglCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => webglCleanupRef.current?.(), []);

  const handleReloadViewer = useCallback(() => {
    webglCleanupRef.current?.();
    webglCleanupRef.current = null;
    setIsWebGlLost(false);
    setCanvasRecoveryKey((current) => current + 1);
  }, []);

  const attachWebGlListeners = useCallback((element: HTMLCanvasElement) => {
    webglCleanupRef.current?.();

    const handleContextLost = (event: Event) => {
      // `preventDefault` autoriza o navegador a restaurar o contexto sozinho
      // assim que a GPU voltar (ex.: ao acordar o Mac).
      event.preventDefault();
      setIsWebGlLost(true);
    };
    // O contexto voltou, mas o que vivia nele não: as texturas compostas das
    // telas e os alvos de render ficam vazios, e a tela do aparelho sai preta.
    // Remontar o <Canvas> refaz tudo — é o mesmo "Recarregar visualizador".
    const handleContextRestored = () => {
      handleReloadViewer();
    };

    element.addEventListener("webglcontextlost", handleContextLost);
    element.addEventListener("webglcontextrestored", handleContextRestored);

    webglCleanupRef.current = () => {
      element.removeEventListener("webglcontextlost", handleContextLost);
      element.removeEventListener("webglcontextrestored", handleContextRestored);
    };
  }, [handleReloadViewer]);
  // Estável: o Dialog reassina o teclado quando o callback muda.
  const cancelVideoExport = useCallback(() => videoAbortRef.current?.abort(), []);
  // Mesma conta da timeline: até o último keyframe ou o fim do último vídeo.
  const sceneDurationMs = getSceneMotionDuration(props.objects);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          viewportControls?.panUp();
          break;
        case "ArrowDown":
          event.preventDefault();
          viewportControls?.panDown();
          break;
        case "ArrowLeft":
          event.preventDefault();
          viewportControls?.panLeft();
          break;
        case "ArrowRight":
          event.preventDefault();
          viewportControls?.panRight();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewportControls]);

  // No Movimento a cor de fundo pinta só o quadro do vídeo; em volta dele
  // fica o fundo do palco.
  const isFramed = props.motionFrame !== null;

  // Troca de modo sem corte seco: o canvas muda de forma (a tela inteira no
  // Estático, o quadro do vídeo no Movimento) no mesmo commit do clique, e
  // aqui — depois da mudança no DOM, antes de o navegador pintar — a cena é
  // redimensionada, posta na câmera de destino e desenhada. O primeiro quadro
  // que aparece já é o final; sem isso, saía um quadro esticado e depois um
  // reenquadramento.
  const framedRef = useRef(isFramed);
  const pendingCameraPose = props.pendingCameraPose;

  useLayoutEffect(() => {
    if (framedRef.current === isFramed) {
      return;
    }

    framedRef.current = isFramed;
    // A cena 3D tem a própria fila de atualização: aplica agora os objetos do
    // modo de destino, para o quadro já sair com eles — sem isso, o primeiro
    // quadro trazia o tamanho e a câmera novos com os objetos do modo antigo.
    flushSync(() => undefined);
    modeFrameRef.current?.(pendingCameraPose);
  }, [isFramed, pendingCameraPose]);
  // O fundo escolhido, como CSS (cor ou degradê). Sem cor escolhida, o chão
  // usa o palco do tema; o liso, a cor padrão: ele é sempre um fundo de fato.
  const stageBackground =
    canvasBgColor || props.background.style === "flat"
      ? getCanvasBackgroundCss(canvasBgColor ?? DEFAULT_CANVAS_COLOR[props.uiTheme], props.background)
      : null;
  // O Fundo no Vídeo: com keyframes, o fundo de cada instante vem deles.
  const backgroundKeyframes = isFramed
    ? (findBackgroundObject(props.objects)?.keyframes ?? [])
    : [];
  const isBackgroundAnimated = backgroundKeyframes.length > 0;
  const sceneBackgroundLook = useMemo(
    () =>
      getBackgroundLook({
        ...props.background,
        color: canvasBgColor ?? DEFAULT_CANVAS_COLOR[props.uiTheme],
        grid: props.grid,
      }),
    [canvasBgColor, props.background, props.grid, props.uiTheme],
  );
  const displayedBackgroundLook = getSceneBackgroundLook(
    backgroundKeyframes,
    sceneBackgroundLook,
    props.motionPlayheadMs,
  );
  // O fundo do quadro do vídeo. Com o Fundo animado ele é escrito direto (no
  // play, quadro a quadro, por `BackgroundMotion`), então nunca passa pelo
  // `style` do React: um valor que o React acha que não mudou não seria
  // reposto depois do play.
  const frameBackground = isBackgroundAnimated
    ? getBackgroundLookCss(displayedBackgroundLook)
    : (stageBackground ?? "");
  const isPlaying = props.motionStartedAt !== null;

  useLayoutEffect(() => {
    const frame = frameRef.current;

    if (!frame || (isPlaying && isBackgroundAnimated)) {
      return;
    }

    frame.style.background = isFramed ? frameBackground : "";
  }, [frameBackground, isBackgroundAnimated, isFramed, isPlaying]);

  const stageClass =
    stageBackground && !isFramed
      ? "mockup-stage relative flex-1 h-screen"
      : `mockup-stage relative flex-1 h-screen ${props.uiTheme === "dark" ? "mockup-stage-dark" : "mockup-stage-light"}`;
  // A câmera (e o Fundo e a música) não carrega nada e nunca se resolve:
  // contá-la deixaria a cena para sempre "por assentar".
  const currentObjectIds = new Set(
    props.objects
      .filter((object) => object.isVisible && !isUndrawnObject(object))
      .map((object) => object.id),
  );
  const visibleObjectCount = currentObjectIds.size;
  const activeLoadingObjectIds = loadingObjectIds.filter((id) => currentObjectIds.has(id));
  const activeResolvedObjectIds = resolvedObjectIds.filter((id) => currentObjectIds.has(id));
  const isInitialSceneLoading =
    visibleObjectCount > 0 && activeResolvedObjectIds.length === 0;
  // Todos os objetos visíveis já carregaram: a cena parou de se mexer.
  const isSceneSettled =
    visibleObjectCount > 0 &&
    activeResolvedObjectIds.length === visibleObjectCount;
  // Com a cena pronta, baixa em silêncio os outros modelos (ver model-warmup).
  useEffect(() => {
    if (isSceneSettled) {
      warmUpModels();
    }
  }, [isSceneSettled]);
  const isApplyingTemplate = props.isApplyingTemplate;
  const isIncrementalObjectLoading =
    activeLoadingObjectIds.length > 0 && activeResolvedObjectIds.length > 0;
  const showIncrementalLoading =
    isIncrementalObjectLoading && incrementalLoadingDelayElapsed;
  const incrementalLoadingLabel =
    activeLoadingObjectIds.length > 1
      ? `${props.copy.canvasObjectLoadingLabel} (${activeLoadingObjectIds.length})`
      : props.copy.canvasObjectLoadingLabel;
  const motionFrame = props.motionFrame;
  // A forma do quadro entra na chave: mudar o tamanho do vídeo muda o que cabe
  // na tela, então a cena é enquadrada de novo.
  const sceneFitKey = `${props.objects.map((object) => object.id).join(",")}::${activeResolvedObjectIds.join(",")}::${
    motionFrame ? `${motionFrame.width}x${motionFrame.height}` : ""
  }`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIncrementalLoadingDelayElapsed(true);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      setIncrementalLoadingDelayElapsed(false);
    };
  }, [isIncrementalObjectLoading]);

  // Estes callbacks vão para efeitos dentro da cena (registrar exportadores,
  // avisar que um objeto carregou). Precisam ser estáveis: uma função nova a
  // cada render re-rodaria esses efeitos, que mudam estado aqui, que
  // renderiza de novo — um laço de centenas de renders por segundo, parado.
  // Pelo mesmo motivo, as listas só mudam quando algo muda de fato: um
  // `filter` sempre devolve um array novo, e o React leria isso como mudança.
  const handleObjectLoadStateChange = useCallback(
    (id: string, isLoading: boolean) => {
      setLoadingObjectIds((current) => {
        if (isLoading) {
          return current.includes(id) ? current : [...current, id];
        }

        return current.includes(id)
          ? current.filter((currentId) => currentId !== id)
          : current;
      });
    },
    [],
  );

  const handleObjectResolved = useCallback((id: string) => {
    setResolvedObjectIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setLoadingObjectIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : current,
    );
  }, []);

  const handleExportReady = useCallback(
    (handler: ((preset: ExportPreset) => Promise<void>) | null) => {
      exportHandlerRef.current = handler;
      setIsExportReady(Boolean(handler));
    },
    [],
  );

  const handleVideoExportReady = useCallback(
    (handler: VideoExportHandler | null) => {
      videoExportHandlerRef.current = handler;
      setIsVideoExportReady(Boolean(handler));
    },
    [],
  );

  async function handleExportVideo(settings: VideoExportSettings) {
    const exportVideo = videoExportHandlerRef.current;

    if (!exportVideo || !props.motionFrame || videoProgress) {
      return;
    }

    // Exportar toma conta da cena: o preview para, e o canvas fica bloqueado
    // até o fim (ver o overlay abaixo).
    props.onStopMotion();

    const size = getVideoExportSize(props.motionFrame, settings.scale);
    const frameTimes = getVideoFrameTimes(sceneDurationMs, settings.fps);
    const controller = new AbortController();

    const startedAt = performance.now();

    videoAbortRef.current = controller;
    setVideoProgress({ done: 0, remainingMs: null, total: frameTimes.length });

    try {
      const blob = await exportVideo({
        // O mesmo fundo do editor, quadro a quadro (o Fundo pode animar).
        background: settings.background,
        frameTimes,
        onProgress: (done, total) =>
          setVideoProgress({
            done,
            remainingMs: estimateRemainingMs(
              performance.now() - startedAt,
              done,
              total,
            ),
            total,
          }),
        settings,
        signal: controller.signal,
        size,
      });

      downloadBlob(
        blob,
        getVideoExportFilename(
          size,
          settings,
          formatTimestampForFilename(new Date()),
        ),
      );
      props.onNotify?.("success", props.copy.videoExportSuccess);
    } catch (error) {
      // Cancelar é uma escolha, não um erro: nada de aviso.
      if (!(error instanceof VideoExportCanceledError)) {
        console.error("Failed to export video.", error);
        props.onNotify?.("error", props.copy.videoExportError);
      }
    } finally {
      videoAbortRef.current = null;
      setVideoProgress(null);
    }
  }

  async function handleTakePhoto(resolution: {
    width: number;
    height: number;
    includeBackground: boolean;
  }) {
    const exportHandler = exportHandlerRef.current;

    if (!exportHandler || isExporting) {
      return;
    }


    try {
      setIsExporting(true);
      await exportHandler({
        width: resolution.width,
        height: resolution.height,
        includeBackground: resolution.includeBackground,
        // O fundo que o editor mostra agora (no Vídeo, o do playhead).
        backgroundLook: displayedBackgroundLook,
        label: `mock-studio-${resolution.width}x${resolution.height}-${formatTimestampForFilename(new Date())}`,
      });
      props.onNotify?.("success", props.copy.photoExportSuccess);
    } catch (error) {
      console.error("Failed to export canvas photo.", error);
      props.onNotify?.("error", props.copy.photoExportError);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div
      className={stageClass}
      style={
        {
          ...(stageBackground && !isFramed ? { background: stageBackground } : {}),
          // A timeline, a barra flutuante acima dela e o quadro do vídeo leem
          // este token: mudar aqui move tudo junto. O 50vh segura a janela
          // que encolheu depois da escolha.
          ...(timelineHeight !== null
            ? { "--motion-timeline-height": `min(${timelineHeight}px, 50vh)` }
            : {}),
        } as CSSProperties
      }
    >
      {/* O mesmo contêiner nos dois modos, só com outra forma: trocar a
          estrutura remontaria o <Canvas> e recarregaria a cena inteira. */}
      <div
        className={`canvas-viewport${isFramed ? " is-framed" : ""}${
          isFramed && props.isUiHidden ? " is-ui-hidden" : ""
        }`}
      >
      <div
        ref={frameRef}
        className="canvas-frame"
        style={
          motionFrame
            ? ({
                "--canvas-frame-ratio": motionFrame.width / motionFrame.height,
              } as CSSProperties)
            : undefined
        }
      >
      <CanvasErrorBoundary
        title={props.copy.canvasErrorTitle}
        body={props.copy.canvasErrorBody}
        retryLabel={props.copy.canvasRetryViewer}
        reloadPageLabel={props.copy.canvasReloadPage}
        onRetry={handleReloadViewer}
      >
      <Canvas
        key={canvasRecoveryKey}
        camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          attachWebGlListeners(gl.domElement);
        }}
      >
        <SceneBridge
          {...props}
          alignmentAreaRef={alignmentAreaRef}
          modeFrameRef={modeFrameRef}
          backgroundLook={displayedBackgroundLook}
          frameRef={frameRef}
          sceneBackgroundLook={sceneBackgroundLook}
          isSceneSettled={isSceneSettled}
          onExportReady={handleExportReady}
          onObjectLoadStateChange={handleObjectLoadStateChange}
          onObjectResolved={handleObjectResolved}
          onSelectObject={props.onSelectObject}
          onVideoExportReady={handleVideoExportReady}
          onViewportControlsReady={setViewportControls}
          sceneFitKey={sceneFitKey}
        />
      </Canvas>
      </CanvasErrorBoundary>
      </div>
      </div>

      {isWebGlLost ? (
        <CanvasRecoveryCard
          title={props.copy.canvasWebglLostTitle}
          body={props.copy.canvasWebglLostBody}
          primaryLabel={props.copy.canvasReloadViewer}
          reloadPageLabel={props.copy.canvasReloadPage}
          onPrimaryAction={handleReloadViewer}
          onReloadPage={() => window.location.reload()}
        />
      ) : null}

      {/* Não aparece: só marca o que fica visível do canvas no Estático, para
          o alinhamento medir (ver measureAlignmentArea). */}
      {!isFramed && !props.isUiHidden ? (
        <div ref={alignmentAreaRef} className="canvas-align-area" aria-hidden />
      ) : null}

      {/* Enquanto o template assenta, bloqueia a interação com a cena para
          que um arraste acidental não estrague o enquadramento restaurado. */}
      {isApplyingTemplate ? (
        <div className="canvas-blocking-overlay">
          <ActivityNotice label={props.copy.canvasTemplateLoadingLabel} />
        </div>
      ) : null}

      {/* Exportando vídeo, a cena é do exportador quadro a quadro: mexer nela
          — ou nos painéis — agora estragaria o arquivo. O dialog cobre tudo,
          mostra o progresso e cancela. */}
      <ExportProgressDialog
        copy={props.copy}
        locale={props.locale}
        progress={videoProgress}
        onCancel={cancelVideoExport}
      />

      <div
        className={`canvas-stage-overlay${
          props.isMotionMode ? " with-timeline" : ""
        }`}
      >
        {!props.isUiHidden ? (
          <SegmentedTabs
            ariaLabel={props.copy.canvasModeLabel}
            className="canvas-mode-toggle"
            items={[
              { icon: null, id: "static", label: props.copy.canvasModePhoto },
              { icon: null, id: "motion", label: props.copy.canvasModeVideo },
            ]}
            value={props.isMotionMode ? "motion" : "static"}
            onChange={(id) => props.onMotionModeChange(id === "motion")}
          />
        ) : null}

        {isInitialSceneLoading ? (
          <ActivityNotice label={props.copy.canvasInitialLoadingLabel} />
        ) : null}

        {showIncrementalLoading ? (
          <ActivityNotice label={incrementalLoadingLabel} />
        ) : null}

        {isExporting ? (
          <ActivityNotice label={props.copy.canvasExportLoadingLabel} />
        ) : null}

        <FloatingCanvasControls
          backgroundEditor={props.backgroundEditor}
          backgroundSwatch={getBackgroundLookCss(displayedBackgroundLook)}
          copy={props.copy}
          isUiHidden={props.isUiHidden}
          locale={props.locale}
          onFitToScene={() => viewportControls?.fitToScene()}
          onPanDown={() => viewportControls?.panDown()}
          onPanLeft={() => viewportControls?.panLeft()}
          onPanRight={() => viewportControls?.panRight()}
          onPanUp={() => viewportControls?.panUp()}
          onCreateProjectLink={props.onCreateProjectLink}
          onSaveTemplate={props.onSaveTemplate}
          onTakePhoto={(resolution) => {
            void handleTakePhoto(resolution);
          }}
          onToggleUiHidden={props.onToggleUiHidden}
          onZoomIn={() => viewportControls?.zoomIn()}
          onZoomOut={() => viewportControls?.zoomOut()}
          takePhotoDisabled={!isExportReady || isExporting || videoProgress !== null}
          uiTheme={props.uiTheme}
          video={
            props.motionFrame
              ? {
                  // Sem o motor pronto, é como uma cena sem animação: a aba
                  // mostra o aviso e não deixa exportar.
                  durationMs: isVideoExportReady ? sceneDurationMs : 0,
                  frame: props.motionFrame,
                  onExport: (settings) => void handleExportVideo(settings),
                }
              : undefined
          }
        />

        {props.isMotionMode && !props.isUiHidden ? (
          <>
            <TimelineResizeHandle
              copy={props.copy}
              height={timelineHeight}
              onChange={changeTimelineHeight}
            />
            {props.timeline}
          </>
        ) : null}
      </div>
    </div>
  );
}
