"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCanvasTouch } from "@/hooks/use-canvas-touch";
import { resolveTags } from "@/lib/resolve-tags";
import { CanvasGrid } from "@/components/canvas/canvas-grid";
import { CanvasSettingsItems } from "@/components/canvas/canvas-controls";
import { CanvasNote } from "@/components/canvas/canvas-note";
import { SelectionBox } from "@/components/canvas/selection-box";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CONTEXT_MENU_PRIMITIVES } from "@/components/ui/menu-primitives";
import { MAX_ZOOM, MIN_ZOOM } from "@/config/layouts";
import { useNoteActions } from "@/features/notes/use-note-actions";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { usePointerDrag } from "@/hooks/use-pointer-drag";
import {
  boundingBox,
  rectFromPoints,
  rectsIntersect,
  screenDeltaToCanvas,
  screenToCanvas,
  snapPointToGrid,
  transformToRect,
  zoomAtPoint,
  type Point,
  type Rect,
} from "@/lib/canvas";
import { useCanvasStore } from "@/stores/canvas-store";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";
import type { Note } from "@/types/note";

export interface CanvasProps {
  /** Frames every note — shared with the floating controls. */
  onFitToContent: () => void;
}

/** Wheel zoom sensitivity. Tuned so a notch is roughly a 10% step. */
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

/**
 * Canvas Mode — the signature Tackly surface
 * (FRONTEND_SPEC.md §13, PRODUCT_SPEC.md → "Canvas Implementation").
 *
 * Interaction model:
 *
 * | Gesture                        | Result            |
 * | ------------------------------ | ----------------- |
 * | Drag a note                    | Moves the selection |
 * | Drag empty canvas              | Selection marquee |
 * | Middle-drag, or Space + drag   | Pan               |
 * | Wheel                          | Pan               |
 * | Ctrl/Cmd + wheel, pinch        | Zoom at cursor    |
 *
 * **The performance rule** (FRONTEND_SPEC.md §77) is the reason this file is
 * shaped the way it is. Pointer movement never touches React or the store:
 * a drag writes `transform` onto the dragged elements inside a
 * `requestAnimationFrame` callback, and the store is updated exactly once, on
 * `pointerup`. Panning is the one exception — it moves a single element, so it
 * goes through the same ref-write path and commits the viewport on release.
 */
