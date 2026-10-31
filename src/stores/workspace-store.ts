"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Which workspace and board are open.
 *
 * Selection only — the lists themselves belong to TanStack Query
 * (IMPLEMENTATION_PLAN.md §49). Keeping the records here too would make this a
 * second copy that goes stale the moment another device renames something.
 *
 * Persisted so a reload reopens the board the user was last on rather than
 * dropping them back at the first one.
 */
export interface WorkspaceStoreState {
  activeWorkspaceId: string | null;
  activeBoardId: string | null;

  setActiveWorkspace: (workspaceId: string | null) => void;
  setActiveBoard: (boardId: string | null) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      activeBoardId: null,

      setActiveWorkspace: (activeWorkspaceId) => {
        // Switching workspace invalidates the board choice: a board id from
        // the old workspace would select nothing, leaving a blank surface.
        set({ activeWorkspaceId, activeBoardId: null });
      },

      setActiveBoard: (activeBoardId) => set({ activeBoardId }),

      reset: () => set({ activeWorkspaceId: null, activeBoardId: null }),
    }),
    {
      name: "tackly:active-workspace",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      skipHydration: true,
    },
  ),
);
