"use client";

import { create } from "zustand";

import type { SyncStatus } from "@/types/common";

/**
 * Autosave status (PRODUCT_SPEC.md → "Auto Save").
 *
 * Interaction state, never persisted: a reload starts from whatever the server
 * actually has, so carrying "Sync Error" across a refresh would be a lie.
 */
export interface SyncStoreState {
  status: SyncStatus;
  /** Set when the last write failed, for the retry affordance. */
  error: string | null;
  /** When the last successful write completed. */
  lastSavedAt: string | null;
  /** Number of records waiting to be written. */
  pendingCount: number;

  setSaving: (pendingCount: number) => void;
  setSaved: () => void;
  setError: (message: string) => void;
  setOffline: () => void;
  setIdle: () => void;
}

export const useSyncStore = create<SyncStoreState>()((set) => ({
  status: "saved",
  error: null,
  lastSavedAt: null,
  pendingCount: 0,

  setSaving: (pendingCount) => set({ status: "saving", pendingCount, error: null }),

  setSaved: () =>
    set({
      status: "saved",
      error: null,
      pendingCount: 0,
      lastSavedAt: new Date().toISOString(),
    }),

  // The failed records stay dirty, so `pendingCount` is left alone — it is the
  // size of the backlog, not of the attempt that just failed.
  setError: (error) => set({ status: "error", error }),

  setOffline: () => set({ status: "offline", error: null }),

  setIdle: () => set({ status: "saved", error: null, pendingCount: 0 }),
}));
