import { describe, expect, it } from "vitest";

import {
  MIN_NOTE_SIZE,
  boundingBox,
  canvasToScreen,
  fitToContent,
  rectFromPoints,
  rectsIntersect,
  resizeRect,
  screenDeltaToCanvas,
  screenToCanvas,
  snapPointToGrid,
  snapToGrid,
  zoomAtPoint,
  type Rect,
} from "@/lib/canvas";

const VIEWPORT = { x: 100, y: 50, zoom: 2 };

describe("coordinate conversion", () => {
  it("round-trips a point through canvas and screen space", () => {
    const point = { x: 37, y: -19 };
    const screen = canvasToScreen(point, VIEWPORT);

    expect(screenToCanvas(screen, VIEWPORT)).toEqual(point);
  });

  it("applies the pan offset and the zoom", () => {
    expect(canvasToScreen({ x: 10, y: 10 }, VIEWPORT)).toEqual({
      x: 120,
      y: 70,
    });
  });

  it("scales a delta without adding the pan offset", () => {
    // Using screenToCanvas for a delta is the classic bug — it would add the
    // pan offset to every step of a drag.
    expect(screenDeltaToCanvas({ x: 20, y: 10 }, 2)).toEqual({ x: 10, y: 5 });
  });
});

describe("zoomAtPoint", () => {
  it("keeps the canvas point under the anchor fixed", () => {
    const viewport = { x: 0, y: 0, zoom: 1 };
    const anchor = { x: 300, y: 200 };

    const before = screenToCanvas(anchor, viewport);
    const after = zoomAtPoint(viewport, 2.5, anchor, 0.25, 3);

    expect(screenToCanvas(anchor, after).x).toBeCloseTo(before.x, 8);
    expect(screenToCanvas(anchor, after).y).toBeCloseTo(before.y, 8);
  });

  it("clamps to the zoom bounds", () => {
    const viewport = { x: 0, y: 0, zoom: 1 };

    expect(zoomAtPoint(viewport, 99, { x: 0, y: 0 }, 0.25, 3).zoom).toBe(3);
    expect(zoomAtPoint(viewport, 0.01, { x: 0, y: 0 }, 0.25, 3).zoom).toBe(0.25);
  });
});

describe("snapToGrid", () => {
  it("rounds to the nearest grid line", () => {
    expect(snapToGrid(23, 24)).toBe(24);
    expect(snapToGrid(11, 24)).toBe(0);
    expect(snapToGrid(-13, 24)).toBe(-24);
  });

  it("leaves the value alone when the grid is disabled", () => {
    // A zero grid size must degrade to free placement, not divide by zero and
    // teleport the note to NaN.
    expect(snapToGrid(37, 0)).toBe(37);
    expect(snapToGrid(37, -8)).toBe(37);
  });

  it("returns 0 for a non-finite value rather than propagating it", () => {
    expect(snapToGrid(Number.NaN, 24)).toBe(0);
  });

  it("snaps both axes of a point", () => {
    expect(snapPointToGrid({ x: 23, y: 37 }, 24)).toEqual({ x: 24, y: 48 });
  });
});

