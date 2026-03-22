"use client";

import "./MockupCanvas.css";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Bounds,
  CameraControls,
  Center,
  Environment,
  Grid,
  useBounds,
} from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import {
  AUTO_OBJECT_POSITIONS,
  OBJECT_POSITION_MULTIPLIER,
  OBJECT_POSITION_MULTIPLIER_Z,
} from "../../lib/scene-presets";
import { DEVICE_MODELS } from "../../models/device-models";
import FloatingCanvasControls from "../FloatingCanvasControls/FloatingCanvasControls";

export type ExportPreset = {
  height: number;
  label: string;
  width: number;
};

type MockupCanvasProps = {
  canvasBgColor: string | null;
  copy: AppCopy;
  objects: SceneObject[];
  onBgColorChange: (color: string) => void;
  resetCameraVersion: number;
  scaleOverrides: ScaleOverrides;
  spawnOverrides: SpawnOverrides;
  uiTheme: UiTheme;
};

type ViewportControlsApi = {
  fitToScene: () => void;
  panDown: () => void;
  panLeft: () => void;
  panRight: () => void;
  panUp: () => void;
  resetToInitial: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export type SpawnOverrides = Record<number, [number, number, number]>;
export type ScaleOverrides = Record<number, number>;

type SceneBridgeProps = MockupCanvasProps & {
  onExportReady: (
    handler: ((preset: ExportPreset) => Promise<void>) | null,
  ) => void;
  onObjectLoadStateChange: (id: string, isLoading: boolean) => void;
  onObjectResolved: (id: string) => void;
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
const TAKE_PHOTO_PRESET: ExportPreset = {
  height: 1080,
  label: "take-photo",
  width: 1920,
};
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
  canvasBgColor,
  objects,
  onExportReady,
  onObjectLoadStateChange,
  onObjectResolved,
  onViewportControlsReady,
  resetCameraVersion,
  scaleOverrides,
  sceneFitKey,
  spawnOverrides,
  uiTheme,
}: SceneBridgeProps) {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const sceneRef = useRef<THREE.Group | null>(null);
  const { camera, gl, scene, size } = useThree();

  useEffect(() => {
    onExportReady(async ({ height, label, width }) => {
      const previousWidth = size.width;
      const previousHeight = size.height;
      const previousPixelRatio = gl.getPixelRatio();
      const previousAspect =
        camera instanceof THREE.PerspectiveCamera ? camera.aspect : null;

      gl.setPixelRatio(1);
      gl.setSize(width, height, false);

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      gl.render(scene, camera);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const blob =
        (await new Promise<Blob | null>((resolve) => {
          gl.domElement.toBlob(resolve, "image/png");
        })) ?? dataUrlToBlob(gl.domElement.toDataURL("image/png"));

      gl.setPixelRatio(previousPixelRatio);
      gl.setSize(previousWidth, previousHeight, false);

      if (camera instanceof THREE.PerspectiveCamera && previousAspect !== null) {
        camera.aspect = previousAspect;
        camera.updateProjectionMatrix();
      }

      gl.render(scene, camera);

      if (!blob) {
        throw new Error("Nao foi possivel gerar o PNG.");
      }

      downloadBlob(blob, `${label}.png`);
    });

    return () => {
      onExportReady(null);
    };
  }, [camera, gl, onExportReady, scene, size.height, size.width]);

  const gridColors = getGridColors(canvasBgColor, uiTheme);

  return (
    <>
      <Environment preset="studio" />
      <Grid
        position={[0, -300, 0]}
        cellSize={50}
        cellThickness={0.5}
        cellColor={gridColors.cell}
        sectionSize={200}
        sectionThickness={1}
        sectionColor={gridColors.section}
        fadeDistance={3000}
        fadeStrength={1.5}
        infiniteGrid
      />
      <Bounds margin={1.18}>
        <Center>
          <group ref={sceneRef}>
            {objects.map((object, index) => {
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
                      />
                      </group>
                    </group>
                  </group>
                </Suspense>
              );
            })}
          </group>
        </Center>
        <BoundsResetController
          controlsRef={controlsRef}
          sceneFitKey={sceneFitKey}
          onViewportControlsReady={onViewportControlsReady}
          resetCameraVersion={resetCameraVersion}
          sceneRef={sceneRef}
        />
      </Bounds>
      <CameraControls
        ref={controlsRef}
        makeDefault
        {...ANGLE_LIMITS}
        dampingFactor={0.08}
        azimuthRotateSpeed={1}
        polarRotateSpeed={1}
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

function BoundsResetController({
  controlsRef,
  sceneFitKey,
  onViewportControlsReady,
  resetCameraVersion,
  sceneRef,
}: {
  controlsRef: { current: CameraControlsImpl | null };
  sceneFitKey: string;
  onViewportControlsReady: (api: ViewportControlsApi | null) => void;
  resetCameraVersion: number;
  sceneRef: { current: THREE.Group | null };
}) {
  const bounds = useBounds();
  const { camera } = useThree();
  const initialLookAt = useRef<{
    px: number; py: number; pz: number;
    tx: number; ty: number; tz: number;
  } | null>(null);

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

      initialLookAt.current = {
        px: center.x, py: center.y, pz: center.z + distance,
        tx: center.x, ty: center.y, tz: center.z,
      };

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
  }, [bounds, camera, controlsRef, sceneFitKey, sceneRef]);

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

    const resetToInitial = () => {
      void controls.reset(true);
    };

    onViewportControlsReady({
      fitToScene: () => {
        const sceneGroup = sceneRef.current;

        if (!sceneGroup) {
          return;
        }

        const box = new THREE.Box3().setFromObject(sceneGroup);

        controls.fitToBox(box, true);
      },
      panDown: () => controls.truck(0, -controls.distance * 0.08, false),
      panLeft: () => controls.truck(-controls.distance * 0.08, 0, false),
      panRight: () => controls.truck(controls.distance * 0.08, 0, false),
      panUp: () => controls.truck(0, controls.distance * 0.08, false),
      resetToInitial,
      zoomIn: () => controls.dolly(controls.distance * 0.138, false),
      zoomOut: () => controls.dolly(-controls.distance * 0.138, false),
    });

    return () => {
      onViewportControlsReady(null);
    };
  }, [controlsRef, onViewportControlsReady, sceneRef]);

  useEffect(() => {
    if (resetCameraVersion === 0) {
      return;
    }

    const s = initialLookAt.current;
    const controls = controlsRef.current;
    if (!s || !controls) return;

    void controls.reset(true);
  }, [controlsRef, resetCameraVersion]);

  return null;
}

