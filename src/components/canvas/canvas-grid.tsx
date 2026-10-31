"use client";

import type { CanvasViewport } from "@/types/board";
import type { GridMode } from "@/stores/canvas-store";

export interface CanvasGridProps {
  mode: GridMode;
  /** Spacing in canvas units. */
  size: number;
  viewport: CanvasViewport;
}

/**
 * The optional canvas grid (FRONTEND_SPEC.md §13).
 *
 * Drawn as a CSS background on a single fixed element rather than as elements
 * per line: an infinite canvas has no bounded line count, and a repeating
 * background costs one paint regardless of zoom level.
 *
 * The pattern is positioned in *screen* space — spacing scaled by zoom, offset
 * by the pan — so it stays glued to the canvas beneath it while the element
 * itself never moves.
 *
 * Grid opacity stays in the 5–12% band the spec specifies, via
 * `--canvas-grid-color`.
 */
export function CanvasGrid({ mode, size, viewport }: CanvasGridProps) {
  if (mode === "off") return null;

  const spacing = size * viewport.zoom;

  // Below a couple of pixels the grid reads as a flat wash of noise rather
  // than a grid, so it is hidden when zoomed far out.
  if (spacing < 4) return null;

  const offsetX = viewport.x % spacing;
  const offsetY = viewport.y % spacing;

  const backgroundImage =
    mode === "dot"
      ? "radial-gradient(var(--canvas-grid-color) 1px, transparent 1px)"
      : [
          "linear-gradient(to right, var(--canvas-grid-color) 1px, transparent 1px)",
          "linear-gradient(to bottom, var(--canvas-grid-color) 1px, transparent 1px)",
        ].join(", ");

  return (
    <div
      aria-hidden="true"
      data-testid="canvas-grid"
      data-grid-mode={mode}
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage,
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
      }}
    />
  );
}
