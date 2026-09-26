"use client";

import "./FloatingCanvasControls.css";
import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { AppCopy, UiTheme } from "../../lib/i18n";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bookmark,
  Camera,
  Check,
  Download,
  Eye,
  EyeOff,
  ScanSearch,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import ContextMenu, { type ContextMenuItem } from "../ContextMenu/ContextMenu";

type FloatingCanvasControlsProps = {
  bgColor: string | null;
  copy: AppCopy;
  isUiHidden: boolean;
  onBgColorChange: (color: string) => void;
  onFitToScene: () => void;
  onPanDown: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onPanUp: () => void;
  onSaveTemplate?: () => void;
  onTakePhoto: (resolution: {
    width: number;
    height: number;
    includeBackground: boolean;
  }) => void;
  onToggleUiHidden: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  takePhotoDisabled: boolean;
  uiTheme: UiTheme;
};

const EXPORT_OPTIONS = [
  { id: "full-hd", label: "1920x1080", width: 1920, height: 1080, enabled: true },
  { id: "quad-hd", label: "2560x1440", width: 2560, height: 1440, enabled: true },
  { id: "ultra-hd", label: "3840x2160", width: 3840, height: 2160, enabled: true },
] as const;

const DEFAULT_BG: Record<UiTheme, string> = {
  dark: "#2e2b28",
  light: "#f2ebe0",
};

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const HIDE_UI_CORNER_KEY = "mock-photo-hide-ui-corner";
const EXPORT_BG_KEY = "mock-photo-export-bg";
const DRAG_THRESHOLD = 6;

function isCorner(value: string | null): value is Corner {
  return (
    value === "top-left" ||
    value === "top-right" ||
    value === "bottom-left" ||
    value === "bottom-right"
  );
}

function nearestCorner(x: number, y: number): Corner {
  const vertical = y < window.innerHeight / 2 ? "top" : "bottom";
  const horizontal = x < window.innerWidth / 2 ? "left" : "right";
  return `${vertical}-${horizontal}`;
}