export default function MockupCanvas(props: MockupCanvasProps) {
  const [viewportControls, setViewportControls] =
    useState<ViewportControlsApi | null>(null);
  const exportHandlerRef =
    useRef<((preset: ExportPreset) => Promise<void>) | null>(null);
  const [isExportReady, setIsExportReady] = useState(false);
  const [loadingObjectIds, setLoadingObjectIds] = useState<string[]>([]);
  const [resolvedObjectIds, setResolvedObjectIds] = useState<string[]>([]);
  const [incrementalLoadingDelayElapsed, setIncrementalLoadingDelayElapsed] =
    useState(false);

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

  const stageClass = props.canvasBgColor
    ? "mockup-stage relative flex-1 h-screen"
    : `mockup-stage relative flex-1 h-screen ${props.uiTheme === "dark" ? "mockup-stage-dark" : "mockup-stage-light"}`;
  const currentObjectIds = new Set(props.objects.map((object) => object.id));
  const activeLoadingObjectIds = loadingObjectIds.filter((id) => currentObjectIds.has(id));
  const activeResolvedObjectIds = resolvedObjectIds.filter((id) => currentObjectIds.has(id));
  const isInitialSceneLoading =
    props.objects.length > 0 && activeResolvedObjectIds.length === 0;
  const isIncrementalObjectLoading =
    activeLoadingObjectIds.length > 0 && activeResolvedObjectIds.length > 0;
  const showIncrementalLoading =
    isIncrementalObjectLoading && incrementalLoadingDelayElapsed;
  const incrementalLoadingLabel =
    activeLoadingObjectIds.length > 1
      ? `${props.copy.canvasObjectLoadingLabel} (${activeLoadingObjectIds.length})`
      : props.copy.canvasObjectLoadingLabel;

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

  async function handleTakePhoto() {
    const exportHandler = exportHandlerRef.current;

    if (!exportHandler) {
      return;
    }

    try {
      await exportHandler({
        ...TAKE_PHOTO_PRESET,
        label: `mock-photo-${formatTimestampForFilename(new Date())}`,
      });
    } catch (error) {
      console.error("Failed to export canvas photo.", error);
    }
  }

  return (
    <div
      className={stageClass}
      style={props.canvasBgColor ? { background: props.canvasBgColor } : undefined}
    >
      <Canvas
        camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      >
        <SceneBridge
          {...props}
          onExportReady={(handler) => {
            exportHandlerRef.current = handler;
            setIsExportReady(Boolean(handler));
          }}
          onObjectLoadStateChange={handleObjectLoadStateChange}
          onObjectResolved={handleObjectResolved}
          onViewportControlsReady={setViewportControls}
          sceneFitKey={props.objects.map((o) => o.id).join(",")}
        />
      </Canvas>

      <div className="canvas-stage-overlay">
        {isInitialSceneLoading ? (
          <div className="canvas-loading-overlay">
            <div className="canvas-loading-minimal">
              <div className="canvas-loading-spinner" aria-hidden="true" />
              <p className="canvas-loading-label">{props.copy.canvasInitialLoadingLabel}</p>
            </div>
          </div>
        ) : null}

        {showIncrementalLoading ? (
          <div className="canvas-loading-chip">
            <div className="canvas-loading-spinner canvas-loading-spinner-small" aria-hidden="true" />
            <span>{incrementalLoadingLabel}</span>
          </div>
        ) : null}

        <FloatingCanvasControls
          bgColor={props.canvasBgColor}
          copy={props.copy}
          onBgColorChange={props.onBgColorChange}
          onFitToScene={() => viewportControls?.fitToScene()}
          onResetCamera={() => viewportControls?.resetToInitial()}
          onPanDown={() => viewportControls?.panDown()}
          onPanLeft={() => viewportControls?.panLeft()}
          onPanRight={() => viewportControls?.panRight()}
          onPanUp={() => viewportControls?.panUp()}
          onTakePhoto={() => {
            void handleTakePhoto();
          }}
          onZoomIn={() => viewportControls?.zoomIn()}
          onZoomOut={() => viewportControls?.zoomOut()}
          takePhotoDisabled={!isExportReady}
          uiTheme={props.uiTheme}
        />
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function formatTimestampForFilename(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
