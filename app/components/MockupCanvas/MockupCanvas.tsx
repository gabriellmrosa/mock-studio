"use client";

import "./MockupCanvas.css";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import {
  Bounds,
  CameraControls,
  Environment,
  Grid,
  useBounds,
} from "@react-three/drei";
import CameraControlsImpl from "camera-controls";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import type { CameraPose } from "../../lib/scene-templates";
import {
  AUTO_OBJECT_POSITIONS,
  OBJECT_POSITION_MULTIPLIER,
  OBJECT_POSITION_MULTIPLIER_Z,
} from "../../lib/scene-presets";
import { DEVICE_MODELS } from "../../models/device-models";
import FloatingCanvasControls from "../FloatingCanvasControls/FloatingCanvasControls";
import {
  exportCanvasPhoto,
  formatTimestampForFilename,
} from "./export-photo";
import ActivityNotice from "../ActivityNotice/ActivityNotice";

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
  objects: SceneObject[];
  onBgColorChange: (color: string | null) => void;
  onCameraApiReady: (api: CameraApi | null) => void;
  onNotify?: (tone: "error" | "success", message: string) => void;
  onSaveTemplate?: () => void;
  onSelectObject: (id: string) => void;
  onTemplateApplied: () => void;
  onToggleUiHidden: () => void;
  // Enquadramento a restaurar ao aplicar um template. Enquanto não for null a
  // cena fica bloqueada por um loading, e a câmera é o último passo aplicado.
  pendingCameraPose: CameraPose | null;
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

function SceneBridge({
  isSceneSettled,
  objects,
  onCameraApiReady,
  onExportReady,
  onObjectLoadStateChange,
  onObjectResolved,
  onSelectObject,
  onTemplateApplied,
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
  const { camera, gl, scene, size } = useThree();

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
                <group
                  name={object.id}
                  onDoubleClick={(event) =>
                    handleObjectDoubleClick(event, object.id)
                  }
                  position={getResolvedObjectPosition(object, index, spawnOverrides, model.modelSpawnOffset)}
                  rotation={[
                    (object.rotationX * Math.PI) / 180,
                    (object.rotationY * Math.PI) / 180,
                    (object.rotationZ * Math.PI) / 180,
                  ]}
                  scale={object.scale}
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
  const { camera } = useThree();
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

  const stageClass = canvasBgColor
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
  const isApplyingTemplate = props.pendingCameraPose !== null;
  const isIncrementalObjectLoading =
    activeLoadingObjectIds.length > 0 && activeResolvedObjectIds.length > 0;
  const showIncrementalLoading =
    isIncrementalObjectLoading && incrementalLoadingDelayElapsed;
  const incrementalLoadingLabel =
    activeLoadingObjectIds.length > 1
      ? `${props.copy.canvasObjectLoadingLabel} (${activeLoadingObjectIds.length})`
      : props.copy.canvasObjectLoadingLabel;
  const sceneFitKey = `${props.objects.map((object) => object.id).join(",")}::${activeResolvedObjectIds.join(",")}`;

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
      style={canvasBgColor ? { background: canvasBgColor } : undefined}
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
          onViewportControlsReady={setViewportControls}
          sceneFitKey={sceneFitKey}
        />
      </Canvas>

      {/* Enquanto o template assenta, bloqueia a interação com a cena para
          que um arraste acidental não estrague o enquadramento restaurado. */}
      {isApplyingTemplate ? (
        <div className="canvas-blocking-overlay">
          <ActivityNotice label={props.copy.canvasTemplateLoadingLabel} />
        </div>
      ) : null}

      <div className="canvas-stage-overlay">
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
          takePhotoDisabled={!isExportReady || isExporting}
          uiTheme={props.uiTheme}
        />
      </div>
    </div>
  );
}
