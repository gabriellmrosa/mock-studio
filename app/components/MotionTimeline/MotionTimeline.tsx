"use client";

import "./MotionTimeline.css";
import "../ContextMenu/ContextMenu.css";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, Diamond, Play, Square } from "lucide-react";
import type { AppCopy } from "../../lib/i18n";
import type { SceneObject } from "../../lib/scene-objects";
import {
  EASING_IDS,
  findKeyframeAt,
  moveKeyframeTo,
  shiftKeyframes,
  updateKeyframe,
  type EasingId,
  type Keyframe,
} from "../../lib/scene-motion";

/** Eixo mínimo: uma cena sem motion ainda precisa de espaço para o playhead. */
const MIN_AXIS_MS = 5000;
/** Folga depois do último keyframe, para dar onde criar o próximo. */
const AXIS_TAIL_MS = 1000;
/** Arrastos andam em passos de 50ms: números redondos sem travar o gesto. */
const DRAG_STEP_MS = 50;
/** Abaixo disto um pointerdown+up num keyframe é clique, não arrasto. */
const DRAG_THRESHOLD_PX = 3;

type MotionTimelineProps = {
  copy: AppCopy;
  isPlaying: boolean;
  objects: SceneObject[];
  /** Cria um keyframe no playhead; se já houver um ali, remove. */
  onToggleKeyframeAtPlayhead: (objectId: string) => void;
  onChangeKeyframes: (objectId: string, keyframes: Keyframe[]) => void;
  onRemoveKeyframe: (objectId: string, keyframeId: string) => void;
  onScrub: (timeMs: number) => void;
  onSelectKeyframe: (objectId: string, keyframeId: string) => void;
  onSelectObject: (objectId: string) => void;
  onTogglePlayback: () => void;
  /** Instante (em Date.now) equivalente ao tempo zero do playback em curso. */
  playbackStartedAt: number | null;
  playheadMs: number;
  sceneDurationMs: number;
  selectedKeyframeId: string;
  selectedObjectId: string;
};

type DragState =
  | { kind: "scrub" }
  | {
      kind: "track";
      moved: boolean;
      objectId: string;
      startKeyframes: Keyframe[];
      startX: number;
    }
  | {
      keyframeId: string;
      kind: "keyframe";
      moved: boolean;
      objectId: string;
      startKeyframes: Keyframe[];
      startTimeMs: number;
      startX: number;
    };

type MenuState =
  | {
      kind: "easing";
      keyframeId: string;
      objectId: string;
      x: number;
      y: number;
    }
  | {
      kind: "keyframe";
      keyframeId: string;
      objectId: string;
      x: number;
      y: number;
    };

function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function snap(ms: number) {
  return Math.round(ms / DRAG_STEP_MS) * DRAG_STEP_MS;
}

