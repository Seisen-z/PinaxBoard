"use client";

import { create } from "zustand";

import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from "@/config/layouts";
import { zoomAtPoint, type Point, type Rect, type Size } from "@/lib/canvas";
import { fitToContent } from "@/lib/canvas";
import { clamp } from "@/lib/utils";
import type { CanvasViewport } from "@/types/board";

/**
 * Canvas viewport and grid settings (IMPLEMENTATION_PLAN.md §10).
 *
 * Deliberately *not* here: anything that changes per pointer move. A drag
 * writes its transform straight to the DOM through a ref and commits once on
 * `pointerup` (FRONTEND_SPEC.md §77). Routing 60 frames a second through a
 * store would re-render every subscriber on every frame, which is the exact
 * failure mode the performance rule exists to prevent.
 */

/** Optional grid overlay (FRONTEND_SPEC.md §13). */
export const GRID_MODES = ["off", "dot", "line"] as const;
export type GridMode = (typeof GRID_MODES)[number];

export interface CanvasStoreState {
  viewport: CanvasViewport;
  gridMode: GridMode;
  /** Grid spacing in canvas units. */
  gridSize: number;
  /** Whether dragging and resizing snap to the grid. */
  snapToGrid: boolean;
  /** True while a marquee, drag or resize is in progress. */
  interacting: boolean;
  /**
   * Measured size of the canvas element, in screen pixels.
   *
   * Published by the canvas so controls rendered elsewhere in the shell — the
   * fit-to-content button lives in the floating cluster — can do viewport math
   * without reaching for a DOM node they do not own.
   */
  viewportSize: Size;

  setViewport: (viewport: CanvasViewport) => void;
  panBy: (delta: Point) => void;
  /** Zooms around a screen-space anchor, usually the cursor. */
  zoomBy: (factor: number, anchor: Point) => void;
  setZoom: (zoom: number, anchor: Point) => void;
  resetViewport: () => void;
  /** Frames the given content. No-ops when there is nothing to frame. */
  fitTo: (content: Rect | null, viewportSize: Size) => void;

  setViewportSize: (size: Size) => void;
  setGridMode: (mode: GridMode) => void;
  setGridSize: (size: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setInteracting: (interacting: boolean) => void;
}

export const DEFAULT_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  zoom: DEFAULT_ZOOM,
};

export const DEFAULT_GRID_SIZE = 24;

export const useCanvasStore = create<CanvasStoreState>()((set, get) => ({
  viewport: DEFAULT_VIEWPORT,
  gridMode: "dot",
  gridSize: DEFAULT_GRID_SIZE,
  snapToGrid: false,
  interacting: false,
  viewportSize: { width: 0, height: 0 },

  setViewport: (viewport) => {
    set({
      viewport: {
        ...viewport,
        zoom: clamp(viewport.zoom, MIN_ZOOM, MAX_ZOOM),
      },
    });
  },

  panBy: (delta) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + delta.x,
        y: state.viewport.y + delta.y,
      },
    }));
  },

  zoomBy: (factor, anchor) => {
    const { viewport } = get();
    set({
      viewport: zoomAtPoint(
        viewport,
        viewport.zoom * factor,
        anchor,
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    });
  },

  setZoom: (zoom, anchor) => {
    const { viewport } = get();
    set({ viewport: zoomAtPoint(viewport, zoom, anchor, MIN_ZOOM, MAX_ZOOM) });
  },

  resetViewport: () => set({ viewport: DEFAULT_VIEWPORT }),

  fitTo: (content, viewportSize) => {
    const next = fitToContent(content, {
      viewport: viewportSize,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    // `null` means "nothing to frame" — an empty board, or a viewport that has
    // not been measured yet. Leaving the view put beats jumping somewhere odd.
    if (next) set({ viewport: next });
  },

  setViewportSize: (size) => {
    set((state) =>
      // ResizeObserver fires on every layout pass; publishing an identical
      // size would re-render every subscriber for nothing.
      state.viewportSize.width === size.width &&
      state.viewportSize.height === size.height
        ? state
        : { viewportSize: size },
    );
  },

  setGridMode: (gridMode) => set({ gridMode }),

  setGridSize: (size) => set({ gridSize: clamp(size, 4, 200) }),

  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),

  setInteracting: (interacting) => set({ interacting }),
}));

/** Stable selector for the viewport. */
export const selectViewport = (state: CanvasStoreState): CanvasViewport =>
  state.viewport;
