"use client";

import { RESIZE_HANDLES, type ResizeHandle } from "@/lib/canvas";
import { cn } from "@/lib/utils";

export interface ResizeHandlesProps {
  /** Starts a resize drag for the given handle. */
  onStartResize: (handle: ResizeHandle, event: React.PointerEvent) => void;
}

/** Placement and cursor per handle. */
const HANDLE_STYLES: Record<ResizeHandle, string> = {
  nw: "-top-1 -left-1 cursor-nwse-resize",
  n: "-top-1 left-1/2 -translate-x-1/2 cursor-ns-resize",
  ne: "-top-1 -right-1 cursor-nesw-resize",
  e: "top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize",
  se: "-bottom-1 -right-1 cursor-nwse-resize",
  s: "-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize",
  sw: "-bottom-1 -left-1 cursor-nesw-resize",
  w: "top-1/2 -left-1 -translate-y-1/2 cursor-ew-resize",
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
            "absolute size-2.5 rounded-[3px] border border-ring bg-surface",
            "shadow-[0_1px_3px_rgb(10_8_4/0.35)]",
            HANDLE_STYLES[handle],
          )}
        />
      ))}
    </>
  );
}
