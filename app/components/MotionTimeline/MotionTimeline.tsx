"use client";

import "./MotionTimeline.css";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Check, Diamond, Play, Square, Video } from "lucide-react";
import BezierEditor from "./BezierEditor";
import MotionFrameControl from "./MotionFrameControl";
import TimelineMenu from "./TimelineMenu";
import type { AppCopy, Locale } from "../../lib/i18n";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  getActiveScreenVideo,
  type SceneObject,
} from "../../lib/scene-objects";
import {
  DEFAULT_BEZIER,
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
  /** Tamanho do vídeo: configuração da cena do Movimento, não de um objeto. */
  frame: MotionFrame;
  isPlaying: boolean;
  locale: Locale;
  objects: SceneObject[];
  /** Cria um keyframe no playhead; se já houver um ali, remove. */
  onToggleKeyframeAtPlayhead: (objectId: string) => void;
  onChangeFrame: (frame: MotionFrame) => void;
  onChangeKeyframes: (objectId: string, keyframes: Keyframe[]) => void;
  onChangeVideoStart: (objectId: string, startMs: number) => void;
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
      kind: "video";
      moved: boolean;
      objectId: string;
      startMs: number;
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
      /** "bezier" é o editor de curva, aberto a partir do menu de transição. */
      kind: "easing" | "bezier";
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
  frame,
  isPlaying,
  locale,
  objects,
  onChangeFrame,
  onChangeKeyframes,
  onChangeVideoStart,
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
  // Guarda de qual play veio o valor: sem isso, o primeiro quadro de um novo
  // play mostraria o instante em que o anterior terminou.
  const [livePlayhead, setLivePlayhead] = useState({ ms: 0, startedAt: 0 });

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
      setLivePlayhead({
        ms: Date.now() - playbackStartedAt,
        startedAt: playbackStartedAt,
      });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [playbackStartedAt]);

  const displayedPlayheadMs =
    isPlaying && livePlayhead.startedAt === playbackStartedAt
      ? Math.min(livePlayhead.ms, sceneDurationMs)
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

    if (drag.kind === "video") {
      onChangeVideoStart(drag.objectId, Math.max(0, snap(drag.startMs + deltaMs)));
      return;
    }

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
    if (!menuObject || !menuKeyframe || !menu) {
      return;
    }

    if (easing !== "cubic-bezier") {
      onChangeKeyframes(
        menuObject.id,
        updateKeyframe(menuObject.keyframes, menuKeyframe.id, { easing }),
      );
      setMenu(null);
      return;
    }

    // A curva não se escolhe num clique: troca o menu pelo editor, no mesmo
    // lugar, partindo da curva que o trecho já tinha ou do padrão.
    onChangeKeyframes(
      menuObject.id,
      updateKeyframe(menuObject.keyframes, menuKeyframe.id, {
        bezier: menuKeyframe.bezier ?? [...DEFAULT_BEZIER],
        easing,
      }),
    );
    setMenu({ ...menu, kind: "bezier" });
  }

  /**
   * Trilha do vídeo da tela, logo abaixo da trilha de keyframes do objeto —
   * como um clipe num editor de vídeo. Arrastar o clipe muda o instante em que
   * a gravação começa na cena.
   */
  function renderVideoLane(object: SceneObject) {
    const video = getActiveScreenVideo(object);

    if (!video) {
      return null;
    }

    return (
      <div
        className={`motion-timeline-lane motion-timeline-lane-video${
          object.id === selectedObjectId ? " is-active" : ""
        }`}
      >
        <div
          className="motion-timeline-clip"
          title={`${video.name} · ${formatSeconds(video.durationMs)}`}
          style={{
            left: toPercent(video.startMs),
            width: toPercent(video.durationMs),
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) {
              return;
            }

            onSelectObject(object.id);
            beginDrag(event, {
              kind: "video",
              moved: false,
              objectId: object.id,
              startMs: video.startMs,
              startX: event.clientX,
            });
          }}
          onPointerMove={handleDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <Video size={11} aria-hidden />
          <span className="motion-timeline-clip-name">{video.name}</span>
        </div>
      </div>
    );
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
        <MotionFrameControl
          copy={copy}
          frame={frame}
          locale={locale}
          onChange={onChangeFrame}
        />
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

              const label = (
                <div
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

              return getActiveScreenVideo(object) ? (
                <Fragment key={object.id}>
                  {label}
                  <div
                    className={`motion-timeline-label motion-timeline-label-video${
                      object.id === selectedObjectId ? " is-active" : ""
                    }`}
                  >
                    <Video size={11} aria-hidden />
                    <span>{copy.screenSourceVideo}</span>
                  </div>
                </Fragment>
              ) : (
                <Fragment key={object.id}>{label}</Fragment>
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
              <Fragment key={object.id}>
              <div
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
              {renderVideoLane(object)}
              </Fragment>
            ))}

            <div
              className="motion-timeline-playhead"
              style={{ left: toPercent(displayedPlayheadMs) }}
            />
          </div>
        </div>
      )}

      {menu && menuKeyframe ? (
        <TimelineMenu
          className={menu.kind === "bezier" ? "is-bezier" : undefined}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        >
          {menu.kind === "bezier" && menuObject ? (
            <BezierEditor
              copy={copy}
              value={menuKeyframe.bezier ?? DEFAULT_BEZIER}
              onChange={(bezier) =>
                onChangeKeyframes(
                  menuObject.id,
                  updateKeyframe(menuObject.keyframes, menuKeyframe.id, {
                    bezier,
                  }),
                )
              }
              onDone={() => setMenu(null)}
            />
          ) : menu.kind === "easing" ? (
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
                    {`${copy.motionEasingLabels[easing] ?? easing}${
                      easing === "cubic-bezier" ? "…" : ""
                    }`}
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