describe("rectangles", () => {
  it("builds a rect from corners dragged in any direction", () => {
    const forward = rectFromPoints({ x: 10, y: 10 }, { x: 40, y: 30 });
    const backward = rectFromPoints({ x: 40, y: 30 }, { x: 10, y: 10 });

    expect(forward).toEqual({ x: 10, y: 10, width: 30, height: 20 });
    expect(backward).toEqual(forward);
  });

  it("detects overlap but not mere touching", () => {
    const a: Rect = { x: 0, y: 0, width: 10, height: 10 };

    expect(rectsIntersect(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(rectsIntersect(a, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
    expect(rectsIntersect(a, { x: 20, y: 20, width: 5, height: 5 })).toBe(false);
  });

  it("computes a bounding box, or null for nothing", () => {
    expect(boundingBox([])).toBeNull();
    expect(
      boundingBox([
        { x: 10, y: 10, width: 20, height: 20 },
        { x: 50, y: 0, width: 10, height: 100 },
      ]),
    ).toEqual({ x: 10, y: 0, width: 50, height: 100 });
  });
});

describe("fitToContent", () => {
  const options = { viewport: { width: 1000, height: 600 }, minZoom: 0.25, maxZoom: 3 };

  it("centres the content in the viewport", () => {
    const content: Rect = { x: 0, y: 0, width: 400, height: 200 };
    const next = fitToContent(content, options);
    if (!next) throw new Error("expected a viewport");

    const center = canvasToScreen({ x: 200, y: 100 }, next);
    expect(center.x).toBeCloseTo(500, 6);
    expect(center.y).toBeCloseTo(300, 6);
  });

  it("scales the content down to fit, honouring the padding", () => {
    const next = fitToContent({ x: 0, y: 0, width: 2000, height: 400 }, options);
    if (!next) throw new Error("expected a viewport");

    // 1000 − 2×64 padding = 872 available for 2000 units of content.
    expect(next.zoom).toBeCloseTo(872 / 2000, 6);
  });

  it("clamps rather than zooming below the minimum for very wide content", () => {
    // 872 / 8000 is far below minZoom, so the content stays partly off screen
    // instead of shrinking into illegibility.
    const next = fitToContent({ x: 0, y: 0, width: 8000, height: 400 }, options);
    expect(next?.zoom).toBe(0.25);
  });

  it("clamps to the zoom bounds for very small content", () => {
    const next = fitToContent({ x: 0, y: 0, width: 10, height: 10 }, options);
    expect(next?.zoom).toBe(3);
  });

  it("returns null when there is nothing to frame", () => {
    expect(fitToContent(null, options)).toBeNull();
  });

  it("returns null before the viewport has been measured", () => {
    // Fitting against a 0×0 viewport would produce a nonsense zoom on the
    // first render, so the caller is told to leave the view alone.
    expect(
      fitToContent(
        { x: 0, y: 0, width: 100, height: 100 },
        { ...options, viewport: { width: 0, height: 0 } },
      ),
    ).toBeNull();
  });

  it("survives a zero-sized content box", () => {
    const next = fitToContent({ x: 5, y: 5, width: 0, height: 0 }, options);
    expect(next?.zoom).toBe(3);
  });
});

describe("resizeRect", () => {
  const rect: Rect = { x: 100, y: 100, width: 200, height: 200 };

  it("grows from the south-east handle without moving the origin", () => {
    expect(resizeRect(rect, "se", { x: 50, y: 30 })).toEqual({
      x: 100,
      y: 100,
      width: 250,
      height: 230,
    });
  });

  it("moves the origin when dragging a north-west handle", () => {
    expect(resizeRect(rect, "nw", { x: 20, y: 40 })).toEqual({
      x: 120,
      y: 140,
      width: 180,
      height: 160,
    });
  });

  it("constrains a single axis for edge handles", () => {
    expect(resizeRect(rect, "e", { x: 40, y: 999 })).toEqual({
      x: 100,
      y: 100,
      width: 240,
      height: 200,
    });
  });

  it("stops at the minimum size instead of inverting", () => {
    const squashed = resizeRect(rect, "se", { x: -9999, y: -9999 });

    expect(squashed.width).toBe(MIN_NOTE_SIZE.width);
    expect(squashed.height).toBe(MIN_NOTE_SIZE.height);
  });

  it("pins the opposite edge when a west drag hits the minimum", () => {
    // Dragging the west handle past the minimum must stop the origin, not
    // flip the note through itself.
    const squashed = resizeRect(rect, "w", { x: 9999, y: 0 });

    expect(squashed.width).toBe(MIN_NOTE_SIZE.width);
    expect(squashed.x + squashed.width).toBe(rect.x + rect.width);
  });
});
