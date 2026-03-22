"use client";

import "./FloatingCanvasControls.css";
import { useRef } from "react";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  RotateCcw,
  ScanSearch,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type FloatingCanvasControlsProps = {
  bgColor: string | null;
  copy: AppCopy;
  onBgColorChange: (color: string) => void;
  onFitToScene: () => void;
  onResetCamera: () => void;
  onPanDown: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onPanUp: () => void;
  onTakePhoto: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  takePhotoDisabled: boolean;
  uiTheme: UiTheme;
};

const DEFAULT_BG: Record<UiTheme, string> = {
  dark: "#2e2b28",
  light: "#f2ebe0",
};

export default function FloatingCanvasControls({
  bgColor,
  copy,
  onBgColorChange,
  onFitToScene,
  onResetCamera,
  onPanDown,
  onPanLeft,
  onPanRight,
  onPanUp,
  onTakePhoto,
  onZoomIn,
  onZoomOut,
  takePhotoDisabled,
  uiTheme,
}: FloatingCanvasControlsProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const displayColor = bgColor ?? DEFAULT_BG[uiTheme];
  const circleBorder =
    uiTheme === "dark"
      ? "1.5px solid rgba(255,255,255,0.28)"
      : "1.5px solid rgba(0,0,0,0.18)";

  return (
    <div className="canvas-floating-toolbar">
      <div className="canvas-floating-cluster">
        <button
          type="button"
          className="editor-fab"
          aria-label={copy.fitSceneButton}
          title={copy.fitSceneButton}
          onClick={onFitToScene}
        >
          <ScanSearch size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label={copy.resetCameraButton}
          title={copy.resetCameraButton}
          onClick={onResetCamera}
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move up"
          title="Move up"
          onClick={onPanUp}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move down"
          title="Move down"
          onClick={onPanDown}
        >
          <ArrowDown size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move left"
          title="Move left"
          onClick={onPanLeft}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move right"
          title="Move right"
          onClick={onPanRight}
        >
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={onZoomOut}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={onZoomIn}
        >
          <ZoomIn size={16} />
        </button>

        <div className="canvas-color-control">
          <button
            type="button"
            className="editor-fab"
            aria-label="Canvas background color"
            title="Canvas background color"
            onClick={() => colorInputRef.current?.click()}
          >
            <div
              className="canvas-color-swatch"
              style={{
                background: displayColor,
                border: circleBorder,
              }}
            />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={displayColor}
            onChange={(e) => onBgColorChange(e.target.value)}
            className="canvas-color-input"
          />
        </div>
      </div>

      <button
        type="button"
        className="canvas-capture-button"
        aria-label={copy.takePhotoButton}
        disabled={takePhotoDisabled}
        title={copy.takePhotoButton}
        onClick={onTakePhoto}
      >
        <Camera size={16} />
        <span>{copy.takePhotoButton}</span>
      </button>
    </div>
  );
}
