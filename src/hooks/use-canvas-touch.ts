"use client";
import { useEffect, type RefObject } from "react";
import { MAX_ZOOM, MIN_ZOOM } from "@/config/layouts";
import { useCanvasStore } from "@/stores/canvas-store";
import { zoomAtPoint } from "@/lib/canvas";
export function useCanvasTouch(surfaceRef: RefObject<HTMLElement | null>, contentRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const surface = surfaceRef.current; if (!surface) return;
    let gesture: { distance: number; x: number; y: number; viewport: { x: number; y: number; zoom: number } } | null = null;
    let pending: { x: number; y: number; zoom: number } | null = null; let frame = 0; let consumed = false;
    const pair = (event: TouchEvent) => { const a = event.touches[0], b = event.touches[1]; if (!a || !b) return null; const rect = surface.getBoundingClientRect(); return { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top, distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) }; };
    const start = (event: TouchEvent) => { if (event.touches.length !== 2) return; const point = pair(event); if (!point) return; event.preventDefault(); consumed = true; window.dispatchEvent(new Event("tackly:cancel-drag")); gesture = { ...point, viewport: useCanvasStore.getState().viewport }; useCanvasStore.getState().setInteracting(true); };
    const move = (event: TouchEvent) => { if (!gesture) return; const point = pair(event); if (!point) return; event.preventDefault(); const zoomed = zoomAtPoint(gesture.viewport, gesture.viewport.zoom * point.distance / Math.max(1, gesture.distance), { x: gesture.x, y: gesture.y }, MIN_ZOOM, MAX_ZOOM); pending = { ...zoomed, x: zoomed.x + point.x - gesture.x, y: zoomed.y + point.y - gesture.y }; if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (pending && contentRef.current) contentRef.current.style.transform = `translate(${pending.x}px, ${pending.y}px) scale(${pending.zoom})`; }); };
    const end = (event: TouchEvent) => { if (gesture && event.touches.length < 2) { cancelAnimationFrame(frame); frame = 0; if (pending) useCanvasStore.getState().setViewport(pending); pending = null; gesture = null; useCanvasStore.getState().setInteracting(false); } if (!event.touches.length) setTimeout(() => { consumed = false; }, 0); };
    const click = (event: MouseEvent) => { if (consumed) { event.preventDefault(); event.stopPropagation(); } };
    surface.addEventListener("touchstart", start, { passive: false }); surface.addEventListener("touchmove", move, { passive: false }); surface.addEventListener("touchend", end); surface.addEventListener("touchcancel", end); surface.addEventListener("click", click, true);
    return () => { cancelAnimationFrame(frame); surface.removeEventListener("touchstart", start); surface.removeEventListener("touchmove", move); surface.removeEventListener("touchend", end); surface.removeEventListener("touchcancel", end); surface.removeEventListener("click", click, true); };
  }, [surfaceRef, contentRef]);
}
