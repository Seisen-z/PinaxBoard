import { beforeEach, describe, expect, it } from "vitest";

import { MAX_ZOOM, MIN_ZOOM } from "@/config/layouts";
import { screenToCanvas } from "@/lib/canvas";
import {
  DEFAULT_GRID_SIZE,
  DEFAULT_VIEWPORT,
  useCanvasStore,
} from "@/stores/canvas-store";

const store = () => useCanvasStore.getState();

beforeEach(() => {
  useCanvasStore.setState({
    viewport: DEFAULT_VIEWPORT,
    gridMode: "dot",
    gridSize: DEFAULT_GRID_SIZE,
    snapToGrid: false,
    interacting: false,
    viewportSize: { width: 1000, height: 600 },
  });
});

describe("viewport", () => {
  it("pans by a screen-space delta", () => {
    store().panBy({ x: 40, y: -20 });
    expect(store().viewport).toMatchObject({ x: 40, y: -20 });
  });

  it("accumulates successive pans", () => {
    store().panBy({ x: 10, y: 10 });
    store().panBy({ x: 5, y: -30 });

    expect(store().viewport).toMatchObject({ x: 15, y: -20 });
  });

  it("clamps zoom set directly through setViewport", () => {
    store().setViewport({ x: 0, y: 0, zoom: 99 });
    expect(store().viewport.zoom).toBe(MAX_ZOOM);

    store().setViewport({ x: 0, y: 0, zoom: 0.001 });
    expect(store().viewport.zoom).toBe(MIN_ZOOM);
  });

  it("zooms around an anchor, keeping the point under it fixed", () => {
    const anchor = { x: 400, y: 300 };
    const before = screenToCanvas(anchor, store().viewport);

    store().zoomBy(2, anchor);

    const after = screenToCanvas(anchor, store().viewport);
    expect(after.x).toBeCloseTo(before.x, 8);
    expect(after.y).toBeCloseTo(before.y, 8);
    expect(store().viewport.zoom).toBe(2);
  });

  it("resets to the default viewport", () => {
    store().panBy({ x: 300, y: 300 });
    store().zoomBy(2, { x: 0, y: 0 });

    store().resetViewport();
    expect(store().viewport).toEqual(DEFAULT_VIEWPORT);
  });
});

describe("fitTo", () => {
  it("frames the given content", () => {
    store().fitTo({ x: 0, y: 0, width: 2000, height: 1000 }, { width: 1000, height: 600 });

    expect(store().viewport.zoom).toBeLessThan(1);
  });

  it("leaves the viewport alone when there is nothing to frame", () => {
    store().panBy({ x: 42, y: 42 });
    const before = store().viewport;

    store().fitTo(null, { width: 1000, height: 600 });
    expect(store().viewport).toEqual(before);
  });

  it("leaves the viewport alone before the canvas has been measured", () => {
    const before = store().viewport;

    store().fitTo({ x: 0, y: 0, width: 500, height: 500 }, { width: 0, height: 0 });
    expect(store().viewport).toEqual(before);
  });
});

describe("grid", () => {
  it("switches grid mode", () => {
    store().setGridMode("line");
    expect(store().gridMode).toBe("line");

    store().setGridMode("off");
    expect(store().gridMode).toBe("off");
  });

  it("clamps the grid size to a usable range", () => {
    store().setGridSize(1);
    expect(store().gridSize).toBe(4);

    store().setGridSize(9999);
    expect(store().gridSize).toBe(200);
  });

  it("toggles snapping", () => {
    store().setSnapToGrid(true);
    expect(store().snapToGrid).toBe(true);
  });
});

describe("viewportSize", () => {
  it("publishes a new size", () => {
    store().setViewportSize({ width: 800, height: 400 });
    expect(store().viewportSize).toEqual({ width: 800, height: 400 });
  });

  it("ignores an identical size", () => {
    const before = store().viewportSize;
    store().setViewportSize({ ...before });

    // ResizeObserver fires on every layout pass; republishing would re-render
    // every subscriber for nothing.
    expect(store().viewportSize).toBe(before);
  });
});
