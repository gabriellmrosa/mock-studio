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
import ContextMenu, { type ContextMenuItem } from "../ContextMenu/ContextMenu";

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

const EXPORT_OPTIONS = [
  { id: "full-hd", label: "1920x1080", enabled: true },
  { id: "quad-hd", label: "2560x1440", enabled: false },
  { id: "ultra-hd", label: "3840x2160", enabled: false },
] as const;

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
  const exportMenuItems: ContextMenuItem[] = EXPORT_OPTIONS.map((option) => ({
    type: "action",
    label: option.label,
    badgeLabel: option.enabled ? undefined : "Em breve",
    disabled: !option.enabled,
    onClick: onTakePhoto,
  }));

  return (
    <div className="canvas-floating-toolbar">
      <div className="canvas-floating-cluster">
        <button
          type="button"
          className="editor-fab mr-4"
          aria-label={copy.resetCameraButton}
          title={copy.resetCameraButton}
          onClick={onResetCamera}
        >
          <RotateCcw size={16} />
        </button>
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
          aria-label={copy.moveUpButton}
          title={copy.moveUpButton}
          onClick={onPanUp}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label={copy.moveDownButton}
          title={copy.moveDownButton}
          onClick={onPanDown}
        >
          <ArrowDown size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label={copy.moveLeftButton}
          title={copy.moveLeftButton}
          onClick={onPanLeft}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label={copy.moveRightButton}
          title={copy.moveRightButton}
          onClick={onPanRight}
        >
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label={copy.zoomOutButton}
          title={copy.zoomOutButton}
          onClick={onZoomOut}
        >
          <ZoomOut size={16} />
        </button>
        <button
          type="button"
          className="editor-fab"
          aria-label={copy.zoomInButton}
          title={copy.zoomInButton}
          onClick={onZoomIn}
        >
          <ZoomIn size={16} />
        </button>

        <div className="canvas-color-control">
          <button
            type="button"
            className="editor-fab"
            aria-label={copy.backgroundColorButton}
            title={copy.backgroundColorButton}
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

      <ContextMenu
        items={exportMenuItems}
        panelPlacement="top-end"
        panelClassName="canvas-export-context-menu"
        triggerAriaLabel={copy.takePhotoButton}
        triggerTitle={copy.takePhotoButton}
        triggerDisabled={takePhotoDisabled}
        triggerIcon={<Camera size={16} />}
        triggerContentClassName="canvas-capture-button"
        triggerContent={
          <>
            <Camera size={16} />
            <span>{copy.takePhotoButton}</span>
          </>
        }
      />
    </div>
  );
}
