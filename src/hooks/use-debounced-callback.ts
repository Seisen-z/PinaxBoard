"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export interface DebouncedCallback {
  /** Schedules the callback, restarting the delay. */
  schedule: () => void;
  /** Runs the pending call immediately, if there is one. */
  flush: () => void;
  /** Drops the pending call. */
  cancel: () => void;
  /** Whether a call is waiting. */
  isPending: () => boolean;
}

/**
 * Defers a callback until `delay` ms have passed without another call.
 *
 * This is the autosave primitive (IMPLEMENTATION_PLAN.md §50): an edit updates
 * local state immediately, and only the quiet moment afterwards reaches the
 * network. Saving per keystroke would be both slow and, at Supabase's rate
 * limits, self-defeating.
 *
 * `flush` exists because a debounce that only fires on a timer loses the last
 * edit when the tab closes — the sync engine calls it when the page is hidden.
 *
 * The callback is held in a ref and updated in an effect, so a re-render
 * between calls cannot leave a stale closure scheduled.
 *
 * Returns an object rather than a callable function: attaching methods to a
 * function with `Object.assign` during render reads refs mid-render, which is
 * unsafe under concurrent React.
 *
 * @example
 * const save = useDebouncedCallback(() => persist(), 600);
 * save.schedule();
 * save.flush();     // runs now, if pending
 */
export function useDebouncedCallback(
  callback: () => void,
  delay: number,
): DebouncedCallback {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current === null) return;

    cancel();
    callbackRef.current();
  }, [cancel]);

  const isPending = useCallback(() => timerRef.current !== null, []);

  const schedule = useCallback(() => {
    cancel();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      callbackRef.current();
    }, delay);
  }, [cancel, delay]);

  // A pending save on unmount is still a save the user is owed, so it runs
  // rather than being dropped.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        callbackRef.current();
      }
    };
  }, []);

  return useMemo(
    () => ({ schedule, flush, cancel, isPending }),
    [schedule, flush, cancel, isPending],
  );
}
