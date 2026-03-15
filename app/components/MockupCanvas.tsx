"use client";

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Bounds,
  Center,
  Environment,
  OrbitControls,
  type OrbitControlsProps,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  type PhoneColors,
} from "./Smartphone";
import type { DeviceModelDefinition } from "../models/device-models";

export type MockupTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
};

export type ExportPreset = {
  height: number;
  label: string;
  width: number;
};

type MockupCanvasProps = {
  colors: PhoneColors;
  debugPartColors?: Record<string, string>;
  debugMode: boolean;
  imageUrl: string;
  model: DeviceModelDefinition;
  onExportReady: (handler: (preset: ExportPreset) => Promise<void>) => void;
  onResetCameraReady: (handler: () => void) => void;
  showDeviceShell: boolean;
  transform: MockupTransform;
};

const CAMERA_POSITION: [number, number, number] = [0, 0, 5];
const CAMERA_FOV = 45;
const ORBIT_LIMITS: OrbitControlsProps = {
  enablePan: false,
  enableZoom: false,
  maxAzimuthAngle: 0.85,
  maxPolarAngle: Math.PI * 0.68,
  minAzimuthAngle: -0.85,
  minPolarAngle: Math.PI * 0.32,
};

function SceneBridge({
  colors,
  debugPartColors,
  debugMode,
  imageUrl,
  model,
  onExportReady,
  onResetCameraReady,
  showDeviceShell,
  transform,
}: MockupCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const mockupRef = useRef<THREE.Group | null>(null);
  const { camera, gl, scene, size } = useThree();

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }

    controls.target.set(0, 0, 0);
    controls.update();
    onResetCameraReady(() => {
      controls.reset();
      controls.target.set(0, 0, 0);
      controls.update();
    });
  }, [onResetCameraReady]);

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

  useLayoutEffect(() => {
    const mockup = mockupRef.current;
    if (!mockup) {
      return;
    }

    mockup.position.set(...transform.position);
    mockup.rotation.set(...transform.rotation);
  }, [transform.position, transform.rotation]);

  return (
    <>
      <Environment preset="studio" />
      <Suspense fallback={null}>
        <Bounds fit clip margin={1.15}>
          <Center>
            <group ref={mockupRef}>
              <model.component
                bodyColor={colors.body}
                buttonsColor={colors.buttons}
                debugPartColors={debugMode ? debugPartColors : undefined}
                imageUrl={imageUrl}
                screenPosition={model.screenPosition}
                screenSize={model.screenSize}
                showDeviceShell={showDeviceShell}
              />
            </group>
          </Center>
        </Bounds>
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        {...ORBIT_LIMITS}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
}

export default function MockupCanvas(props: MockupCanvasProps) {
  return (
    <div className="mockup-stage flex-1 h-screen">
      <Canvas
        camera={{ fov: CAMERA_FOV, position: CAMERA_POSITION }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      >
        <SceneBridge {...props} />
      </Canvas>
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
