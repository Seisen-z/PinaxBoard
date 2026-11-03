"use client";

import { RESIZE_HANDLES, type ResizeHandle } from "@/lib/canvas";
import { cn } from "@/lib/utils";

export interface ResizeHandlesProps {
  /** Starts a resize drag for the given handle. */
  onStartResize: (handle: ResizeHandle, event: React.PointerEvent) => void;
}

/** Placement and cursor per handle. */
const HANDLE_STYLES: Record<ResizeHandle, string> = {
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  ne: "left-full top-0 -translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  e: "left-full top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  se: "left-full top-full -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  s: "left-1/2 top-full -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  sw: "left-0 top-full -translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
};

const HANDLE_LABELS: Record<ResizeHandle, string> = {
  nw: "top left",
  n: "top",
  ne: "top right",
  e: "right",
  se: "bottom right",
  s: "bottom",
  sw: "bottom left",
  w: "left",
};

/**
 * The eight resize grips shown on a selected canvas note
 * (FRONTEND_SPEC.md §13).
 *
 * Rendered only for a single selection: eight grips on every note of a
 * multi-select would bury the notes under their own chrome.
 */
export function ResizeHandles({ onStartResize }: ResizeHandlesProps) {
  return (
    <>
      {RESIZE_HANDLES.map((handle) => (
        <button
          key={handle}
          type="button"
          tabIndex={-1}
          aria-label={`Resize from ${HANDLE_LABELS[handle]}`}
          data-testid={`resize-handle-${handle}`}
          onPointerDown={(event) => {
            // The note's own drag handler must not also fire.
            event.stopPropagation();
            onStartResize(handle, event);
          }}
          className={cn(
            // A generous, touch-action:none hit area (44px on touch screens)
            // around a small visible grip, so a finger or trackpad can grab it
            // and the browser does not scroll or pan instead of resizing.
            "group absolute grid size-6 touch-none place-items-center [@media(pointer:coarse)]:size-11",
            HANDLE_STYLES[handle],
          )}
        >
          <span
            aria-hidden="true"
            className="size-2.5 rounded-[3px] border border-ring bg-surface shadow-[0_1px_3px_rgb(10_8_4/0.35)] [@media(pointer:coarse)]:size-4"
          />
        </button>
      ))}
    </>
  );
}
