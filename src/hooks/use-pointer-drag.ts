"use client";

import { useCallback, useEffect, useRef } from "react";

import type { Point } from "@/lib/canvas";

export interface PointerDragState {
  /** Where the gesture started, in client coordinates. */
  origin: Point;
  /** Latest pointer position, in client coordinates. */
  current: Point;
  /** `current - origin`, in client pixels. */
  delta: Point;
  /** Modifier keys as of the event that produced this state. */
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export interface PointerDragHandlers {
  /**
   * Return `false` to reject the gesture — a locked note, or a secondary
   * mouse button.
   */
  onStart?: (state: PointerDragState, event: React.PointerEvent) => boolean | void;
  /**
   * Called at most once per animation frame with the latest pointer position.
   *
   * Write directly to the DOM here. Do **not** call `setState` or a store
   * action: this runs up to 60 times a second, and routing it through React
   * would re-render the board on every frame (FRONTEND_SPEC.md §76–§77).
   */
  onMove?: (state: PointerDragState) => void;
  /** Called once when the gesture ends. Commit the result to the store here. */
  onEnd?: (state: PointerDragState) => void;
  /** Called instead of `onEnd` when the gesture is cancelled. */
  onCancel?: () => void;
}

/**
 * A pointer drag that reports movement on animation frames.
 *
 * Implements the canvas save rule (FRONTEND_SPEC.md §77):
 *
 * ```text
 * pointerdown → local interaction → requestAnimationFrame transform updates
 *             → pointerup → commit final state
 * ```
 *
 * Pointer events fire faster than the display refreshes, so raw `pointermove`
 * handling does redundant work and can tear. Coalescing into one frame keeps a
 * drag at one DOM write per frame no matter how chatty the device is.
 *
 * The pointer is captured on the element that starts the gesture, so a fast
 * drag that leaves the element — or the window — keeps tracking, and the
 * gesture still ends correctly.
 *
 * @example
 * const startDrag = usePointerDrag({
 *   onMove: (state) => { el.current.style.transform = `translate(${state.delta.x}px, 0)`; },
 *   onEnd: (state) => commit(state.delta),
 * });
 *
 * <div onPointerDown={startDrag} />
 */
export function usePointerDrag(handlers: PointerDragHandlers) {
  // Held in a ref so a re-render mid-gesture cannot swap the handlers out from
  // under an in-flight drag. Written in an effect rather than during render:
  // mutating a ref while rendering is unsafe under concurrent React, which may
  // render a component without committing it.
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  const frameRef = useRef<number | null>(null);
  const stateRef = useRef<PointerDragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  // A drag in flight when the component unmounts would otherwise leak its
  // listeners and its pending frame.
  useEffect(() => {
    return () => {
      cancelFrame();
      cleanupRef.current?.();
    };
  }, [cancelFrame]);

  return useCallback(
    (event: React.PointerEvent) => {
      const origin = { x: event.clientX, y: event.clientY };

      const initial: PointerDragState = {
        origin,
        current: origin,
        delta: { x: 0, y: 0 },
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
      };

      if (handlersRef.current.onStart?.(initial, event) === false) return;

      stateRef.current = initial;

      const target = event.currentTarget;
      const pointerId = event.pointerId;

      // Capture so the gesture survives the pointer leaving the element.
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // Safari throws for a pointer that has already been released. The
        // window listeners below still deliver the rest of the gesture.
      }

      const handleMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;

        const current = { x: moveEvent.clientX, y: moveEvent.clientY };

        stateRef.current = {
          origin,
          current,
          delta: { x: current.x - origin.x, y: current.y - origin.y },
          shiftKey: moveEvent.shiftKey,
          ctrlKey: moveEvent.ctrlKey,
          metaKey: moveEvent.metaKey,
          altKey: moveEvent.altKey,
        };

        // Coalesce: extra moves within the same frame update the state above
        // and are read by the already-scheduled callback.
        if (frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          if (stateRef.current) handlersRef.current.onMove?.(stateRef.current);
        });
      };

      const finish = (ended: boolean) => {
        cleanup();
        cancelFrame();

        const final = stateRef.current;
        stateRef.current = null;

        if (!final) return;

        if (ended) handlersRef.current.onEnd?.(final);
        else handlersRef.current.onCancel?.();
      };

      const handleUp = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== pointerId) return;
        finish(true);
      };

      const handleCancel = (cancelEvent: PointerEvent) => {
        if (cancelEvent.pointerId !== pointerId) return;
        finish(false);
      };

      const cancelGesture = () => finish(false);
      const cleanup = () => {
        window.removeEventListener("tackly:cancel-drag", cancelGesture);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleCancel);
        cleanupRef.current = null;

        try {
          target.releasePointerCapture(pointerId);
        } catch {
          // Already released — nothing to undo.
        }
      };

      cleanupRef.current = cleanup;

      window.addEventListener("tackly:cancel-drag", cancelGesture);
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleCancel);
    },
    [cancelFrame],
  );
}