export function Canvas({ onFitToContent }: CanvasProps) {
  const { tags } = useTaxonomyContext();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useCanvasTouch(surfaceRef, contentRef);

  const notes = useNoteStore((state) => state.notes);
  const moveNotes = useNoteStore((state) => state.moveNotes);
  const setTransform = useNoteStore((state) => state.setTransform);

  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const select = useSelectionStore((state) => state.select);
  const selectMany = useSelectionStore((state) => state.selectMany);
  const clearSelection = useSelectionStore((state) => state.clear);

  const viewport = useCanvasStore((state) => state.viewport);
  const viewportSize = useCanvasStore((state) => state.viewportSize);
  const gridMode = useCanvasStore((state) => state.gridMode);
  const gridSize = useCanvasStore((state) => state.gridSize);
  const snap = useCanvasStore((state) => state.snapToGrid);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const setInteracting = useCanvasStore((state) => state.setInteracting);
  const setViewportSize = useCanvasStore((state) => state.setViewportSize);

  const actions = useNoteActions();

  const [marquee, setMarquee] = useState<Rect | null>(null);
  const spaceHeldRef = useRef(false);

  // Only notes the user has deliberately placed. The Canvas is a separate
  // surface from the Board, not a mirror of it — see `Note.onCanvas`.
  const visibleNotes = useMemo(
    () => notes.filter((note) => note.onCanvas && !note.archived && !note.deletedAt),
    [notes],
  );

  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );

  // Publish the canvas size so fit-to-content — whose button lives in the
  // shell's floating cluster — can do viewport math.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const publish = () => {
      const rect = surface.getBoundingClientRect();

      // A 0×0 measurement means "not laid out yet" — during the first paint,
      // or while the canvas is hidden. Publishing it would make
      // fit-to-content believe there is no room and quietly do nothing.
      if (rect.width <= 0 || rect.height <= 0) return;

      setViewportSize({ width: rect.width, height: rect.height });
    };

    publish();

    // jsdom and older browsers may lack ResizeObserver; the initial measure
    // above still gives fit-to-content something to work with.
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(publish);
    observer.observe(surface);
    return () => observer.disconnect();
  }, [setViewportSize]);

  // Space toggles pan mode, the way it does in every canvas tool.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isTypingInto(event.target)) {
        spaceHeldRef.current = true;
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") spaceHeldRef.current = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  /* ------------------------------------------------------------------ *
   * Wheel: pan, or zoom with Ctrl/Cmd (and pinch, which browsers report
   * as a Ctrl-wheel).
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const onWheel = (event: WheelEvent) => {
      // Registered non-passively so the page cannot scroll or browser-zoom
      // out from under the canvas.
      event.preventDefault();

      const rect = surface.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      const current = useCanvasStore.getState().viewport;

      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
        setViewport(
          zoomAtPoint(current, current.zoom * factor, anchor, MIN_ZOOM, MAX_ZOOM),
        );
        return;
      }

      setViewport({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      });
    };

    surface.addEventListener("wheel", onWheel, { passive: false });
    return () => surface.removeEventListener("wheel", onWheel);
  }, [setViewport]);

  /** Pointer position relative to the surface element. */
  const toSurfacePoint = useCallback((clientPoint: Point): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect) return clientPoint;

    return { x: clientPoint.x - rect.left, y: clientPoint.y - rect.top };
  }, []);

  /* ------------------------------------------------------------------ *
   * Moving the selection
   * ------------------------------------------------------------------ */
  const moveStartRef = useRef<Map<string, Point> | null>(null);

  const startMove = usePointerDrag({
    onStart: (_state, event) => {
      if (event.button !== 0 || spaceHeldRef.current) return false;

      // Snapshot the starting position of every note that will move. Reading
      // the store once here keeps the move loop free of store access.
      const current = useNoteStore.getState().notes;
      const moving = useSelectionStore.getState().selectedIds;

      const starts = new Map<string, Point>();
      for (const note of current) {
        if (!moving.has(note.id) || note.locked) continue;
        starts.set(note.id, { x: note.transform.x, y: note.transform.y });
      }

      if (starts.size === 0) return false;

      moveStartRef.current = starts;
      setInteracting(true);
      return true;
    },

    onMove: (state) => {
      const starts = moveStartRef.current;
      const content = contentRef.current;
      if (!starts || !content) return;

      const delta = screenDeltaToCanvas(state.delta, viewport.zoom);

      for (const [noteId, start] of starts) {
        const element = content.querySelector<HTMLElement>(
          `[data-note-id="${noteId}"]`,
        );
        if (!element) continue;

        const next = resolvePosition(start, delta, snap, gridSize);
        const rotation = element.dataset.rotation ?? "0";
        element.style.transform = `translate(${next.x}px, ${next.y}px) rotate(${rotation}deg)`;
      }
    },

    onEnd: (state) => {
      const starts = moveStartRef.current;
      moveStartRef.current = null;
      setInteracting(false);
      if (!starts) return;

      const delta = screenDeltaToCanvas(state.delta, viewport.zoom);

      // One commit for the whole gesture (FRONTEND_SPEC.md §77).
      const moves = new Map<string, Point>();
      for (const [noteId, start] of starts) {
        moves.set(noteId, resolvePosition(start, delta, snap, gridSize));
      }

      moveNotes(moves);
    },

    onCancel: () => {
      for (const [id, start] of moveStartRef.current ?? []) { const element = contentRef.current?.querySelector<HTMLElement>(`[data-note-id="${id}"]`); if (element) element.style.transform = `translate(${start.x}px, ${start.y}px) rotate(${element.dataset.rotation ?? "0"}deg)`; }
      moveStartRef.current = null;
      setInteracting(false);
    },
  });

  const onStartMove = useCallback(
    (_noteId: string, event: React.PointerEvent) => {
      startMove(event);
    },
    [startMove],
  );

  /* ------------------------------------------------------------------ *
   * Panning, and the selection marquee
   * ------------------------------------------------------------------ */
  const panStartRef = useRef<Point | null>(null);
  const marqueeOriginRef = useRef<Point | null>(null);

  const startSurfaceGesture = usePointerDrag({
    onStart: (state, event) => {
      const panning = event.button === 1 || spaceHeldRef.current;

      if (panning) {
        panStartRef.current = { x: viewport.x, y: viewport.y };
        setInteracting(true);
        return true;
      }

      if (event.button !== 0) return false;

      // A plain click on empty canvas starts a marquee and, unless the user is
      // extending, drops the current selection.
      if (!state.shiftKey && !state.ctrlKey && !state.metaKey) clearSelection();

      marqueeOriginRef.current = toSurfacePoint(state.origin);
      setInteracting(true);
      return true;
    },

    onMove: (state) => {
      const panStart = panStartRef.current;
      if (panStart) {
        setViewport({
          zoom: viewport.zoom,
          x: panStart.x + state.delta.x,
          y: panStart.y + state.delta.y,
        });
        return;
      }

      const origin = marqueeOriginRef.current;
      if (!origin) return;

      setMarquee(rectFromPoints(origin, toSurfacePoint(state.current)));
    },

    onEnd: (state) => {
      setInteracting(false);

      if (panStartRef.current) {
        panStartRef.current = null;
        return;
      }

      const origin = marqueeOriginRef.current;
      marqueeOriginRef.current = null;
      setMarquee(null);
      if (!origin) return;

      const screenRect = rectFromPoints(origin, toSurfacePoint(state.current));

      // A click without movement is a deselect, not a zero-area marquee.
      if (screenRect.width < 3 && screenRect.height < 3) return;

      const canvasRect = screenRectToCanvas(screenRect, viewport);
      const hits = visibleNotes
        .filter((note) => rectsIntersect(transformToRect(note.transform), canvasRect))
        .map((note) => note.id);

      selectMany(hits, state.shiftKey || state.ctrlKey || state.metaKey ? "add" : "replace");
    },

    onCancel: () => {
      panStartRef.current = null;
      marqueeOriginRef.current = null;
      setMarquee(null);
      setInteracting(false);
    },
  });

  const onSelectNote = useCallback(
    (noteId: string, event: React.PointerEvent) => {
      const alreadySelected = useSelectionStore.getState().selectedIds.has(noteId);

      if (event.ctrlKey || event.metaKey) {
        select(noteId, "toggle");
        return;
      }

      if (event.shiftKey) {
        select(noteId, "add");
        return;
      }

      // Dragging a note that is already part of a multi-select must move the
      // whole group, so a plain press on it does not collapse the selection.
      if (!alreadySelected) select(noteId, "replace");
    },
    [select],
  );

  const onCommitResize = useCallback(
    (noteId: string, rect: Rect) => {
      setTransform(noteId, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    },
    [setTransform],
  );

  const soleSelection = selectedIds.size === 1;
  const renderedNotes = visibleNotes.filter((note) => {
    if (selectedIds.has(note.id) || viewportSize.width <= 0 || viewportSize.height <= 0) return true;
    const box = note.transform; const margin = Math.max(box.width, box.height) + 400 / viewport.zoom;
    const left = -viewport.x / viewport.zoom, top = -viewport.y / viewport.zoom;
    return box.x + box.width + margin >= left && box.y + box.height + margin >= top && box.x - margin <= left + viewportSize.width / viewport.zoom && box.y - margin <= top + viewportSize.height / viewport.zoom;
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <main id="main-content" data-export-surface="true"
      ref={surfaceRef}
      aria-label="Canvas"
      tabIndex={0}
      aria-describedby="canvas-keyboard-help"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const current = useCanvasStore.getState().viewport; const delta = event.shiftKey ? 100 : 40;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault(); setViewport({ ...current, x: current.x + (event.key === "ArrowLeft" ? delta : event.key === "ArrowRight" ? -delta : 0), y: current.y + (event.key === "ArrowUp" ? delta : event.key === "ArrowDown" ? -delta : 0) });
        } else if (event.key === "+" || event.key === "=" || event.key === "-") { event.preventDefault(); setViewport(zoomAtPoint(current, current.zoom * (event.key === "-" ? .9 : 1.1), { x: viewportSize.width / 2, y: viewportSize.height / 2 }, MIN_ZOOM, MAX_ZOOM)); }
        else if (event.key === "Home") { event.preventDefault(); onFitToContent(); }
      }}
      data-testid="canvas"
      className="relative z-[var(--z-board)] flex-1 touch-none overflow-hidden"
      onPointerDown={(event) => {
        // Only gestures that begin on the surface itself pan or marquee; a
        // press that started on a note is handled by the note.
        if (event.target === event.currentTarget) startSurfaceGesture(event);
      }}
    >
      <p id="canvas-keyboard-help" className="sr-only">Arrow keys pan. Plus and minus zoom. Home fits notes. Touch: use two fingers to pan or pinch to zoom. Use a note menu to edit or move columns.</p>
      <CanvasGrid mode={gridMode} size={gridSize} viewport={viewport} />

      <div
        ref={contentRef}
        data-testid="canvas-content"
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        }}
      >
        {renderedNotes.map((note) => (
          <CanvasNote
            key={note.id}
            note={note}
            tags={resolveTags(note.tagIds, tagsById)}
            selected={selectedIds.has(note.id)}
            actions={actions}
            zoom={viewport.zoom}
            gridSize={gridSize}
            snap={snap}
            soleSelection={soleSelection}
            onSelect={onSelectNote}
            onStartMove={onStartMove}
            onCommitResize={onCommitResize}
          />
        ))}
      </div>

      {visibleNotes.length === 0 ? <CanvasEmptyState /> : null}

      <SelectionBox rect={marquee} />
    </main>
      </ContextMenuTrigger>

      {/*
        Right-clicking the canvas opens its settings — a different set from the
        Board's, because the two surfaces answer different questions.
      */}
      <ContextMenuContent className="w-auto min-w-52">
        <CanvasSettingsItems
          ui={CONTEXT_MENU_PRIMITIVES}
          onFitToContent={onFitToContent}
        />
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Shown when nothing has been placed yet.
 *
 * The Canvas starting empty is the point — an infinite desk covered with every
 * note you own is not a desk. This says how to put something on it.
 */
