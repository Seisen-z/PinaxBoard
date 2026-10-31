import { clamp } from "@/lib/utils";
import type { CanvasViewport } from "@/types/board";
import type { NoteTransform } from "@/types/note";

/**
 * Canvas coordinate math (PRODUCT_SPEC.md → "Coordinate Model").
 *
 * Two spaces are in play:
 *
 *  - **canvas space** — where notes live. Infinite, unaffected by zoom. A
 *    note's stored `x`/`y` are always canvas coordinates.
 *  - **screen space** — pixels in the viewport element.
 *
 * The relationship is `screen = canvas * zoom + viewport`, where `viewport.x/y`
 * is the translation in *screen* pixels. Keeping that one equation in this file
 * — rather than inline in event handlers — is what stops pan and zoom drifting
 * apart. Everything here is pure, so it is cheap to test.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

/** Converts a point in the viewport element to canvas space. */
export function screenToCanvas(point: Point, viewport: CanvasViewport): Point {
  return {
    x: (point.x - viewport.x) / viewport.zoom,
    y: (point.y - viewport.y) / viewport.zoom,
  };
}

/** Converts a canvas point to a position inside the viewport element. */
export function canvasToScreen(point: Point, viewport: CanvasViewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.x,
    y: point.y * viewport.zoom + viewport.y,
  };
}

/**
 * Converts a screen-space *distance* to canvas space.
 *
 * Distances ignore the pan offset — only the scale applies. Using
 * {@link screenToCanvas} for a delta is the classic bug here: it would add the
 * pan offset to every drag step.
 */
export function screenDeltaToCanvas(
  delta: Point,
  zoom: number,
): Point {
  return { x: delta.x / zoom, y: delta.y / zoom };
}

/**
 * Zooms while keeping the canvas point under `anchor` pinned to it.
 *
 * This is what makes wheel-zoom feel like it is happening under the cursor
 * rather than around an arbitrary origin.
 *
 * @param viewport Current viewport.
 * @param nextZoom Desired zoom, clamped to `[minZoom, maxZoom]`.
 * @param anchor   Screen-space point to hold fixed — the cursor, usually.
 */
export function zoomAtPoint(
  viewport: CanvasViewport,
  nextZoom: number,
  anchor: Point,
  minZoom: number,
  maxZoom: number,
): CanvasViewport {
  const zoom = clamp(nextZoom, minZoom, maxZoom);

  // The canvas point currently under the anchor must stay under it.
  const canvasAnchor = screenToCanvas(anchor, viewport);

  return {
    zoom,
    x: anchor.x - canvasAnchor.x * zoom,
    y: anchor.y - canvasAnchor.y * zoom,
  };
}

/**
 * Snaps a value to the nearest grid line.
 *
 * `size <= 0` disables snapping rather than dividing by zero — a grid size of
 * zero reaching this function should degrade to free placement, not NaN
 * coordinates that would make a note vanish.
 */
export function snapToGrid(value: number, size: number): number {
  if (!Number.isFinite(value)) return 0;
  if (size <= 0 || !Number.isFinite(size)) return value;

  return Math.round(value / size) * size;
}

/** Snaps a point to the grid. */
export function snapPointToGrid(point: Point, size: number): Point {
  return { x: snapToGrid(point.x, size), y: snapToGrid(point.y, size) };
}

/** The axis-aligned box a transform occupies, ignoring rotation. */
export function transformToRect(transform: NoteTransform): Rect {
  return {
    x: transform.x,
    y: transform.y,
    width: transform.width,
    height: transform.height,
  };
}

/** True when two rectangles overlap at all. Touching edges do not count. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Builds a rectangle from two corners, in any order.
 *
 * Used by the selection marquee, which the user may drag in any direction.
 */
export function rectFromPoints(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** The smallest rectangle containing every input, or `null` for none. */
export function boundingBox(rects: readonly Rect[]): Rect | null {
  const first = rects[0];
  if (!first) return null;

  let minX = first.x;
  let minY = first.y;
  let maxX = first.x + first.width;
  let maxY = first.y + first.height;

  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export interface FitOptions {
  /** Size of the viewport element, in screen pixels. */
  viewport: Size;
  /** Screen-pixel margin left around the content. */
  padding?: number;
  minZoom: number;
  maxZoom: number;
}

/**
 * Computes the viewport that frames `content` (FRONTEND_SPEC.md §13 —
 * fit-to-content).
 *
 * Returns `null` when there is nothing to frame or the viewport has no size
 * yet — during the first render, for instance — so the caller can leave the
 * current view alone rather than jumping to a nonsense zoom.
 */
export function fitToContent(
  content: Rect | null,
  { viewport, padding = 64, minZoom, maxZoom }: FitOptions,
): CanvasViewport | null {
  if (!content) return null;
  if (viewport.width <= 0 || viewport.height <= 0) return null;

  const availableWidth = Math.max(viewport.width - padding * 2, 1);
  const availableHeight = Math.max(viewport.height - padding * 2, 1);

  // A zero-sized box (one empty note) would divide by zero.
  const scaleX = content.width > 0 ? availableWidth / content.width : maxZoom;
  const scaleY = content.height > 0 ? availableHeight / content.height : maxZoom;

  const zoom = clamp(Math.min(scaleX, scaleY), minZoom, maxZoom);

  // Centre the content's midpoint in the viewport.
  const centerX = content.x + content.width / 2;
  const centerY = content.y + content.height / 2;

  return {
    zoom,
    x: viewport.width / 2 - centerX * zoom,
    y: viewport.height / 2 - centerY * zoom,
  };
}

/** Resize handle positions (FRONTEND_SPEC.md §13). */
export const RESIZE_HANDLES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const;
export type ResizeHandle = (typeof RESIZE_HANDLES)[number];

/** Smallest a note may be resized to, in canvas units. */
export const MIN_NOTE_SIZE: Size = { width: 140, height: 100 };

/**
 * Applies a resize drag to a rectangle.
 *
 * Dragging a north or west handle moves the note's origin as well as its size,
 * which is why this cannot be a simple width/height addition. The minimum size
 * is enforced by pinning the opposite edge, so a note being shrunk from the
 * left stops rather than flipping inside out.
 *
 * @param rect   The note's current rectangle, in canvas space.
 * @param handle Which handle is being dragged.
 * @param delta  Pointer movement so far, in canvas space.
 */
export function resizeRect(
  rect: Rect,
  handle: ResizeHandle,
  delta: Point,
): Rect {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;

  let { x, y, width, height } = rect;

  if (handle.includes("w")) {
    x = Math.min(rect.x + delta.x, right - MIN_NOTE_SIZE.width);
    width = right - x;
  }

  if (handle.includes("e")) {
    width = Math.max(rect.width + delta.x, MIN_NOTE_SIZE.width);
  }

  if (handle.includes("n")) {
    y = Math.min(rect.y + delta.y, bottom - MIN_NOTE_SIZE.height);
    height = bottom - y;
  }

  if (handle.includes("s")) {
    height = Math.max(rect.height + delta.y, MIN_NOTE_SIZE.height);
  }

  return { x, y, width, height };
}
