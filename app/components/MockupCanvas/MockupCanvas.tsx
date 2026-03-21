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
  useBounds,
} from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import type { UiTheme } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import {
  AUTO_OBJECT_POSITIONS,
  OBJECT_POSITION_MULTIPLIER,
} from "../../lib/scene-presets";
import { DEVICE_MODELS } from "../../models/device-models";
import FloatingCanvasControls from "../FloatingCanvasControls/FloatingCanvasControls";

export type ExportPreset = {
  height: number;
  label: string;
  width: number;
};

type MockupCanvasProps = {
  cameraInverted: boolean;
  canvasBgColor: string | null;
  objects: SceneObject[];
  onBgColorChange: (color: string) => void;
  onExportReady: (handler: (preset: ExportPreset) => Promise<void>) => void;
  resetCameraVersion: number;
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

type SceneBridgeProps = MockupCanvasProps & {
  onViewportControlsReady: (api: ViewportControlsApi | null) => void;
};

const CAMERA_POSITION: [number, number, number] = [0, 0, 5];
const CAMERA_FOV = 45;
const ANGLE_LIMITS = {
  maxAzimuthAngle: 0.85,
  maxPolarAngle: Math.PI * 0.68,
  minAzimuthAngle: -0.85,
  minPolarAngle: Math.PI * 0.32,
};
function getObjectPosition(index: number): [number, number, number] {
  if (AUTO_OBJECT_POSITIONS[index]) {
    return AUTO_OBJECT_POSITIONS[index];
  }

  const side = index % 2 === 0 ? 1 : -1;
  const ring = Math.floor(index / 2);
  return [side * (0.7 + ring * 0.28), 0, side * 0.12];
}

function getResolvedObjectPosition(
  object: SceneObject,
  index: number,
): [number, number, number] {
  const [baseX, baseY, baseZ] = getObjectPosition(index);

  return [
    baseX + object.positionX * OBJECT_POSITION_MULTIPLIER,
    baseY + object.positionY * OBJECT_POSITION_MULTIPLIER,
    baseZ + object.positionZ * OBJECT_POSITION_MULTIPLIER,
  ];
}

function SceneBridge({
  cameraInverted,
  objects,
  onExportReady,
  onViewportControlsReady,
  resetCameraVersion,
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
      onExportReady(async () => {
        throw new Error("Export indisponivel.");
      });
    };
  }, [camera, gl, onExportReady, scene, size.height, size.width]);

  return (
    <>
      <Environment preset="studio" />
      <Suspense fallback={null}>
        <Bounds margin={1.18}>
          <Center>
            <group ref={sceneRef}>
              {objects.map((object, index) => {
                const model = DEVICE_MODELS[object.modelId];

                return (
                  <group
                    key={object.id}
                    position={getResolvedObjectPosition(object, index)}
                    rotation={[
                      (object.rotationX * Math.PI) / 180,
                      (object.rotationY * Math.PI) / 180,
                      (object.rotationZ * Math.PI) / 180,
                    ]}
                  >
                    <model.component
                      bodyColor={object.colors.body}
                      buttonsColor={object.colors.buttons}
                      debugPartColors={
                        object.debugMode ? object.debugPartColors : undefined
                      }
                      imageUrl={object.imageUrl}
                      screenPosition={model.screenPosition}
                      screenSize={model.screenSize}
                      showDeviceShell={object.showDeviceShell}
                    />
                  </group>
                );
              })}
            </group>
          </Center>
          <BoundsResetController
            controlsRef={controlsRef}
            onViewportControlsReady={onViewportControlsReady}
            resetCameraVersion={resetCameraVersion}
            sceneRef={sceneRef}
          />
        </Bounds>
      </Suspense>
      <CameraControls
        ref={controlsRef}
        makeDefault
        {...ANGLE_LIMITS}
        dampingFactor={0.08}
        azimuthRotateSpeed={cameraInverted ? -1 : 1}
        polarRotateSpeed={cameraInverted ? -1 : 1}
      />
    </>
  );
}

function BoundsResetController({
  controlsRef,
  onViewportControlsReady,
  resetCameraVersion,
  sceneRef,
}: {
  controlsRef: { current: CameraControlsImpl | null };
  onViewportControlsReady: (api: ViewportControlsApi | null) => void;
  resetCameraVersion: number;
  sceneRef: { current: THREE.Group | null };
}) {
  const bounds = useBounds();
  const { camera } = useThree();
  const hasCapturedInitialState = useRef(false);

  useEffect(() => {
    const controls = controlsRef.current;
    const sceneGroup = sceneRef.current;

    if (!controls || !sceneGroup || hasCapturedInitialState.current) {
      return;
    }

    let frameId = 0;

    frameId = requestAnimationFrame(() => {
      bounds.refresh(sceneGroup);

      const { center, distance } = bounds.getSize();

      camera.near = distance / 100;
      camera.far = distance * 100;
      camera.updateProjectionMatrix();

      controls.setLookAt(
        center.x,
        center.y,
        center.z + distance,
        center.x,
        center.y,
        center.z,
        true,
      );
      controls.saveState();

      hasCapturedInitialState.current = true;
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [bounds, camera, controlsRef, sceneRef]);

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) {
      return;
    }

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
      resetToInitial: () => controls.reset(true),
      zoomIn: () => controls.dolly(controls.distance * 0.138, false),
      zoomOut: () => controls.dolly(-controls.distance * 0.138, false),
    });

    return () => {
      onViewportControlsReady(null);
    };
  }, [bounds, controlsRef, onViewportControlsReady, sceneRef]);

  useEffect(() => {
    if (resetCameraVersion === 0) {
      return;
    }

    controlsRef.current?.reset(true);
  }, [controlsRef, resetCameraVersion]);

  return null;
}

export default function MockupCanvas(props: MockupCanvasProps) {
  const [viewportControls, setViewportControls] =
    useState<ViewportControlsApi | null>(null);

  const stageClass = props.canvasBgColor
    ? "mockup-stage relative flex-1 h-screen"
    : `mockup-stage relative flex-1 h-screen ${props.uiTheme === "dark" ? "mockup-stage-dark" : "mockup-stage-light"}`;

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
          onViewportControlsReady={setViewportControls}
        />
      </Canvas>

      <div className="canvas-stage-overlay">
        <FloatingCanvasControls
          bgColor={props.canvasBgColor}
          onBgColorChange={props.onBgColorChange}
          onFitToScene={() => viewportControls?.fitToScene()}
          onPanDown={() => viewportControls?.panDown()}
          onPanLeft={() => viewportControls?.panLeft()}
          onPanRight={() => viewportControls?.panRight()}
          onPanUp={() => viewportControls?.panUp()}
          onZoomIn={() => viewportControls?.zoomIn()}
          onZoomOut={() => viewportControls?.zoomOut()}
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
