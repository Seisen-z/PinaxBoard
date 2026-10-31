import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("scheduling", () => {
  it("does not run before the delay elapses", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    act(() => result.current.schedule());
    act(() => void vi.advanceTimersByTime(599));

    expect(fn).not.toHaveBeenCalled();
  });

  it("runs once the delay elapses", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    act(() => result.current.schedule());
    act(() => void vi.advanceTimersByTime(600));

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("collapses a burst into a single call", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    // The whole point: typing is one save, not one per keystroke.
    for (let i = 0; i < 10; i += 1) {
      act(() => result.current.schedule());
      act(() => void vi.advanceTimersByTime(100));
    }
    act(() => void vi.advanceTimersByTime(600));

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("flush", () => {
  it("runs a pending call immediately", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    act(() => result.current.schedule());
    act(() => result.current.flush());

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does nothing when nothing is pending", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    act(() => result.current.flush());
    expect(fn).not.toHaveBeenCalled();
  });

  it("leaves no timer behind to fire again", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    act(() => result.current.schedule());
    act(() => result.current.flush());
    act(() => void vi.advanceTimersByTime(1000));

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("cancel", () => {
  it("drops the pending call", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    act(() => result.current.schedule());
    act(() => result.current.cancel());
    act(() => void vi.advanceTimersByTime(1000));

    expect(fn).not.toHaveBeenCalled();
  });
});

describe("isPending", () => {
  it("tracks whether a call is waiting", () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 600));

    expect(result.current.isPending()).toBe(false);

    act(() => result.current.schedule());
    expect(result.current.isPending()).toBe(true);

    act(() => void vi.advanceTimersByTime(600));
    expect(result.current.isPending()).toBe(false);
  });
});

describe("latest callback", () => {
  it("runs the most recent callback, not the one captured at schedule time", () => {
    const first = vi.fn();
    const second = vi.fn();

    const { result, rerender } = renderHook(
      ({ fn }) => useDebouncedCallback(fn, 600),
      { initialProps: { fn: first } },
    );

    act(() => result.current.schedule());
    rerender({ fn: second });
    act(() => void vi.advanceTimersByTime(600));

    // A stale closure here would save the state as it was a render ago.
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});

describe("unmount", () => {
  it("runs a pending call rather than dropping it", () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 600));

    act(() => result.current.schedule());
    unmount();

    // A pending save is a save the user is owed.
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does nothing on unmount when nothing is pending", () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useDebouncedCallback(fn, 600));

    unmount();
    expect(fn).not.toHaveBeenCalled();
  });
});