export default function MotionTimeline({
  copy,
  isPlaying,
  objects,
  onChangeKeyframes,
  onRemoveKeyframe,
  onScrub,
  onSelectKeyframe,
  onSelectObject,
  onToggleKeyframeAtPlayhead,
  onTogglePlayback,
  playbackStartedAt,
  playheadMs,
  sceneDurationMs,
  selectedKeyframeId,
  selectedObjectId,
}: MotionTimelineProps) {
  const lanesRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // O eixo cresce com a cena, mas congela durante um arrasto: se ele mudasse
  // de escala no meio do gesto, o keyframe fugiria do cursor.
  const [frozenAxisMs, setFrozenAxisMs] = useState<number | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [livePlayheadMs, setLivePlayheadMs] = useState(0);

  const axisMs =
    frozenAxisMs ??
    Math.max(
      MIN_AXIS_MS,
      Math.ceil((sceneDurationMs + AXIS_TAIL_MS) / 1000) * 1000,
    );

  // Durante o playback o playhead anda sozinho; é estado local para não
  // re-renderizar a página inteira a cada quadro.
  useEffect(() => {
    if (playbackStartedAt === null) {
      return;
    }

    let frame = 0;

    const tick = () => {
      setLivePlayheadMs(Date.now() - playbackStartedAt);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [playbackStartedAt]);

  const displayedPlayheadMs = isPlaying
    ? Math.min(livePlayheadMs, sceneDurationMs)
    : playheadMs;

  const toPercent = (timeMs: number) => `${(timeMs / axisMs) * 100}%`;

  function timeFromClientX(clientX: number) {
    const rect = lanesRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0) {
      return 0;
    }

    const ratio = (clientX - rect.left) / rect.width;

    return Math.min(axisMs, Math.max(0, ratio * axisMs));
  }

  function msFromDeltaX(deltaX: number) {
    const width = lanesRef.current?.getBoundingClientRect().width ?? 1;

    return (deltaX / width) * axisMs;
  }

  function beginDrag(event: ReactPointerEvent<HTMLElement>, state: DragState) {
    // Só o botão principal arrasta; o direito abre os menus.
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = state;
    setFrozenAxisMs(axisMs);

    if (state.kind === "scrub") {
      onScrub(snap(timeFromClientX(event.clientX)));
    }
  }

  function handleDragMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    if (drag.kind === "scrub") {
      onScrub(snap(timeFromClientX(event.clientX)));
      return;
    }

    const deltaX = event.clientX - drag.startX;

    if (!drag.moved && Math.abs(deltaX) < DRAG_THRESHOLD_PX) {
      return;
    }

    drag.moved = true;

    const deltaMs = msFromDeltaX(deltaX);

    if (drag.kind === "track") {
      onChangeKeyframes(
        drag.objectId,
        shiftKeyframes(drag.startKeyframes, snap(deltaMs)),
      );
      return;
    }

    onChangeKeyframes(
      drag.objectId,
      moveKeyframeTo(
        drag.startKeyframes,
        drag.keyframeId,
        Math.min(axisMs, snap(drag.startTimeMs + deltaMs)),
      ),
    );
  }

  function endDrag() {
    dragRef.current = null;
    setFrozenAxisMs(null);
  }

  function openMenu(
    event: ReactMouseEvent<HTMLElement>,
    state: Omit<MenuState, "x" | "y">,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ ...state, x: event.clientX, y: event.clientY } as MenuState);
  }

  const menuObject = menu
    ? objects.find((object) => object.id === menu.objectId)
    : undefined;
  const menuKeyframe = menuObject?.keyframes.find(
    (keyframe) => keyframe.id === menu?.keyframeId,
  );

  function setEasing(easing: EasingId) {
    if (menuObject && menuKeyframe) {
      onChangeKeyframes(
        menuObject.id,
        updateKeyframe(menuObject.keyframes, menuKeyframe.id, { easing }),
      );
    }

    setMenu(null);
  }

  return (
    <section className="motion-timeline" aria-label={copy.motionTimeline}>
      <header className="motion-timeline-header">
        <button
          type="button"
          className="editor-fab"
          aria-label={isPlaying ? copy.motionStop : copy.motionPlay}
          title={isPlaying ? copy.motionStop : copy.motionPlay}
          onClick={onTogglePlayback}
        >
          {isPlaying ? <Square size={14} /> : <Play size={14} />}
        </button>
        <span className="motion-timeline-clock">
          {`${formatSeconds(displayedPlayheadMs)} / ${formatSeconds(sceneDurationMs)}`}
        </span>
      </header>

      {objects.length === 0 ? (
        <p className="editor-sidebar-muted motion-timeline-empty">
          {copy.motionTimelineEmpty}
        </p>
      ) : (
        <div className="motion-timeline-body">
          <div className="motion-timeline-labels">
            <span className="motion-timeline-ruler-spacer" />
            {objects.map((object) => {
              const atPlayhead = findKeyframeAt(object.keyframes, playheadMs);
              const toggleLabel = atPlayhead
                ? copy.motionRemoveKeyframe
                : copy.motionAddKeyframe;

              return (
                <div
                  key={object.id}
                  className={`motion-timeline-label${
                    object.id === selectedObjectId ? " is-active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="motion-timeline-label-name"
                    title={object.name}
                    onClick={() => onSelectObject(object.id)}
                  >
                    {object.name}
                  </button>
                  <button
                    type="button"
                    className={`motion-timeline-add${
                      atPlayhead ? " is-on-keyframe" : ""
                    }`}
                    aria-label={`${toggleLabel} · ${object.name}`}
                    title={toggleLabel}
                    disabled={isPlaying}
                    onClick={() => onToggleKeyframeAtPlayhead(object.id)}
                  >
                    <Diamond size={11} />
                  </button>
                </div>
              );
            })}
          </div>

          <div
            className="motion-timeline-lanes"
            ref={lanesRef}
            onPointerDown={(event) => beginDrag(event, { kind: "scrub" })}
            onPointerMove={handleDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="motion-timeline-ruler" aria-hidden>
              {Array.from(
                { length: Math.floor(axisMs / 1000) + 1 },
                (_, second) => (
                  <span
                    key={second}
                    className="motion-timeline-tick"
                    style={{ left: toPercent(second * 1000) }}
                  >
                    {`${second}s`}
                  </span>
                ),
              )}
            </div>

            {objects.map((object) => (
              <div
                key={object.id}
                className={`motion-timeline-lane${
                  object.id === selectedObjectId ? " is-active" : ""
                }`}
              >
                {object.keyframes.slice(1).map((keyframe, offset) => {
                  const previous = object.keyframes[offset];

                  return (
                    <div
                      key={keyframe.id}
                      className="motion-timeline-segment"
                      title={copy.motionEasing}
                      style={{
                        left: toPercent(previous.timeMs),
                        width: toPercent(keyframe.timeMs - previous.timeMs),
                      }}
                      onPointerDown={(event) =>
                        beginDrag(event, {
                          kind: "track",
                          moved: false,
                          objectId: object.id,
                          startKeyframes: object.keyframes,
                          startX: event.clientX,
                        })
                      }
                      onPointerMove={handleDragMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onContextMenu={(event) =>
                        openMenu(event, {
                          kind: "easing",
                          keyframeId: keyframe.id,
                          objectId: object.id,
                        })
                      }
                    >
                      <span className="motion-timeline-segment-label">
                        {copy.motionEasingLabels[keyframe.easing] ??
                          keyframe.easing}
                      </span>
                    </div>
                  );
                })}

                {object.keyframes.map((keyframe) => {
                  const isSelected = keyframe.id === selectedKeyframeId;
                  const label = `${copy.motionKeyframeLabel} ${formatSeconds(
                    keyframe.timeMs,
                  )}`;

                  return (
                    <button
                      key={keyframe.id}
                      type="button"
                      className={`motion-timeline-marker${
                        isSelected ? " is-active" : ""
                      }`}
                      style={{ left: toPercent(keyframe.timeMs) }}
                      aria-label={`${label} · ${object.name}`}
                      aria-pressed={isSelected}
                      title={label}
                      onPointerDown={(event) => {
                        if (event.button !== 0) {
                          return;
                        }

                        onSelectKeyframe(object.id, keyframe.id);
                        beginDrag(event, {
                          keyframeId: keyframe.id,
                          kind: "keyframe",
                          moved: false,
                          objectId: object.id,
                          startKeyframes: object.keyframes,
                          startTimeMs: keyframe.timeMs,
                          startX: event.clientX,
                        });
                      }}
                      onPointerMove={handleDragMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Delete" ||
                          event.key === "Backspace"
                        ) {
                          event.preventDefault();
                          onRemoveKeyframe(object.id, keyframe.id);
                        }
                      }}
                      onContextMenu={(event) => {
                        onSelectKeyframe(object.id, keyframe.id);
                        openMenu(event, {
                          kind: "keyframe",
                          keyframeId: keyframe.id,
                          objectId: object.id,
                        });
                      }}
                    />
                  );
                })}
              </div>
            ))}

            <div
              className="motion-timeline-playhead"
              style={{ left: toPercent(displayedPlayheadMs) }}
            />
          </div>
        </div>
      )}

      {menu && menuKeyframe ? (
        <TimelineMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          {menu.kind === "easing" ? (
            <>
              <p className="context-menu-header motion-timeline-menu-title">
                {copy.motionEasing}
              </p>
              {EASING_IDS.map((easing) => (
                <button
                  key={easing}
                  type="button"
                  role="menuitemradio"
                  aria-checked={menuKeyframe.easing === easing}
                  className="context-menu-row"
                  onClick={() => setEasing(easing)}
                >
                  <span className="context-menu-row-label">
                    {copy.motionEasingLabels[easing] ?? easing}
                  </span>
                  {menuKeyframe.easing === easing ? (
                    <Check size={12} className="context-menu-check" />
                  ) : null}
                </button>
              ))}
            </>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="context-menu-row context-menu-row-danger"
              onClick={() => {
                onRemoveKeyframe(menu.objectId, menu.keyframeId);
                setMenu(null);
              }}
            >
              <span className="context-menu-row-label">
                {copy.motionRemoveKeyframe}
              </span>
            </button>
          )}
        </TimelineMenu>
      ) : null}
    </section>
  );
}

/**
 * Menu de botão direito ancorado no cursor. O ContextMenu do projeto abre a
 * partir de um botão gatilho; aqui não há gatilho, então só reaproveitamos o
 * visual dele.
 */
function TimelineMenu({
  children,
  onClose,
  x,
  y,
}: {
  children: ReactNode;
  onClose: () => void;
  x: number;
  y: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // A timeline fica no rodapé: o menu costuma não caber abaixo do cursor.
  // Ajuste direto no DOM, antes da pintura, para não abrir e depois pular.
  useLayoutEffect(() => {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const rect = panel.getBoundingClientRect();

    panel.style.left = `${Math.min(x, window.innerWidth - rect.width - 8)}px`;
    panel.style.top = `${
      y + rect.height > window.innerHeight - 8 ? y - rect.height : y
    }px`;
  }, [x, y]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", onClose);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      className="context-menu-panel"
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}
