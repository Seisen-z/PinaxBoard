"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import { memo, useCallback, useRef } from "react";

import { ResizeHandles } from "@/components/canvas/resize-handles";
import { PaperNoteCard } from "@/components/notes/paper-note-card";
import type { NoteActions } from "@/features/notes/use-note-actions";
import { usePointerDrag } from "@/hooks/use-pointer-drag";
import {
  resizeRect,
  screenDeltaToCanvas,
  snapToGrid,
  transformToRect,
  type Rect,
  type ResizeHandle,
} from "@/lib/canvas";
import { cn } from "@/lib/utils";
import type { Note, Tag } from "@/types/note";

export interface CanvasNoteProps {
  note: Note;
  tags?: readonly Tag[];
  selected: boolean;
  /**
   * The same action set the lane Board uses. Canvas Mode and the Board are two
   * views of one note, so they must offer the same editing and the same menu —
   * passing only the menu actions here is what made canvas notes read-only.
   */
  actions: NoteActions;
  /** Current zoom, needed to convert screen movement into canvas movement. */
  zoom: number;
  gridSize: number;
  snap: boolean;
  /** True when this note is the only thing selected — resize grips show then. */
  soleSelection: boolean;

  onSelect: (noteId: string, event: React.PointerEvent) => void;
  /**
   * Starts dragging the whole selection. The canvas owns multi-note movement,
   * since a drag on one selected note moves all of them.
   */
  onStartMove: (noteId: string, event: React.PointerEvent) => void;
  /** Commits a resize once the gesture ends. */
  onCommitResize: (noteId: string, rect: Rect) => void;
}

/**
 * One note positioned on the infinite canvas.
 *
 * The element is placed with a `translate` in canvas units and sized in canvas
 * units; the parent's `scale` does the zooming. That means a drag only has to
 * rewrite this element's `transform`, and never triggers layout.
 *
 * Memoized, and every prop is either a primitive or a stable callback, so
 * moving one note does not re-render the rest of the board
 * (FRONTEND_SPEC.md §76).
 */
export const CanvasNote = memo(function CanvasNote({
  note,
  tags,
  selected,
  actions,
  zoom,
  gridSize,
  snap,
  soleSelection,
  onSelect,
  onStartMove,
  onCommitResize,
}: CanvasNoteProps) {
  const canEdit=useCanEditBoard();
  const elementRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<Rect | null>(null);
  // Which grip the in-flight resize started from.
  const handleRef = useRef<ResizeHandle>("se");

  const { x, y, width, height, rotation, zIndex } = note.transform;

  const startResize = usePointerDrag({
    onStart: () => {
      if (!canEdit || note.locked) return false;
      resizeStartRef.current = transformToRect(note.transform);
      return true;
    },

    onMove: (state) => {
      const element = elementRef.current;
      const start = resizeStartRef.current;
      if (!element || !start) return;

      const rect = nextRect(start, state.delta, zoom, snap, gridSize, handleRef.current);

      // Written straight to the DOM — no React, no store, once per frame.
      element.style.transform = `translate(${rect.x}px, ${rect.y}px) rotate(${rotation}deg)`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
    },

    onEnd: (state) => {
      const start = resizeStartRef.current;
      resizeStartRef.current = null;
      if (!start) return;

      onCommitResize(
        note.id,
        nextRect(start, state.delta, zoom, snap, gridSize, handleRef.current),
      );
    },

    onCancel: () => {
      resizeStartRef.current = null;

      // Drop the inline overrides so the element snaps back to the store's
      // values on the next render.
      const element = elementRef.current;
      if (element) {
        element.style.removeProperty("width");
        element.style.removeProperty("height");
      }
    },
  });

  const onStartResize = useCallback(
    (handle: ResizeHandle, event: React.PointerEvent) => {
      handleRef.current = handle;
      startResize(event);
    },
    [startResize],
  );

  return (
    <div
      ref={elementRef}
      data-testid="canvas-note"
      data-note-id={note.id}
      // Read by the canvas's move loop, which rewrites `transform` directly
      // and must preserve the note's rotation while doing so.
      data-rotation={rotation}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || !canEdit || note.locked || !event.altKey) return;
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault(); const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
        onCommitResize(note.id, event.ctrlKey ? { x, y, width: Math.max(80, width + dx), height: Math.max(40, height + dy) } : { x: x + dx, y: y + dy, width, height });
      }}
      tabIndex={0}
      role="group"
      aria-label={`Canvas placement for ${note.title || "Untitled"}. Alt and arrows move; Ctrl Alt and arrows resize.`}
      className={cn(
        "absolute left-0 top-0 origin-top-left",
        note.locked ? "cursor-default" : "cursor-grab active:cursor-grabbing",
      )}
      style={{
        transform: `translate(${x}px, ${y}px) rotate(${rotation}deg)`,
        width,
        height,
        zIndex,
        // The card scrolls as a whole, so the body must not stop at the lane
        // cap of 180px: resizing taller has to reveal more text.
        "--note-content-max-height": "none",
      } as React.CSSProperties}
      onPointerDown={(event) => {
        // A press on a control or a text field belongs to that control. Without
        // this, starting a drag from anywhere on the card would steal focus
        // from the title and make canvas notes impossible to edit.
        if (isInteractiveTarget(event.target)) return;

        onSelect(note.id, event);
        if(canEdit) onStartMove(note.id, event);
      }}
    >
      <PaperNoteCard
        note={note}
        {...(tags ? { tags } : {})}
        selected={selected}
        menuActions={actions}
        onTitleChange={actions.setTitle}
        onContentChange={actions.setContent}
        onToggleSubtask={actions.toggleSubtask}
        className="tk-scrollbar-thin h-full overflow-y-auto overflow-x-hidden"
      />

      {canEdit && selected && soleSelection && !note.locked ? (
        <ResizeHandles onStartResize={onStartResize} />
      ) : null}
    </div>
  );
});

/**
 * True when the pointer landed on something the user is trying to operate
 * rather than on the note's body.
 *
 * Buttons and fields must win over the drag gesture, otherwise the title
 * cannot be focused, a checkbox cannot be ticked, and the More menu cannot be
 * opened on the canvas.
 */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return Boolean(
    target.closest(
      'button, a, input, textarea, select, [contenteditable="true"], [role="checkbox"], [role="menuitem"]',
    ),
  );
}

/** Applies a resize delta, converting to canvas units and snapping if asked. */
function nextRect(
  start: Rect,
  screenDelta: { x: number; y: number },
  zoom: number,
  snap: boolean,
  gridSize: number,
  handle: ResizeHandle,
): Rect {
  const delta = screenDeltaToCanvas(screenDelta, zoom);
  const rect = resizeRect(start, handle, delta);

  if (!snap) return rect;

  // Snap the edges, not the size, so a resized note lines up with its
  // neighbours rather than merely having a round width.
  const right = snapToGrid(rect.x + rect.width, gridSize);
  const bottom = snapToGrid(rect.y + rect.height, gridSize);
  const left = snapToGrid(rect.x, gridSize);
  const top = snapToGrid(rect.y, gridSize);

  return {
    x: left,
    y: top,
    width: Math.max(right - left, gridSize),
    height: Math.max(bottom - top, gridSize),
  };
}