export default function FloatingCanvasControls({
  bgColor,
  copy,
  isUiHidden,
  onBgColorChange,
  onFitToScene,
  onPanDown,
  onPanLeft,
  onPanRight,
  onPanUp,
  onSaveTemplate,
  onTakePhoto,
  onToggleUiHidden,
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

  // Modo de fundo do export: false = transparente (padrão), true = com fundo.
  const [exportWithBg, setExportWithBg] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(EXPORT_BG_KEY) === "1";
  });

  function chooseExportBg(value: boolean) {
    setExportWithBg(value);
    window.localStorage.setItem(EXPORT_BG_KEY, value ? "1" : "0");
  }

  // Salvar a cena como template junto do export é uma ação paralela: não muda
  // o PNG gerado, apenas guarda a composição para reutilizar depois.
  const [saveTemplateOnExport, setSaveTemplateOnExport] = useState(false);

  const exportMenuItems: ContextMenuItem[] = EXPORT_OPTIONS.map((option) => ({
    type: "action",
    label: option.label,
    badgeLabel: option.enabled ? undefined : "Em breve",
    disabled: !option.enabled,
    onClick: () => {
      onTakePhoto({
        width: option.width,
        height: option.height,
        includeBackground: exportWithBg,
      });

      if (saveTemplateOnExport) {
        onSaveTemplate?.();
      }
    },
    trailingIcon: option.enabled ? <Download size={14} /> : undefined,
  }));

  const exportHeader = (
    <div className="export-bg-toggle">
      <span className="export-bg-toggle-label">{copy.exportBackgroundLabel}</span>
      <div
        className="export-bg-seg"
        role="radiogroup"
        aria-label={copy.exportBackgroundLabel}
      >
        <button
          type="button"
          role="radio"
          aria-checked={!exportWithBg}
          className={`export-bg-seg-btn${!exportWithBg ? " is-active" : ""}`}
          onClick={() => chooseExportBg(false)}
        >
          <span className="export-swatch export-swatch-transparent" />
          <span className="export-bg-seg-label">{copy.exportTransparent}</span>
          {!exportWithBg ? <Check size={13} className="export-bg-seg-check" /> : null}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={exportWithBg}
          className={`export-bg-seg-btn${exportWithBg ? " is-active" : ""}`}
          onClick={() => chooseExportBg(true)}
        >
          <span
            className="export-swatch"
            style={{ background: displayColor, border: circleBorder }}
          />
          <span className="export-bg-seg-label">{copy.exportWithBackground}</span>
          {exportWithBg ? <Check size={13} className="export-bg-seg-check" /> : null}
        </button>
      </div>

      <div className="export-template-block">
        <span className="export-bg-toggle-label">
          {copy.exportTemplateLabel}
        </span>
        <button
          type="button"
          role="checkbox"
          aria-checked={saveTemplateOnExport}
          className={`export-bg-seg-btn${saveTemplateOnExport ? " is-active" : ""}`}
          onClick={() => setSaveTemplateOnExport((current) => !current)}
        >
          <Bookmark size={14} className="export-template-icon" />
          <span className="export-bg-seg-label">{copy.saveAsTemplate}</span>
          {saveTemplateOnExport ? (
            <Check size={13} className="export-bg-seg-check" />
          ) : null}
        </button>
      </div>
    </div>
  );

  const hideUiLabel = isUiHidden ? copy.showUiButton : copy.hideUiButton;

  const [corner, setCorner] = useState<Corner>(() => {
    if (typeof window === "undefined") return "bottom-right";
    const stored = window.localStorage.getItem(HIDE_UI_CORNER_KEY);
    return isCorner(stored) ? stored : "bottom-right";
  });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  // Ao esconder a interface o olho troca de elemento: sai do botão da toolbar
  // e nasce no fab do canto. Guardamos a posição de origem no clique e animamos
  // dela até a nova (FLIP), senão o botão "salta" de um canto ao outro.
  const toolbarEyeRef = useRef<HTMLButtonElement>(null);
  const cornerEyeRef = useRef<HTMLButtonElement>(null);
  const toggleOriginRef = useRef<DOMRect | null>(null);

  function toggleUiHidden() {
    const source = isUiHidden ? cornerEyeRef.current : toolbarEyeRef.current;
    toggleOriginRef.current = source?.getBoundingClientRect() ?? null;
    onToggleUiHidden();
  }

  useLayoutEffect(() => {
    const origin = toggleOriginRef.current;
    toggleOriginRef.current = null;

    if (!origin) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const target = isUiHidden ? cornerEyeRef.current : toolbarEyeRef.current;

    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const dx = origin.left - rect.left;
    const dy = origin.top - rect.top;

    if (dx === 0 && dy === 0) {
      return;
    }

    const animation = target.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    );

    return () => {
      animation.cancel();
    };
  }, [isUiHidden]);

  function handleHideUiPointerDown(event: PointerEvent<HTMLButtonElement>) {
    // Se o fab ainda está voando para o canto, o arrasto assume o controle.
    event.currentTarget.getAnimations().forEach((animation) => animation.cancel());
    dragStart.current = { x: event.clientX, y: event.clientY };
    didDrag.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleHideUiPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragStart.current) return;

    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;

    if (!didDrag.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      didDrag.current = true;
    }

    if (didDrag.current) {
      setDragPos({ x: event.clientX, y: event.clientY });
    }
  }

  function handleHideUiPointerUp(event: PointerEvent<HTMLButtonElement>) {
    if (didDrag.current) {
      const nextCorner = nearestCorner(event.clientX, event.clientY);
      setCorner(nextCorner);
      window.localStorage.setItem(HIDE_UI_CORNER_KEY, nextCorner);
    }

    dragStart.current = null;
    setDragPos(null);
  }

  function handleHideUiClick() {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    toggleUiHidden();
  }

  return (
    <>
      {!isUiHidden && (
      <div className="canvas-floating-toolbar">
      <div className="canvas-floating-cluster">
        <button
          ref={toolbarEyeRef}
          type="button"
          className="editor-fab"
          role="switch"
          aria-checked={isUiHidden}
          aria-label={hideUiLabel}
          title={hideUiLabel}
          onClick={toggleUiHidden}
        >
          <EyeOff size={16} />
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
          headerContent={exportHeader}
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
      )}

      {isUiHidden && (
        <button
          ref={cornerEyeRef}
          type="button"
          className={`editor-fab canvas-hide-ui-fab corner-${corner}${
            dragPos ? " is-dragging" : ""
          }`}
          style={dragPos ? { left: dragPos.x, top: dragPos.y } : undefined}
          role="switch"
          aria-checked={isUiHidden}
          aria-label={hideUiLabel}
          title={hideUiLabel}
          onPointerDown={handleHideUiPointerDown}
          onPointerMove={handleHideUiPointerMove}
          onPointerUp={handleHideUiPointerUp}
          onClick={handleHideUiClick}
        >
          <Eye size={16} />
        </button>
      )}
    </>
  );
}
