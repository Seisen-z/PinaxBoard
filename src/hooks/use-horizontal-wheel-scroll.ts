"use client";

import { useEffect, type RefObject } from "react";

/**
 * Lets a vertical wheel scroll a horizontally-scrolling element.
 *
 * A mouse wheel only produces `deltaY`, so a column board that scrolls
 * sideways cannot be scrolled with the wheel at all — the user is left
 * dragging the scrollbar. Trackpads already emit `deltaX` and are untouched.
 *
 * The tricky part is that the columns themselves scroll vertically. Blindly
 * converting every wheel event would trap a long column: the pointer sits over
 * a scrollable list, and the page pans sideways instead of scrolling it. So
 * the wheel is only redirected when nothing under the pointer can absorb the
 * vertical scroll.
 *
 * @param ref       The horizontally-scrolling container.
 * @param enabled   Set false to detach — for a surface that owns the wheel
 *                  itself, such as Canvas Mode.
 *
 * @example
 * const boardRef = useRef<HTMLElement>(null);
 * useHorizontalWheelScroll(boardRef);
 */
export function useHorizontalWheelScroll(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const onWheel = (event: WheelEvent) => {
      // Ctrl/Cmd + wheel is the browser's zoom gesture; leave it alone.
      if (event.ctrlKey || event.metaKey) return;

      // A trackpad's horizontal swipe already works — don't double-handle it.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.deltaY === 0) return;

      if (canScrollVertically(event.target, element, event.deltaY)) return;

      // Nothing under the pointer wants the vertical scroll, so spend it
      // sideways instead of letting the page do nothing.
      const { scrollLeft, scrollWidth, clientWidth } = element;
      const atStart = scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 1 && event.deltaY > 0;

      // At either end, let the event through so an outer scroller (or the
      // page) can still respond rather than the gesture dying silently.
      if (atStart || atEnd) return;

      event.preventDefault();
      element.scrollLeft += event.deltaY;
    };

    // Non-passive: the handler calls preventDefault().
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [ref, enabled]);
}

/**
 * Whether anything between `target` and `container` can still scroll
 * vertically in the direction of `delta`.
 */
function canScrollVertically(
  target: EventTarget | null,
  container: HTMLElement,
  delta: number,
): boolean {
  let node = target instanceof HTMLElement ? target : null;

  while (node && node !== container) {
    const style = getComputedStyle(node);
    const scrollable =
      style.overflowY === "auto" || style.overflowY === "scroll";

    if (scrollable && node.scrollHeight > node.clientHeight) {
      const atTop = node.scrollTop <= 0;
      const atBottom =
        node.scrollTop + node.clientHeight >= node.scrollHeight - 1;

      // Room left in the direction being scrolled.
      if ((delta < 0 && !atTop) || (delta > 0 && !atBottom)) return true;
    }

    node = node.parentElement;
  }

  return false;
}
