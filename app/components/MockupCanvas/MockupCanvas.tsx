"use client";

import "./MockupCanvas.css";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import * as THREE from "three";
import {
  Canvas,
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
import type { MotionFrame } from "../../lib/motion-frame";
import {
  getActiveScreenFit,
  getActiveScreenVideo,
  getScreenVideoTime,
  type SceneObject,
} from "../../lib/scene-objects";
import { getScreenVideoElement } from "../../lib/screen-texture";
import type { CameraPose } from "../../lib/scene-templates";
import {
  AUTO_OBJECT_POSITIONS,
  OBJECT_POSITION_MULTIPLIER,
  OBJECT_POSITION_MULTIPLIER_Z,
} from "../../lib/scene-presets";
import {
  getSceneMotionDuration,
  hasMotion,
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
import {
  VideoExportCanceledError,
  createVideoFrameRenderer,
  encodeVideo,
} from "./export-video";
import { applyObjectOpacity, orderObjectGroups } from "./object-opacity";
import {
  getVideoExportFilename,
  getVideoExportSize,
  getVideoFrameTimes,
  type VideoExportSettings,
} from "../../lib/video-export";

/** Um pedido de exportação de vídeo, já com tudo decidido pelo modal. */
export type VideoExportRequest = {
  /** Cor de fundo, ou `null` para transparente. */
  background: string | null;
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
  backgroundColor?: string;
};

type MockupCanvasProps = {
  bgColor: string | null;
  copy: AppCopy;
  isUiHidden: boolean;
  locale: Locale;
  objects: SceneObject[];
  onBgColorChange: (color: string | null) => void;
  onCameraApiReady: (api: CameraApi | null) => void;
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
  getPose: () => CameraPose | null;
  setPose: (pose: CameraPose) => void;
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
  canvasBgColor: string | null;
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

const DEFAULT_BG: Record<UiTheme, string> = { dark: "#2e2b28", light: "#f2ebe0" };

function getGridColors(bgHex: string | null, uiTheme: UiTheme) {
  const hex = bgHex ?? DEFAULT_BG[uiTheme];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5
    ? { cell: "#888888", section: "#555555" }
    : { cell: "#555555", section: "#888888" };
}

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
function applyMotionPose(
  group: THREE.Group,
  object: SceneObject,
  index: number,
  timeMs: number,
  spawnOverrides: SpawnOverrides,
) {
  const sampled = sampleMotion(object, timeMs);

  if (!sampled) {
    return;
  }

  // Reusa a mesma resolução de posição do render estático para o preview não
  // divergir do que o objeto mostra parado.
  const [x, y, z] = getResolvedObjectPosition(
    { ...object, ...sampled },
    index,
    spawnOverrides,
    DEVICE_MODELS[object.modelId].modelSpawnOffset,
  );

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
  isSceneSettled,
  objects,
  onCameraApiReady,
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
  uiTheme,
  canvasBgColor,
}: SceneBridgeProps) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const gridRef = useRef<THREE.Mesh | null>(null);
  const sceneRef = useRef<THREE.Group | null>(null);
  // Refs por objeto: o preview de movimento escreve no grupo direto, e eles
  // nascem dentro de um .map, então não dá para ter um useRef por objeto.
  const objectGroupsRef = useRef(new Map<string, THREE.Group>());
  const { advance, camera, gl, scene, size } = useThree();
  // Enquanto um vídeo é exportado, os vídeos das telas são do exportador: o
  // controlador do editor não pode posicioná-los no playhead por cima.
  const isExportingVideoRef = useRef(false);
  // A exportação lê a cena de quando roda, não de quando foi registrada.
  const latestSceneRef = useRef({ motionPlayheadMs, objects, spawnOverrides });
  latestSceneRef.current = { motionPlayheadMs, objects, spawnOverrides };

  function handleObjectDoubleClick(
    event: ThreeEvent<MouseEvent>,
    objectId: string,
  ) {
    event.stopPropagation();
    onSelectObject(objectId);
  }

  useEffect(() => {
    onExportReady(async ({ height, label, width, includeBackground, backgroundColor }) => {
      await exportCanvasPhoto({
        camera,
        gl,
        gridRef,
        preset: { height, label, width, includeBackground, backgroundColor },
        scene,
      });
    });

    return () => {
      onExportReady(null);
    };
  }, [camera, gl, onExportReady, scene, size]);

  useEffect(() => {
    function applyPoses(
      timeMs: number,
      { objects: current, spawnOverrides: overrides } = latestSceneRef.current,
    ) {
      // Mesma contagem do render: a posição de spawn depende do índice entre
      // os visíveis.
      current
        .filter((object) => object.isVisible)
        .forEach((object, index) => {
          const group = objectGroupsRef.current.get(object.id);

          if (group) {
            applyMotionPose(group, object, index, timeMs, overrides);
          }
        });
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
          restore: () => applyPoses(latestSceneRef.current.motionPlayheadMs ?? 0),
          scene,
        },
        request.size,
        request.background,
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
  }, [advance, camera, gl, onVideoExportReady, scene]);

  const gridColors = getGridColors(canvasBgColor, uiTheme);

  return (
    <>
      <Environment preset="studio" />
      <Grid
        ref={gridRef}
        position={[0, -300, 0]}
        cellSize={50}
        cellThickness={0.5}
        cellColor={gridColors.cell}
        sectionSize={200}
        sectionThickness={1}
        sectionColor={gridColors.section}
        fadeDistance={5500}
        fadeStrength={0.9}
        infiniteGrid
      />
      <Bounds margin={1.18}>
        <group ref={sceneRef}>
          {objects.filter((object) => object.isVisible).map((object, index) => {
            const model = DEVICE_MODELS[object.modelId];
            // Em modo movimento a cena inteira mostra o instante do playhead.
            // É só exibição: o transform estático do objeto não é tocado.
            const sampled =
              motionPlayheadMs !== null
                ? sampleMotion(object, motionPlayheadMs)
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
                  userData={{ opacity: displayed.opacity }}
                >
                  <group
                    rotation={model.baseRotation}
                    scale={model.modelScale.map((s) => s * (scaleOverrides[index] ?? 1)) as [number, number, number]}
                  >
                    <group position={model.pivotOffset}>
                    <model.component
                      colors={object.colors}
                      matteColors={object.matteColors}
                      debugPartColors={
                        object.debugMode ? object.debugPartColors : undefined
                      }
                      imageUrl={object.imageUrl}
                      videoUrl={getActiveScreenVideo(object)?.url ?? null}
                      videoKey={object.id}
                      screenFit={getActiveScreenFit(object)}
                      screenPosition={model.screenPosition}
                      screenSize={model.screenSize}
                      showDeviceShell={object.showDeviceShell}
                      showNotebookKeyboard={object.showNotebookKeyboard}
                      showTabletBezel={object.showTabletBezel}
                    />
                    </group>
                  </group>
                </group>
              </Suspense>
            );
          })}
        </group>
        <OpacityController groupsRef={objectGroupsRef} />
        <ScreenVideoController
          isPausedRef={isExportingVideoRef}
          motionPlayheadMs={motionPlayheadMs}
          motionStartedAt={motionStartedAt}
          objects={objects}
        />
        <BoundsResetController
          controlsRef={controlsRef}
          isSceneSettled={isSceneSettled}
          onCameraApiReady={onCameraApiReady}
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
        {...ANGLE_LIMITS}
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
  useFrame(() => {
    if (isPausedRef.current) {
      return;
    }

    for (const object of objects) {
      const video = getActiveScreenVideo(object);
      const element = video ? getScreenVideoElement(object.id) : null;

      if (!video || !element || element.readyState < 1) {
        continue;
      }

      const isPlaying = motionStartedAt !== null;
      // Vídeo só existe no Movimento, onde sempre há um instante: o do
      // relógio tocando ou o do playhead.
      const sceneTimeMs = isPlaying
        ? Date.now() - motionStartedAt
        : (motionPlayheadMs ?? 0);
      const targetMs = getScreenVideoTime(video, sceneTimeMs);
      // O último quadro fica um pouco antes do fim: em `duration` exato alguns
      // navegadores mostram preto.
      const targetS = Math.min(targetMs, video.durationMs - 20) / 1000;
      const insideVideo =
        isPlaying &&
        sceneTimeMs >= video.startMs &&
        sceneTimeMs < video.startMs + video.durationMs;

      if (insideVideo) {
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

function MotionDriver({
  groupsRef,
  index,
  object,
  spawnOverrides,
  startedAt,
}: {
  groupsRef: { current: Map<string, THREE.Group> };
  index: number;
  object: SceneObject;
  spawnOverrides: SpawnOverrides;
  startedAt: number;
}) {
  useFrame(() => {
    const group = groupsRef.current.get(object.id);

    if (group) {
      applyMotionPose(
        group,
        object,
        index,
        Date.now() - startedAt,
        spawnOverrides,
      );
    }
  });

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
  modelId: SceneObject["modelId"];
  onObjectResolved: (id: string) => void;
}) {
  useEffect(() => {
    onObjectResolved(id);
  }, [id, modelId, onObjectResolved]);

  return null;
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

function BoundsResetController({
  controlsRef,
  isSceneSettled,
  onCameraApiReady,
  onTemplateApplied,
  pendingCameraPose,
  sceneFitKey,
  onViewportControlsReady,
  sceneRef,
}: {
  controlsRef: { current: CameraControlsImpl | null };
  isSceneSettled: boolean;
  onCameraApiReady: (api: CameraApi | null) => void;
  onTemplateApplied: () => void;
  pendingCameraPose: CameraPose | null;
  sceneFitKey: string;
  onViewportControlsReady: (api: ViewportControlsApi | null) => void;
  sceneRef: { current: THREE.Group | null };
}) {
  const bounds = useBounds();
  const { camera, gl } = useThree();
  // Cena cuja câmera veio de um template. Sem isso, limpar a pose pendente
  // (que está nas deps do effect) dispararia um auto-fit logo depois de
  // restaurar a câmera, desfazendo a restauração.
  const restoredPoseKeyRef = useRef<string | null>(null);
  // O callback vem do page em cada render. Se entrasse nas dependências do
  // effect abaixo, ele reiniciaria a cada render e o cleanup cancelaria o
  // requestAnimationFrame antes de o quadro chegar — nem o enquadramento
  // salvo nem o auto-fit chegariam a rodar.
  const onTemplateAppliedRef = useRef(onTemplateApplied);

  useEffect(() => {
    onTemplateAppliedRef.current = onTemplateApplied;
  }, [onTemplateApplied]);

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

      camera.near = distance / 100;
      camera.far = distance * 100;
      camera.updateProjectionMatrix();

      // Com um template em aplicação, o enquadramento salvo substitui o
      // auto-fit — sem transição, já que a cena está coberta pelo loading.
      // Reaplicamos a cada passada (os objetos resolvem um a um) e só
      // liberamos quando a cena inteira assentou, garantindo que a câmera
      // seja de fato o último passo.
      if (pendingCameraPose) {
        const [px, py, pz] = pendingCameraPose.position;
        const [tx, ty, tz] = pendingCameraPose.target;

        restoredPoseKeyRef.current = sceneFitKey;

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

      void controls.setLookAt(
        center.x, center.y, center.z + distance,
        center.x, center.y, center.z,
        true,
      ).then(() => {
        controls.saveState();
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    bounds,
    camera,
    controlsRef,
    gl,
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

        fitWithMargin(controls, target);
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
    });

    return () => {
      onCameraApiReady(null);
    };
  }, [controlsRef, onCameraApiReady, sceneRef]);

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    onViewportControlsReady({
      // Enquadra todos os objetos visíveis, recalculado na hora — ao contrário
      // do sceneFitKey, que só reage a entrar/sair objeto e ignora posição.
      fitToScene: () => {
        const sceneGroup = sceneRef.current;

        if (!sceneGroup) {
          return;
        }

        fitWithMargin(controls, sceneGroup);
      },
      panDown: () => controls.truck(0, -controls.distance * PAN_STEP_RATIO, false),
      panLeft: () => controls.truck(-controls.distance * PAN_STEP_RATIO, 0, false),
      panRight: () => controls.truck(controls.distance * PAN_STEP_RATIO, 0, false),
      panUp: () => controls.truck(0, controls.distance * PAN_STEP_RATIO, false),
      zoomIn: () => controls.dolly(controls.distance * 0.138, false),
      zoomOut: () => controls.dolly(-controls.distance * 0.138, false),
    });

    return () => {
      onViewportControlsReady(null);
    };
  }, [controlsRef, onViewportControlsReady, sceneRef]);

  return null;
}

export default function MockupCanvas(props: MockupCanvasProps) {
  const [viewportControls, setViewportControls] =
    useState<ViewportControlsApi | null>(null);
  // A cor de fundo é controlada pelo page para poder entrar nos templates.
  const canvasBgColor = props.bgColor;
  const setCanvasBgColor = props.onBgColorChange;
  const exportHandlerRef =
    useRef<((preset: ExportPreset) => Promise<void>) | null>(null);
  const [isExportReady, setIsExportReady] = useState(false);
  const [loadingObjectIds, setLoadingObjectIds] = useState<string[]>([]);
  const [resolvedObjectIds, setResolvedObjectIds] = useState<string[]>([]);
  const [incrementalLoadingDelayElapsed, setIncrementalLoadingDelayElapsed] =
    useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const videoExportHandlerRef = useRef<VideoExportHandler | null>(null);
  const [isVideoExportReady, setIsVideoExportReady] = useState(false);
  // Quadros prontos da exportação de vídeo em curso; null = nenhuma.
  const [videoProgress, setVideoProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const videoAbortRef = useRef<AbortController | null>(null);
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
  const stageClass =
    canvasBgColor && !isFramed
      ? "mockup-stage relative flex-1 h-screen"
      : `mockup-stage relative flex-1 h-screen ${props.uiTheme === "dark" ? "mockup-stage-dark" : "mockup-stage-light"}`;
  const currentObjectIds = new Set(
    props.objects
      .filter((object) => object.isVisible)
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

  function handleObjectLoadStateChange(id: string, isLoading: boolean) {
    setLoadingObjectIds((current) => {
      if (isLoading) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((currentId) => currentId !== id);
    });
  }

  function handleObjectResolved(id: string) {
    setResolvedObjectIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setLoadingObjectIds((current) => current.filter((currentId) => currentId !== id));
  }

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

    videoAbortRef.current = controller;
    setVideoProgress({ done: 0, total: frameTimes.length });

    try {
      const blob = await exportVideo({
        // O mesmo fundo do PNG: a cor do canvas, ou a padrão do tema.
        background: settings.background
          ? (canvasBgColor ?? DEFAULT_BG[props.uiTheme])
          : null,
        frameTimes,
        onProgress: (done, total) => setVideoProgress({ done, total }),
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

    // Cor de fundo efetiva do canvas (a mesma exibida no editor).
    const backgroundColor = canvasBgColor ?? DEFAULT_BG[props.uiTheme];

    try {
      setIsExporting(true);
      await exportHandler({
        width: resolution.width,
        height: resolution.height,
        includeBackground: resolution.includeBackground,
        backgroundColor,
        label: `mock-photo-${resolution.width}x${resolution.height}-${formatTimestampForFilename(new Date())}`,
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
      style={canvasBgColor && !isFramed ? { background: canvasBgColor } : undefined}
    >
      {/* O mesmo contêiner nos dois modos, só com outra forma: trocar a
          estrutura remontaria o <Canvas> e recarregaria a cena inteira. */}
      <div
        className={`canvas-viewport${isFramed ? " is-framed" : ""}${
          isFramed && props.isUiHidden ? " is-ui-hidden" : ""
        }`}
      >
      <div
        className="canvas-frame"
        style={
          motionFrame
            ? ({
                "--canvas-frame-ratio": motionFrame.width / motionFrame.height,
                background: canvasBgColor ?? undefined,
              } as CSSProperties)
            : undefined
        }
      >
      <Canvas
        camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <SceneBridge
          {...props}
          canvasBgColor={canvasBgColor}
          isSceneSettled={isSceneSettled}
          onExportReady={(handler) => {
            exportHandlerRef.current = handler;
            setIsExportReady(Boolean(handler));
          }}
          onObjectLoadStateChange={handleObjectLoadStateChange}
          onObjectResolved={handleObjectResolved}
          onSelectObject={props.onSelectObject}
          onVideoExportReady={(handler) => {
            videoExportHandlerRef.current = handler;
            setIsVideoExportReady(Boolean(handler));
          }}
          onViewportControlsReady={setViewportControls}
          sceneFitKey={sceneFitKey}
        />
      </Canvas>
      </div>
      </div>

      {/* Enquanto o template assenta, bloqueia a interação com a cena para
          que um arraste acidental não estrague o enquadramento restaurado. */}
      {isApplyingTemplate ? (
        <div className="canvas-blocking-overlay">
          <ActivityNotice label={props.copy.canvasTemplateLoadingLabel} />
        </div>
      ) : null}

      {/* Exportando vídeo, a cena é do exportador quadro a quadro: mexer nela
          agora estragaria o arquivo. O aviso mostra o progresso e cancela. */}
      {videoProgress ? (
        <div className="canvas-blocking-overlay">
          <ActivityNotice
            label={props.copy.videoExportProgress
              .replace("{done}", String(videoProgress.done))
              .replace("{total}", String(videoProgress.total))}
            action={
              <button
                type="button"
                className="activity-notice-action"
                onClick={() => videoAbortRef.current?.abort()}
              >
                {props.copy.videoExportCancel}
              </button>
            }
          />
        </div>
      ) : null}

      <div
        className={`canvas-stage-overlay${
          props.isMotionMode ? " with-timeline" : ""
        }`}
      >
        {!props.isUiHidden ? (
          <div className="canvas-mode-toggle" role="tablist">
            {([false, true] as const).map((mode) => (
              <button
                key={String(mode)}
                type="button"
                role="tab"
                aria-selected={props.isMotionMode === mode}
                className={`canvas-mode-tab${
                  props.isMotionMode === mode ? " is-active" : ""
                }`}
                onClick={() => props.onMotionModeChange(mode)}
              >
                {mode ? props.copy.transformMotionTab : props.copy.transformStaticTab}
              </button>
            ))}
          </div>
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
          bgColor={canvasBgColor}
          copy={props.copy}
          isUiHidden={props.isUiHidden}
          locale={props.locale}
          onBgColorChange={setCanvasBgColor}
          onFitToScene={() => viewportControls?.fitToScene()}
          onPanDown={() => viewportControls?.panDown()}
          onPanLeft={() => viewportControls?.panLeft()}
          onPanRight={() => viewportControls?.panRight()}
          onPanUp={() => viewportControls?.panUp()}
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

        {props.isMotionMode && !props.isUiHidden ? props.timeline : null}
      </div>
    </div>
  );
}