function CanvasEmptyState() {
  return (
    <div
      data-testid="canvas-empty-state"
      className="pointer-events-none absolute inset-0 grid place-items-center p-6"
    >
      <div className="max-w-sm rounded-lg border border-dashed border-border bg-surface/70 p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          Your canvas is empty
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          The Canvas is its own surface. Add a note here, or pick{" "}
          <span className="text-foreground">Add to Canvas</span> from any note
          on the Board.
        </p>
      </div>
    </div>
  );
}

/** Applies a drag delta to a start position, snapping when enabled. */
function resolvePosition(
  start: Point,
  delta: Point,
  snap: boolean,
  gridSize: number,
): Point {
  const moved = { x: start.x + delta.x, y: start.y + delta.y };
  return snap ? snapPointToGrid(moved, gridSize) : moved;
}

/** Converts a screen-space rectangle to canvas space. */
function screenRectToCanvas(
  rect: Rect,
  viewport: { x: number; y: number; zoom: number },
): Rect {
  const topLeft = screenToCanvas({ x: rect.x, y: rect.y }, viewport);

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width / viewport.zoom,
    height: rect.height / viewport.zoom,
  };
}


/** True when the event target is a field the user is typing into. */
function isTypingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA"
  );
}

/** Re-exported so tests and the bounding-box helpers share one definition. */
export function notesBoundingBox(notes: readonly Note[]): Rect | null {
  return boundingBox(notes.map((note) => transformToRect(note.transform)));
}
