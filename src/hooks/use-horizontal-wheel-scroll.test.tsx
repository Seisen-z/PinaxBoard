import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";

import { useHorizontalWheelScroll } from "@/hooks/use-horizontal-wheel-scroll";

/**
 * jsdom does not lay out or scroll, so the element's scroll geometry is
 * defined explicitly. What is under test is the decision — when to convert a
 * vertical wheel into horizontal scrolling — not the browser's scrolling.
 */
function Harness({
  laneScrollable = false,
  scrollLeft = 100,
}: {
  laneScrollable?: boolean;
  scrollLeft?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(ref);

  return (
    <div
      ref={(node) => {
        if (!node) return;
        ref.current = node;
        define(node, { scrollWidth: 2000, clientWidth: 800, scrollLeft });
      }}
      data-testid="board"
      style={{ overflowX: "auto" }}
    >
      <div
        data-testid="lane"
        style={{ overflowY: laneScrollable ? "auto" : "visible" }}
        ref={(node) => {
          if (!node) return;
          define(node, {
            scrollHeight: laneScrollable ? 2000 : 100,
            clientHeight: 100,
            scrollTop: laneScrollable ? 50 : 0,
          });
        }}
      >
        <span data-testid="card">card</span>
      </div>
    </div>
  );
}

/** Gives a jsdom element the scroll geometry it otherwise always reports as 0. */
function define(node: HTMLElement, values: Record<string, number>) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(node, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
}

describe("useHorizontalWheelScroll", () => {
  it("scrolls the container sideways on a vertical wheel", () => {
    render(<Harness />);
    const board = screen.getByTestId("board");

    fireEvent.wheel(board, { deltaY: 120, deltaX: 0 });

    // A mouse wheel only produces deltaY, so without this a wide board cannot
    // be scrolled at all without dragging the scrollbar.
    expect(board.scrollLeft).toBe(220);
  });

  it("leaves the wheel alone when a column can still scroll vertically", () => {
    render(<Harness laneScrollable />);
    const board = screen.getByTestId("board");

    fireEvent.wheel(screen.getByTestId("card"), { deltaY: 120, deltaX: 0 });

    // Otherwise a long column becomes unreadable: the pointer sits over a
    // scrollable list and the board pans sideways instead.
    expect(board.scrollLeft).toBe(100);
  });

  it("ignores a trackpad's horizontal swipe, which already works", () => {
    render(<Harness />);
    const board = screen.getByTestId("board");

    fireEvent.wheel(board, { deltaY: 10, deltaX: 120 });
    expect(board.scrollLeft).toBe(100);
  });

  it("ignores Ctrl+wheel, which is the browser's zoom gesture", () => {
    render(<Harness />);
    const board = screen.getByTestId("board");

    fireEvent.wheel(board, { deltaY: 120, deltaX: 0, ctrlKey: true });
    expect(board.scrollLeft).toBe(100);
  });

  it("lets the event through at the start of the scroll range", () => {
    render(<Harness scrollLeft={0} />);
    const board = screen.getByTestId("board");

    fireEvent.wheel(board, { deltaY: -120, deltaX: 0 });
    expect(board.scrollLeft).toBe(0);
  });

  it("lets the event through at the end of the scroll range", () => {
    render(<Harness scrollLeft={1200} />);
    const board = screen.getByTestId("board");

    fireEvent.wheel(board, { deltaY: 120, deltaX: 0 });
    expect(board.scrollLeft).toBe(1200);
  });

  it("does nothing for a wheel event with no vertical delta", () => {
    render(<Harness />);
    const board = screen.getByTestId("board");

    fireEvent.wheel(board, { deltaY: 0, deltaX: 0 });
    expect(board.scrollLeft).toBe(100);
  });
});
