"use client";

import type { Rect } from "@/lib/canvas";

export interface SelectionBoxProps {
  /** The marquee rectangle, in screen space, or `null` when not dragging. */
  rect: Rect | null;
}

/**
 * The drag-selection marquee (FRONTEND_SPEC.md §13).
 *
 * Positioned in screen space rather than canvas space so its border stays one
 * pixel wide at any zoom — a canvas-space border would scale with the content
 * and turn into a thick slab when zoomed in.
 */
export function SelectionBox({ rect }: SelectionBoxProps) {
  if (!rect) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="selection-box"
      className="pointer-events-none absolute border border-ring bg-ring/10"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
