"use client";

import "./FloatingCanvasControls.css";
import {
  useCallback,
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
  Camera,
  Eye,
  EyeOff,
  ScanSearch,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Tooltip } from "../EditorPrimitives/EditorPrimitives";
import ExportDialog, { type ExportKind } from "./ExportDialog";
import type { Locale } from "../../lib/i18n";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  DEFAULT_VIDEO_EXPORT_SETTINGS,
  type VideoExportSettings,
} from "../../lib/video-export";

type FloatingCanvasControlsProps = {
  bgColor: string | null;
  copy: AppCopy;
  isUiHidden: boolean;
  onBgColorChange: (color: string) => void;
  locale: Locale;
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
  /** Só no Movimento: liga a exportação de vídeo no dialog Exportar. */
  video?: {
    durationMs: number;
    frame: MotionFrame;
    onExport: (settings: VideoExportSettings) => void;
  };
};

const EXPORT_OPTIONS = [
  { badge: "Full HD", id: "full-hd", width: 1920, height: 1080 },
  { badge: "QHD", id: "quad-hd", width: 2560, height: 1440 },
  { badge: "4K", id: "ultra-hd", width: 3840, height: 2160 },
] as const;

const DEFAULT_BG: Record<UiTheme, string> = {
  dark: "#2e2b28",
  light: "#f2ebe0",
};

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const HIDE_UI_CORNER_KEY = "mock-photo-hide-ui-corner";
const EXPORT_BG_KEY = "mock-photo-export-bg";
const EXPORT_TEMPLATE_KEY = "mock-photo-export-template";
const EXPORT_SIZE_KEY = "mock-photo-export-size";
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
  locale,
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
  video,
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
  // o arquivo gerado, só guarda a composição para reutilizar depois. Vem
  // marcado, e a escolha fica lembrada como a do fundo.
  const [saveTemplateOnExport, setSaveTemplateOnExport] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return true;
      return window.localStorage.getItem(EXPORT_TEMPLATE_KEY) !== "0";
    },
  );

  function chooseSaveTemplate(value: boolean) {
    setSaveTemplateOnExport(value);
    window.localStorage.setItem(EXPORT_TEMPLATE_KEY, value ? "1" : "0");
  }

  // O tamanho da imagem também fica lembrado: quem exporta em 4K costuma
  // exportar sempre em 4K.
  const [photoSizeId, setPhotoSizeId] = useState<string>(() => {
    if (typeof window === "undefined") return EXPORT_OPTIONS[0].id;
    const stored = window.localStorage.getItem(EXPORT_SIZE_KEY);
    return EXPORT_OPTIONS.some((option) => option.id === stored)
      ? stored!
      : EXPORT_OPTIONS[0].id;
  });

  function choosePhotoSize(id: string) {
    setPhotoSizeId(id);
    window.localStorage.setItem(EXPORT_SIZE_KEY, id);
  }

  // As escolhas vivem aqui, e não no dialog: ele é desmontado ao fechar e
  // reabriria sempre do zero.
  const [isExportOpen, setIsExportOpen] = useState(false);
  // No Movimento o que se exporta é, antes de tudo, o vídeo: o Formato abre
  // nele. Uma troca para Imagem vale até sair do Movimento — ao voltar, o
  // padrão é o vídeo de novo.
  const isMotion = Boolean(video);
  const [exportKind, setExportKind] = useState<ExportKind>(
    isMotion ? "video" : "image",
  );
  const [exportKindMode, setExportKindMode] = useState(isMotion);

  if (exportKindMode !== isMotion) {
    setExportKindMode(isMotion);
    setExportKind(isMotion ? "video" : "image");
  }
  const [videoSettings, setVideoSettings] = useState(DEFAULT_VIDEO_EXPORT_SETTINGS);

  // Estável: o Dialog reassina o Esc quando o callback muda.
  const closeExport = useCallback(() => setIsExportOpen(false), []);

  /** Exporta o que foi escolhido no dialog, como foi escolhido. */
  function handleExport() {
    if (video && exportKind === "video") {
      video.onExport(videoSettings);
    } else {
      const size =
        EXPORT_OPTIONS.find((option) => option.id === photoSizeId) ??
        EXPORT_OPTIONS[0];

      onTakePhoto({
        height: size.height,
        includeBackground: exportWithBg,
        width: size.width,
      });
    }

    if (saveTemplateOnExport) {
      onSaveTemplate?.();
    }

    setIsExportOpen(false);
  }

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
          className="editor-fab editor-tooltip-trigger"
          role="switch"
          aria-checked={isUiHidden}
          aria-label={hideUiLabel}
          onClick={toggleUiHidden}
        >
          <EyeOff size={16} />
          <Tooltip label={hideUiLabel} />
        </button>
        <button
          type="button"
          className="editor-fab editor-tooltip-trigger"
          aria-label={copy.fitSceneButton}
          onClick={onFitToScene}
        >
          <ScanSearch size={16} />
          <Tooltip label={copy.fitSceneButton} />
        </button>
        <button
          type="button"
          className="editor-fab editor-tooltip-trigger"
          aria-label={copy.moveUpButton}
          onClick={onPanUp}
        >
          <ArrowUp size={16} />
          <Tooltip label={copy.moveUpButton} />
        </button>
        <button
          type="button"
          className="editor-fab editor-tooltip-trigger"
          aria-label={copy.moveDownButton}
          onClick={onPanDown}
        >
          <ArrowDown size={16} />
          <Tooltip label={copy.moveDownButton} />
        </button>
        <button
          type="button"
          className="editor-fab editor-tooltip-trigger"
          aria-label={copy.moveLeftButton}
          onClick={onPanLeft}
        >
          <ArrowLeft size={16} />
          <Tooltip label={copy.moveLeftButton} />
        </button>
        <button
          type="button"
          className="editor-fab editor-tooltip-trigger"
          aria-label={copy.moveRightButton}
          onClick={onPanRight}
        >
          <ArrowRight size={16} />
          <Tooltip label={copy.moveRightButton} />
        </button>
        <button
          type="button"
          className="editor-fab editor-tooltip-trigger"
          aria-label={copy.zoomOutButton}
          onClick={onZoomOut}
        >
          <ZoomOut size={16} />
          <Tooltip label={copy.zoomOutButton} />
        </button>
        <button
          type="button"
          className="editor-fab editor-tooltip-trigger"
          aria-label={copy.zoomInButton}
          onClick={onZoomIn}
        >
          <ZoomIn size={16} />
          <Tooltip label={copy.zoomInButton} />
        </button>

        <div className="canvas-color-control">
          <button
            type="button"
            className="editor-fab editor-tooltip-trigger"
            aria-label={copy.backgroundColorButton}
            onClick={() => colorInputRef.current?.click()}
          >
            <div
              className="canvas-color-swatch"
              style={{
                background: displayColor,
                border: circleBorder,
              }}
            />
            <Tooltip label={copy.backgroundColorButton} />
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
          disabled={takePhotoDisabled}
          aria-haspopup="dialog"
          onClick={() => setIsExportOpen(true)}
        >
          <Camera size={16} />
          <span>{copy.takePhotoButton}</span>
        </button>
      </div>
      )}

      <ExportDialog
        backgroundSwatch={{ background: displayColor, border: circleBorder }}
        copy={copy}
        exportWithBg={exportWithBg}
        isOpen={isExportOpen}
        kind={exportKind}
        locale={locale}
        photoOptions={EXPORT_OPTIONS}
        photoSizeId={photoSizeId}
        saveTemplate={saveTemplateOnExport}
        video={
          video
            ? { ...video, onSettingsChange: setVideoSettings, settings: videoSettings }
            : undefined
        }
        onCancel={closeExport}
        onExport={handleExport}
        onExportWithBgChange={chooseExportBg}
        onKindChange={setExportKind}
        onPhotoSizeChange={choosePhotoSize}
        onSaveTemplateChange={chooseSaveTemplate}
      />

      {isUiHidden && (
        <button
          ref={cornerEyeRef}
          type="button"
          className={`editor-fab editor-tooltip-trigger canvas-hide-ui-fab corner-${corner}${
            dragPos ? " is-dragging" : ""
          }`}
          style={dragPos ? { left: dragPos.x, top: dragPos.y } : undefined}
          role="switch"
          aria-checked={isUiHidden}
          aria-label={hideUiLabel}
          onPointerDown={handleHideUiPointerDown}
          onPointerMove={handleHideUiPointerMove}
          onPointerUp={handleHideUiPointerUp}
          onClick={handleHideUiClick}
        >
          <Eye size={16} />
          {/* Num canto de cima não cabe em cima: abre para baixo. */}
          <Tooltip
            label={hideUiLabel}
            side={corner.startsWith("top") ? "bottom" : "top"}
          />
        </button>
      )}
    </>
  );
}
