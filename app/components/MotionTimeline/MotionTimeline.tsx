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
import {
  Check,
  Diamond,
  MoreVertical,
  Music,
  Play,
  Square,
  Video,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import AudioWaveform from "./AudioWaveform";
import BezierEditor from "./BezierEditor";
import MotionFrameControl from "./MotionFrameControl";
import TimelineMenu from "./TimelineMenu";
import { SNAP_DISTANCE_PX, snapDelta } from "../../lib/timeline-snap";
import {
  MAX_TIMELINE_ZOOM,
  MIN_TIMELINE_ZOOM,
  TIMELINE_ZOOM_STEP,
  formatTick,
  getTickStepMs,
  useTimelineZoom,
} from "./useTimelineZoom";
import type { AppCopy, Locale } from "../../lib/i18n";
import type { MotionFrame } from "../../lib/motion-frame";
import {
  getAudioClipDuration,
  getSceneAudios,
  trimAudioClip,
} from "../../lib/audio-objects";
import {
  getActiveScreenVideos,
  getScreenVideoClipDuration,
  isAudioObject,
  isDeviceObject,
  trimVideoClip,
  type ActiveScreenVideo,
  type AudioObject,
  type SceneAudio,
  type SceneObject,
  type ScreenId,
  type ScreenVideo,
  type VideoClipPatch,
} from "../../lib/scene-objects";
import {
  DEFAULT_BEZIER,
  EASING_IDS,
  findKeyframeAt,
  moveKeyframeTo,
  shiftKeyframes,
  shiftSelectedKeyframes,
  copyNeighborPose,
  findNeighborKeyframe,
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
  /** Atualiza keyframes de várias trilhas num único passo (arrasto em grupo). */
  onChangeMultipleKeyframes?: (
    updates: Array<{ keyframes: Keyframe[]; objectId: string }>,
  ) => void;
  /** Move ou corta o clipe da música. */
  onChangeAudio: (objectId: string, patch: Partial<SceneAudio>) => void;
  /** Move ou corta o clipe do vídeo de uma tela do objeto. */
  onChangeVideo: (
    objectId: string,
    screen: ScreenId,
    patch: VideoClipPatch,
  ) => void;
  onRemoveKeyframe: (objectId: string, keyframeId: string) => void;
  /** Remove vários keyframes de uma ou mais trilhas num único passo. */
  onRemoveMultipleKeyframes?: (
    targets: Array<{ keyframeId: string; objectId: string }>,
  ) => void;
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

type MarqueeMarkerBox = {
  bottom: number;
  keyframeId: string;
  left: number;
  objectId: string;
  right: number;
  top: number;
};

type MarqueeRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type DragState =
  | { kind: "scrub" }
  | {
      additive: boolean;
      baseSelection: Set<string>;
      kind: "marquee";
      markerBoxes: MarqueeMarkerBox[];
      moved: boolean;
      startX: number;
      startY: number;
    }
  | {
      anchorKeyframeId: string;
      anchorObjectId: string;
      kind: "keyframes-group";
      minTimeMs: number;
      moved: boolean;
      selectedIds: Set<string>;
      selectedTimes: number[];
      startByObject: Map<string, Keyframe[]>;
      startX: number;
    }
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
      screen: ScreenId;
      startMs: number;
      startX: number;
    }
  | {
      /** Uma borda do clipe: corta o começo ou o fim do vídeo. */
      edge: "start" | "end";
      kind: "video-trim";
      moved: boolean;
      objectId: string;
      screen: ScreenId;
      startX: number;
      video: ScreenVideo;
    }
  | {
      kind: "audio";
      moved: boolean;
      objectId: string;
      startMs: number;
      startX: number;
    }
  | {
      /** Uma borda do clipe da música: corta o começo ou o fim dela. */
      audio: SceneAudio;
      edge: "start" | "end";
      kind: "audio-trim";
      moved: boolean;
      objectId: string;
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
  onChangeAudio,
  onChangeFrame,
  onChangeKeyframes,
  onChangeMultipleKeyframes,
  onChangeVideo,
  onRemoveKeyframe,
  onRemoveMultipleKeyframes,
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
  const timelineRef = useRef<HTMLElement>(null);
  const lanesRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const { axisWidth, reveal, viewportRef, zoom, zoomTo } = useTimelineZoom(
    objects.length > 0,
  );
  // O eixo cresce com a cena, mas congela durante um arrasto: se ele mudasse
  // de escala no meio do gesto, o keyframe fugiria do cursor.
  const [frozenAxisMs, setFrozenAxisMs] = useState<number | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  // Onde o arrasto grudou (ver timeline-snap.ts): a linha-guia vertical.
  const [snapGuideMs, setSnapGuideMs] = useState<number | null>(null);
  // Seleção múltipla de keyframes (marquee ou Shift+clique).
  const [selectedKeyframeIds, setSelectedKeyframeIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Retângulo da caixa de seleção durante um arrasto de marquee.
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  // Guarda de qual play veio o valor: sem isso, o primeiro quadro de um novo
  // play mostraria o instante em que o anterior terminou.
  const [livePlayhead, setLivePlayhead] = useState({ ms: 0, startedAt: 0 });

  // A música não dá duração à cena, mas o eixo vai até o fim dela: um clipe
  // mais longo que a cena tem de caber inteiro para ser cortado.
  const audioEndMs = getSceneAudios(objects).reduce(
    (end, { audio }) => Math.max(end, audio.startMs + getAudioClipDuration(audio)),
    0,
  );
  const axisMs =
    frozenAxisMs ??
    Math.max(
      MIN_AXIS_MS,
      Math.ceil((Math.max(sceneDurationMs, audioEndMs) + AXIS_TAIL_MS) / 1000) *
        1000,
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

  // Régua: o intervalo mais fino que ainda dá para ler na escala atual. Antes
  // de medir a janela, um segundo.
  const tickStepMs =
    axisWidth > 0 ? getTickStepMs((axisWidth * zoom) / axisMs) : 1000;
  const ticks = Array.from(
    { length: Math.floor(axisMs / tickStepMs) + 1 },
    (_, index) => index * tickStepMs,
  );

  // Com zoom, o playhead sairia da tela durante o play: a timeline o segue.
  useEffect(() => {
    if (isPlaying) {
      reveal(displayedPlayheadMs / axisMs);
    }
    // `reveal` lê refs: não precisa re-inscrever o efeito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axisMs, displayedPlayheadMs, isPlaying]);

  /** Zoom dos botões: ancorado no playhead, se ele está à vista. */
  function zoomFromButton(factor: number) {
    const lanes = lanesRef.current?.getBoundingClientRect();
    const viewport = viewportRef.current?.getBoundingClientRect();
    const playheadX = lanes
      ? lanes.left + (displayedPlayheadMs / axisMs) * lanes.width
      : undefined;
    const isVisible =
      playheadX !== undefined &&
      viewport !== undefined &&
      playheadX >= viewport.left &&
      playheadX <= viewport.right;

    zoomTo(zoom * factor, isVisible ? playheadX : undefined);
  }

  function timeFromClientX(clientX: number) {
    const rect = lanesRef.current?.getBoundingClientRect();

    if (!rect || rect.width === 0) {
      return 0;
    }

    const ratio = (clientX - rect.left) / rect.width;

    return Math.min(axisMs, Math.max(0, ratio * axisMs));
  }

  /** O clipe de uma tela, no eixo da cena: onde começa e onde termina. */
  function getClipEdges(objectId: string, screen: ScreenId) {
    const object = objects.find((item) => item.id === objectId);
    const entry = object
      ? getActiveScreenVideos(object).find((item) => item.screen === screen)
      : undefined;

    return entry
      ? [entry.video.startMs, entry.video.startMs + getScreenVideoClipDuration(entry.video)]
      : null;
  }

  /**
   * Onde o arrasto pode grudar: o zero, o playhead, os keyframes de todas as
   * trilhas e as pontas de todos os clipes — menos o que está sendo arrastado.
   */
  function getSnapTargets(skip: {
    audioObjectId?: string;
    clip?: { objectId: string; screen: ScreenId };
    keyframeId?: string;
    keyframeIds?: ReadonlySet<string>;
    playhead?: boolean;
    trackObjectId?: string;
  }) {
    const targets = [0];

    if (!skip.playhead) {
      targets.push(displayedPlayheadMs);
    }

    for (const object of objects) {
      if (object.id !== skip.trackObjectId) {
        for (const keyframe of object.keyframes) {
          if (
            keyframe.id !== skip.keyframeId &&
            !skip.keyframeIds?.has(keyframe.id)
          ) {
            targets.push(keyframe.timeMs);
          }
        }
      }

      for (const entry of getActiveScreenVideos(object)) {
        if (
          skip.clip?.objectId === object.id &&
          skip.clip.screen === entry.screen
        ) {
          continue;
        }

        targets.push(
          entry.video.startMs,
          entry.video.startMs + getScreenVideoClipDuration(entry.video),
        );
      }
    }

    for (const { audio, id } of getSceneAudios(objects)) {
      if (id !== skip.audioObjectId) {
        targets.push(audio.startMs, audio.startMs + getAudioClipDuration(audio));
      }
    }

    return targets;
  }

  /**
   * O deslocamento final de um arrasto: grudado num alvo perto (a até
   * `SNAP_DISTANCE_PX` na tela) ou, longe de tudo — ou com o Alt apertado, que
   * desliga o ímã —, o passo de sempre.
   */
  function snapDrag(
    event: ReactPointerEvent<HTMLElement>,
    edgesMs: number[],
    rawDeltaMs: number,
    targetsMs: number[],
    fallback: (rawDeltaMs: number) => number,
  ) {
    const result = event.altKey
      ? { deltaMs: fallback(rawDeltaMs), guideMs: null }
      : snapDelta({
          edgesMs,
          fallback,
          rawDeltaMs,
          targetsMs,
          thresholdMs: msFromDeltaX(SNAP_DISTANCE_PX),
        });

    setSnapGuideMs(result.guideMs);

    return result.deltaMs;
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
      scrubTo(event);
    }
  }

  // O playhead também gruda nos keyframes e nas pontas dos clipes.
  function scrubTo(event: ReactPointerEvent<HTMLElement>) {
    const time = timeFromClientX(event.clientX);

    onScrub(
      time +
        snapDrag(event, [time], 0, getSnapTargets({ playhead: true }), (delta) =>
          snap(time + delta) - time,
        ),
    );
  }

  /**
   * Conjunto efetivo de keyframes selecionados (apenas os que ainda existem na
   * cena): combina a seleção múltipla com o `selectedKeyframeId` único.
   */
  function getEffectiveSelectedIds() {
    const existing = new Set<string>();
    for (const object of objects) {
      for (const keyframe of object.keyframes) {
        existing.add(keyframe.id);
      }
    }

    const result = new Set<string>();
    for (const id of selectedKeyframeIds) {
      if (existing.has(id)) {
        result.add(id);
      }
    }
    if (selectedKeyframeId && existing.has(selectedKeyframeId)) {
      result.add(selectedKeyframeId);
    }
    return result;
  }

  function applyMultipleKeyframes(
    updates: Array<{ keyframes: Keyframe[]; objectId: string }>,
  ) {
    if (onChangeMultipleKeyframes) {
      onChangeMultipleKeyframes(updates);
      return;
    }

    for (const { keyframes, objectId } of updates) {
      onChangeKeyframes(objectId, keyframes);
    }
  }

  function removeSelectedKeyframes(ids: ReadonlySet<string>) {
    const targets: Array<{ keyframeId: string; objectId: string }> = [];
    for (const object of objects) {
      for (const keyframe of object.keyframes) {
        if (ids.has(keyframe.id)) {
          targets.push({ keyframeId: keyframe.id, objectId: object.id });
        }
      }
    }

    if (targets.length === 0) {
      return;
    }

    if (onRemoveMultipleKeyframes) {
      onRemoveMultipleKeyframes(targets);
    } else {
      for (const { keyframeId, objectId } of targets) {
        onRemoveKeyframe(objectId, keyframeId);
      }
    }

    setSelectedKeyframeIds(new Set());
  }

  function beginMarquee(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    // Não rouba cliques de botões, inputs, régua, clipes, segmentos ou
    // keyframes — qualquer outro espaço livre da timeline (inclusive a faixa
    // do cabeçalho fora dos botões) inicia o marquee.
    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        "button, input, textarea, .motion-timeline-ruler, .motion-timeline-clip, .motion-timeline-segment, .motion-timeline-marker",
      )
    ) {
      return;
    }

    const lanes = lanesRef.current;
    const markerBoxes: MarqueeMarkerBox[] = [];

    // Cacheia os rects dos marcadores uma única vez no pointerDown para evitar
    // reflows a cada pointerMove durante a seleção.
    if (lanes) {
      const nodes = lanes.querySelectorAll<HTMLElement>(
        ".motion-timeline-marker[data-keyframe-id]",
      );
      for (const node of nodes) {
        const keyframeId = node.dataset.keyframeId;
        const objectId = node.dataset.objectId;
        if (!keyframeId || !objectId) continue;
        const rect = node.getBoundingClientRect();
        markerBoxes.push({
          bottom: rect.bottom,
          keyframeId,
          left: rect.left,
          objectId,
          right: rect.right,
          top: rect.top,
        });
      }
    }

    beginDrag(event, {
      additive: event.shiftKey,
      baseSelection: event.shiftKey ? getEffectiveSelectedIds() : new Set(),
      kind: "marquee",
      markerBoxes,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function handleDragMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    if (drag.kind === "scrub") {
      scrubTo(event);
      return;
    }

    if (drag.kind === "marquee") {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;

      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        return;
      }

      drag.moved = true;

      const containerRect = timelineRef.current?.getBoundingClientRect();
      if (!containerRect) {
        return;
      }

      const clientLeft = Math.min(drag.startX, event.clientX);
      const clientRight = Math.max(drag.startX, event.clientX);
      const clientTop = Math.min(drag.startY, event.clientY);
      const clientBottom = Math.max(drag.startY, event.clientY);

      const left = Math.max(0, clientLeft - containerRect.left);
      const top = Math.max(0, clientTop - containerRect.top);
      const right = Math.min(containerRect.width, clientRight - containerRect.left);
      const bottom = Math.min(containerRect.height, clientBottom - containerRect.top);

      setMarqueeRect({
        height: Math.max(0, bottom - top),
        left,
        top,
        width: Math.max(0, right - left),
      });

      const nextSelected = new Set(drag.baseSelection);
      for (const box of drag.markerBoxes) {
        const intersects =
          box.right >= clientLeft &&
          box.left <= clientRight &&
          box.bottom >= clientTop &&
          box.top <= clientBottom;
        if (intersects) {
          nextSelected.add(box.keyframeId);
        }
      }

      setSelectedKeyframeIds(nextSelected);
      return;
    }

    const deltaX = event.clientX - drag.startX;

    if (!drag.moved && Math.abs(deltaX) < DRAG_THRESHOLD_PX) {
      return;
    }

    drag.moved = true;

    const deltaMs = msFromDeltaX(deltaX);

    if (drag.kind === "keyframes-group") {
      const snappedDelta = snapDrag(
        event,
        drag.selectedTimes,
        deltaMs,
        getSnapTargets({ keyframeIds: drag.selectedIds }),
        snap,
      );
      // Limita pelo menor instante do grupo inteiro para preservar as distâncias
      // relativas entre todos os keyframes selecionados (inclusive entre trilhas).
      const clampedDelta = Math.max(-drag.minTimeMs, snappedDelta);
      const updates: Array<{ keyframes: Keyframe[]; objectId: string }> = [];

      for (const [objectId, startKeyframes] of drag.startByObject) {
        updates.push({
          keyframes: shiftSelectedKeyframes(
            startKeyframes,
            drag.selectedIds,
            clampedDelta,
          ),
          objectId,
        });
      }

      applyMultipleKeyframes(updates);
      return;
    }

    if (drag.kind === "video") {
      // As duas pontas do clipe procuram onde grudar.
      const edges = getClipEdges(drag.objectId, drag.screen);
      const length = edges ? edges[1] - edges[0] : 0;
      const delta = snapDrag(
        event,
        [drag.startMs, drag.startMs + length],
        deltaMs,
        getSnapTargets({ clip: { objectId: drag.objectId, screen: drag.screen } }),
        (raw) => snap(drag.startMs + raw) - drag.startMs,
      );

      onChangeVideo(drag.objectId, drag.screen, {
        startMs: Math.max(0, Math.round(drag.startMs + delta)),
      });
      return;
    }

    if (drag.kind === "video-trim") {
      // A borda cortada, na posição de antes do arrasto.
      const edge =
        drag.edge === "start"
          ? drag.video.startMs
          : drag.video.startMs + getScreenVideoClipDuration(drag.video);
      const targets = getSnapTargets({
        clip: { objectId: drag.objectId, screen: drag.screen },
      });

      // A borda final também gruda no fim real do arquivo: dá para parar no
      // último quadro, e passar dele (congelar) é uma escolha, não um acidente.
      if (drag.edge === "end") {
        targets.push(
          drag.video.startMs + drag.video.durationMs - (drag.video.trimStartMs ?? 0),
        );
      }

      const delta = snapDrag(event, [edge], deltaMs, targets, snap);

      onChangeVideo(
        drag.objectId,
        drag.screen,
        trimVideoClip(drag.video, drag.edge, Math.round(delta)),
      );
      return;
    }

    if (drag.kind === "audio") {
      // Como o clipe de vídeo: as duas pontas procuram onde grudar.
      const object = objects.find((item) => item.id === drag.objectId);
      const length =
        object && isAudioObject(object) && object.audio
          ? getAudioClipDuration(object.audio)
          : 0;
      const delta = snapDrag(
        event,
        [drag.startMs, drag.startMs + length],
        deltaMs,
        getSnapTargets({ audioObjectId: drag.objectId }),
        (raw) => snap(drag.startMs + raw) - drag.startMs,
      );

      onChangeAudio(drag.objectId, {
        startMs: Math.max(0, Math.round(drag.startMs + delta)),
      });
      return;
    }

    if (drag.kind === "audio-trim") {
      const edge =
        drag.edge === "start"
          ? drag.audio.startMs
          : drag.audio.startMs + getAudioClipDuration(drag.audio);
      const targets = getSnapTargets({ audioObjectId: drag.objectId });
      const delta = snapDrag(event, [edge], deltaMs, targets, snap);

      onChangeAudio(
        drag.objectId,
        trimAudioClip(drag.audio, drag.edge, Math.round(delta)),
      );
      return;
    }

    if (drag.kind === "track") {
      const delta = snapDrag(
        event,
        drag.startKeyframes.map((keyframe) => keyframe.timeMs),
        deltaMs,
        getSnapTargets({ trackObjectId: drag.objectId }),
        snap,
      );

      onChangeKeyframes(drag.objectId, shiftKeyframes(drag.startKeyframes, delta));
      return;
    }

    const delta = snapDrag(
      event,
      [drag.startTimeMs],
      deltaMs,
      getSnapTargets({ keyframeId: drag.keyframeId }),
      (raw) => snap(drag.startTimeMs + raw) - drag.startTimeMs,
    );

    onChangeKeyframes(
      drag.objectId,
      moveKeyframeTo(
        drag.startKeyframes,
        drag.keyframeId,
        Math.min(axisMs, drag.startTimeMs + delta),
      ),
    );
  }

  function endDrag(event?: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setFrozenAxisMs(null);
    setSnapGuideMs(null);
    setMarqueeRect(null);

    if (!drag) {
      return;
    }

    // Clique simples (sem arrastar) no vazio: limpa seleção múltipla e, se o
    // clique caiu na área das trilhas, move o playhead para lá.
    if (drag.kind === "marquee" && !drag.moved && event) {
      if (!drag.additive) {
        setSelectedKeyframeIds(new Set());
      }
      const lanesRect = lanesRef.current?.getBoundingClientRect();
      if (
        lanesRect &&
        event.clientX >= lanesRect.left &&
        event.clientX <= lanesRect.right &&
        event.clientY >= lanesRect.top &&
        event.clientY <= lanesRect.bottom
      ) {
        scrubTo(event);
      }
      return;
    }

    // Clique simples (sem arrastar) num keyframe que estava em seleção múltipla
    // foca apenas nele.
    if (drag.kind === "keyframes-group" && !drag.moved) {
      setSelectedKeyframeIds(new Set());
      onSelectKeyframe(drag.anchorObjectId, drag.anchorKeyframeId);
    }
  }

  function openMenu(
    event: ReactMouseEvent<HTMLElement>,
    state: Omit<MenuState, "x" | "y">,
    // Sem ponto, vale onde o mouse clicou. O botão ⋮ passa o próprio canto,
    // porque ativado pelo teclado o clique não traz posição.
    point: { x: number; y: number } = { x: event.clientX, y: event.clientY },
  ) {
    event.preventDefault();
    event.stopPropagation();
    setMenu({ ...state, ...point } as MenuState);
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
   * Trilha do vídeo de uma tela, logo abaixo da trilha de keyframes do objeto
   * — como um clipe num editor de vídeo. Arrastar o clipe muda o instante em
   * que a gravação começa na cena. Um objeto com duas telas (o dobrável) tem
   * duas trilhas, uma por tela, independentes.
   */
  function renderVideoLane(
    object: SceneObject,
    { key, screen, video }: ActiveScreenVideo,
  ) {
    const clipDuration = getScreenVideoClipDuration(video);

    return (
      <div
        key={key}
        className={`motion-timeline-lane motion-timeline-lane-video${
          object.id === selectedObjectId ? " is-active" : ""
        }`}
      >
        <div
          className="motion-timeline-clip"
          title={`${video.name} · ${formatSeconds(clipDuration)}`}
          style={{
            left: toPercent(video.startMs),
            width: toPercent(clipDuration),
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
              screen,
              startMs: video.startMs,
              startX: event.clientX,
            });
          }}
          onPointerMove={handleDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {(["start", "end"] as const).map((edge) => (
            <span
              key={edge}
              aria-hidden
              className={`motion-timeline-clip-trim is-${edge}`}
              title={
                edge === "start"
                  ? copy.motionVideoTrimStart
                  : copy.motionVideoTrimEnd
              }
              onPointerDown={(event) => {
                if (event.button !== 0) {
                  return;
                }

                onSelectObject(object.id);
                beginDrag(event, {
                  edge,
                  kind: "video-trim",
                  moved: false,
                  objectId: object.id,
                  screen,
                  startX: event.clientX,
                  video,
                });
              }}
              onPointerMove={handleDragMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
          ))}
          {/* O trecho depois do fim do arquivo, em que o último quadro fica
              parado: marcado para não se confundir com o vídeo tocando. */}
          {video.holdEndMs ? (
            <span
              className="motion-timeline-clip-hold"
              data-testid="clip-hold"
              style={{ width: `${(video.holdEndMs / clipDuration) * 100}%` }}
            >
              <span className="motion-timeline-clip-hold-label">
                {copy.motionVideoHold}
              </span>
            </span>
          ) : null}
          <Video size={11} aria-hidden />
          <span className="motion-timeline-clip-name">{video.name}</span>
        </div>
      </div>
    );
  }

  /**
   * A trilha da música: no lugar dos keyframes (ela não anima), o clipe com a
   * forma de onda do trecho que toca. Move e corta como o clipe de vídeo; os
   * fades são rampas nas pontas. Muda, fica apagada.
   */
  function renderAudioLane(object: AudioObject) {
    const { audio } = object;
    const clipDuration = audio ? getAudioClipDuration(audio) : 0;

    return (
      <div
        key={object.id}
        className={`motion-timeline-lane motion-timeline-lane-audio${
          object.id === selectedObjectId ? " is-active" : ""
        }`}
      >
        {/* Voltando de um template sem o arquivo, ainda não há clipe. */}
        {audio ? (
          <div
            className={`motion-timeline-clip motion-timeline-clip-audio${
              object.isVisible ? "" : " is-muted"
            }`}
            title={`${audio.name} · ${formatSeconds(clipDuration)}`}
            style={{
              left: toPercent(audio.startMs),
              width: toPercent(clipDuration),
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }

              onSelectObject(object.id);
              beginDrag(event, {
                kind: "audio",
                moved: false,
                objectId: object.id,
                startMs: audio.startMs,
                startX: event.clientX,
              });
            }}
            onPointerMove={handleDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <AudioWaveform audio={audio} />
            {audio.fadeInMs > 0 || audio.fadeOutMs > 0 ? (
              <svg
                aria-hidden
                className="motion-timeline-clip-fades"
                data-testid="audio-fades"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                {audio.fadeInMs > 0 ? (
                  <polygon
                    points={`0,0 ${(audio.fadeInMs / clipDuration) * 100},0 0,100`}
                  />
                ) : null}
                {audio.fadeOutMs > 0 ? (
                  <polygon
                    points={`100,0 ${100 - (audio.fadeOutMs / clipDuration) * 100},0 100,100`}
                  />
                ) : null}
              </svg>
            ) : null}
            {(["start", "end"] as const).map((edge) => (
              <span
                key={edge}
                aria-hidden
                className={`motion-timeline-clip-trim is-${edge}`}
                title={
                  edge === "start"
                    ? copy.motionMusicTrimStart
                    : copy.motionMusicTrimEnd
                }
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }

                  onSelectObject(object.id);
                  beginDrag(event, {
                    audio,
                    edge,
                    kind: "audio-trim",
                    moved: false,
                    objectId: object.id,
                    startX: event.clientX,
                  });
                }}
                onPointerMove={handleDragMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            ))}
            <Music size={11} aria-hidden />
            <span className="motion-timeline-clip-name">{audio.name}</span>
          </div>
        ) : null}
      </div>
    );
  }

  const effectiveSelectedIds = getEffectiveSelectedIds();

  return (
    <section
      ref={timelineRef}
      className="motion-timeline"
      aria-label={copy.motionTimeline}
      onPointerDown={beginMarquee}
      onPointerMove={handleDragMove}
      onPointerUp={endDrag}
      onPointerCancel={() => endDrag()}
      onKeyDown={(event) => {
        if (event.key !== "Delete" && event.key !== "Backspace") {
          return;
        }
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable)
        ) {
          return;
        }
        if (effectiveSelectedIds.size > 1) {
          event.preventDefault();
          removeSelectedKeyframes(effectiveSelectedIds);
        }
      }}
    >
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
        <div className="motion-timeline-zoom" role="group" aria-label={copy.motionZoomLabel}>
          <button
            type="button"
            className="motion-timeline-zoom-button"
            aria-label={copy.motionZoomOut}
            title={copy.motionZoomOut}
            disabled={zoom <= MIN_TIMELINE_ZOOM}
            onClick={() => zoomFromButton(1 / TIMELINE_ZOOM_STEP)}
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            className="motion-timeline-zoom-button"
            aria-label={copy.motionZoomIn}
            title={copy.motionZoomIn}
            disabled={zoom >= MAX_TIMELINE_ZOOM}
            onClick={() => zoomFromButton(TIMELINE_ZOOM_STEP)}
          >
            <ZoomIn size={13} />
          </button>
        </div>
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
              // A música não tem keyframes: só o nome, com a nota à frente.
              if (isAudioObject(object)) {
                return (
                  <div
                    key={object.id}
                    className={`motion-timeline-label motion-timeline-label-audio${
                      object.id === selectedObjectId ? " is-active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="motion-timeline-label-name"
                      title={object.name}
                      onClick={() => onSelectObject(object.id)}
                    >
                      <Music size={11} aria-hidden />
                      {object.name}
                    </button>
                  </div>
                );
              }

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

              const videos = getActiveScreenVideos(object);

              return videos.length > 0 ? (
                <Fragment key={object.id}>
                  {label}
                  {videos.map(({ key, screen }) => (
                    <div
                      key={key}
                      className={`motion-timeline-label motion-timeline-label-video${
                        object.id === selectedObjectId ? " is-active" : ""
                      }`}
                    >
                      <Video size={11} aria-hidden />
                      {/* O dobrável tem duas trilhas de vídeo: o rótulo diz a
                          tela. Nos outros aparelhos, só "Vídeo". */}
                      <span>
                        {!isDeviceObject(object) || object.modelId !== "duo"
                          ? copy.screenSourceVideo
                          : screen === "outer"
                            ? copy.outerScreenLabel
                            : copy.innerScreenLabel}
                      </span>
                    </div>
                  ))}
                </Fragment>
              ) : (
                <Fragment key={object.id}>{label}</Fragment>
              );
            })}
          </div>

          {/* A janela rola na horizontal; dentro dela a área das trilhas tem
              `zoom` vezes a largura visível. */}
          <div className="motion-timeline-viewport" ref={viewportRef}>
          <div
            className="motion-timeline-lanes"
            ref={lanesRef}
            style={{ width: `${zoom * 100}%` }}
          >
            <div
              className="motion-timeline-ruler"
              aria-hidden
              onPointerDown={(event) => {
                setSelectedKeyframeIds(new Set());
                beginDrag(event, { kind: "scrub" });
              }}
              onPointerMove={handleDragMove}
              onPointerUp={endDrag}
              onPointerCancel={() => endDrag()}
            >
              {ticks.map((timeMs) => (
                <span
                  key={timeMs}
                  className="motion-timeline-tick"
                  style={{ left: toPercent(timeMs) }}
                >
                  {formatTick(timeMs, tickStepMs)}
                </span>
              ))}
            </div>

            {objects.map((object) =>
              isAudioObject(object) ? (
                renderAudioLane(object)
              ) : (
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
                      {/* O mesmo menu do botão direito, ao alcance do clique
                          esquerdo. Não deixa o gesto virar arrasto da trilha. */}
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-label={copy.motionEasing}
                        title={copy.motionEasing}
                        className="editor-icon-button context-menu-trigger-quiet editor-icon-button-no-hover-bg motion-timeline-segment-more"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();

                          openMenu(
                            event,
                            {
                              kind: "easing",
                              keyframeId: keyframe.id,
                              objectId: object.id,
                            },
                            { x: rect.left, y: rect.bottom + 4 },
                          );
                        }}
                      >
                        <MoreVertical size={12} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}

                {object.keyframes.map((keyframe) => {
                  const isSelected = effectiveSelectedIds.has(keyframe.id);
                  const label = `${copy.motionKeyframeLabel} ${formatSeconds(
                    keyframe.timeMs,
                  )}`;

                  return (
                    <button
                      key={keyframe.id}
                      type="button"
                      data-keyframe-id={keyframe.id}
                      data-object-id={object.id}
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

                        if (event.shiftKey) {
                          event.stopPropagation();
                          const next = new Set(effectiveSelectedIds);
                          if (next.has(keyframe.id)) {
                            next.delete(keyframe.id);
                          } else {
                            next.add(keyframe.id);
                          }
                          setSelectedKeyframeIds(next);
                          if (next.size === 1) {
                            const [onlyId] = next;
                            const owner = objects.find((item) =>
                              item.keyframes.some((kf) => kf.id === onlyId),
                            );
                            if (owner) {
                              onSelectKeyframe(owner.id, onlyId);
                            }
                          }
                          return;
                        }

                        if (
                          effectiveSelectedIds.size > 1 &&
                          effectiveSelectedIds.has(keyframe.id)
                        ) {
                          const startByObject = new Map<string, Keyframe[]>();
                          const selectedTimes: number[] = [];

                          for (const item of objects) {
                            const hasSelected = item.keyframes.some((kf) =>
                              effectiveSelectedIds.has(kf.id),
                            );
                            if (hasSelected) {
                              startByObject.set(item.id, item.keyframes);
                              for (const kf of item.keyframes) {
                                if (effectiveSelectedIds.has(kf.id)) {
                                  selectedTimes.push(kf.timeMs);
                                }
                              }
                            }
                          }

                          beginDrag(event, {
                            anchorKeyframeId: keyframe.id,
                            anchorObjectId: object.id,
                            kind: "keyframes-group",
                            minTimeMs:
                              selectedTimes.length > 0
                                ? Math.min(...selectedTimes)
                                : 0,
                            moved: false,
                            selectedIds: new Set(effectiveSelectedIds),
                            selectedTimes,
                            startByObject,
                            startX: event.clientX,
                          });
                          return;
                        }

                        setSelectedKeyframeIds(new Set());
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
                      onPointerCancel={() => endDrag()}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Delete" ||
                          event.key === "Backspace"
                        ) {
                          event.preventDefault();
                          event.stopPropagation();
                          if (
                            effectiveSelectedIds.size > 1 &&
                            effectiveSelectedIds.has(keyframe.id)
                          ) {
                            removeSelectedKeyframes(effectiveSelectedIds);
                          } else {
                            onRemoveKeyframe(object.id, keyframe.id);
                          }
                        }
                      }}
                      onContextMenu={(event) => {
                        setSelectedKeyframeIds(new Set());
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
              {getActiveScreenVideos(object).map((entry) =>
                renderVideoLane(object, entry),
              )}
              </Fragment>
              ),
            )}

            <div
              className="motion-timeline-playhead"
              style={{ left: toPercent(displayedPlayheadMs) }}
            />
            {snapGuideMs !== null ? (
              <div
                aria-hidden="true"
                className="motion-timeline-snap-guide"
                data-testid="timeline-snap-guide"
                style={{ left: toPercent(snapGuideMs) }}
              />
            ) : null}
          </div>
          </div>
        </div>
      )}

      {marqueeRect ? (
        <div
          aria-hidden="true"
          className="motion-timeline-marquee"
          data-testid="timeline-marquee"
          style={marqueeRect}
        />
      ) : null}

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
            <>
              {/* A pose do vizinho no tempo vira a deste keyframe (o instante
                  e a curva ficam). Sem vizinho naquele lado, a opção fica
                  desligada em vez de sumir: o menu não muda de forma. */}
              {(["previous", "next"] as const).map((direction) => {
                const neighbor = menuObject
                  ? findNeighborKeyframe(
                      menuObject.keyframes,
                      menuKeyframe.id,
                      direction,
                    )
                  : null;

                return (
                  <button
                    key={direction}
                    type="button"
                    role="menuitem"
                    className={`context-menu-row${
                      neighbor ? "" : " context-menu-row-disabled"
                    }`}
                    disabled={!neighbor}
                    onClick={() => {
                      if (!menuObject) return;

                      onChangeKeyframes(
                        menuObject.id,
                        copyNeighborPose(
                          menuObject.keyframes,
                          menuKeyframe.id,
                          direction,
                        ),
                      );
                      setMenu(null);
                    }}
                  >
                    <span className="context-menu-row-label">
                      {direction === "previous"
                        ? copy.motionCopyPreviousKeyframe
                        : copy.motionCopyNextKeyframe}
                    </span>
                  </button>
                );
              })}
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
            </>
          )}
        </TimelineMenu>
      ) : null}
    </section>
  );
}
