"use client";

import "./FloatingCanvasControls.css";
import { useRef } from "react";
import type { UiTheme } from "../../lib/i18n";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CameraIcon,
  RotateCcwIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "../Icons";

type FloatingCanvasControlsProps = {
  bgColor: string | null;
  onBgColorChange: (color: string) => void;
  onFitToScene: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  uiTheme: UiTheme;
};

const DEFAULT_BG: Record<UiTheme, string> = {
  dark: "#2e2b28",
  light: "#f2ebe0",
};

export default function FloatingCanvasControls({
  bgColor,
  onBgColorChange,
  onFitToScene,
  onZoomIn,
  onZoomOut,
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
          aria-label="Reset camera"
          title="Reset camera"
          onClick={onFitToScene}
        >
          <RotateCcwIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move up"
          title="Move up"
        >
          <ArrowUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move down"
          title="Move down"
        >
          <ArrowDownIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move left"
          title="Move left"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Move right"
          title="Move right"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={onZoomOut}
        >
          <ZoomOutIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={onZoomIn}
        >
          <ZoomInIcon className="h-4 w-4" />
        </button>

        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="editor-fab"
            aria-label="Canvas background color"
            title="Canvas background color"
            onClick={() => colorInputRef.current?.click()}
          >
            <div
              style={{
                width: "1rem",
                height: "1rem",
                borderRadius: "var(--radius-xs)",
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
            style={{
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
              width: 0,
              height: 0,
            }}
          />
        </div>
      </div>

      <button
        type="button"
        className="canvas-capture-button"
        aria-label="Take photo"
        title="Take photo"
      >
        <CameraIcon className="h-4 w-4" />
        <span>Take photo</span>
      </button>
    </div>
  );
}
