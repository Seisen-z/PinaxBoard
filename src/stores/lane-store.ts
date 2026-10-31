"use client";

import { create } from "zustand";
import { guardBoardActions } from "@/features/collaboration/access";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_LANE_COLOR,
  DEFAULT_LANE_SEEDS,
  MAX_LANES,
  UNTITLED_LANE_NAME,
} from "@/config/lanes";
import { MOCK_BOARD_ID } from "@/features/board/board-identity";
import { createId } from "@/lib/utils";
import type { Lane } from "@/types/lane";

/**
 * The board's columns.
 *
 * Lanes are user data: created, renamed, recoloured, reordered and deleted
 * from the UI. The five seeds below exist so a new board is not blank â€” they
 * carry no special status once created.
 *
 * Kept in its own store rather than folded into `useNoteStore` because lanes
 * change rarely and notes change constantly; a lane header should not
 * re-render every time a note's title is edited.
 */
export interface LaneStoreState {
  lanes: Lane[];
  /** Creation context for an empty cloud board; travels with reset records. */
  boardId: string;
  /** Id of a lane whose header should enter rename mode. */
  renamingLaneId: string | null;

  addLane: (name?: string) => string;
  renameLane: (laneId: string, name: string) => void;
  setLaneColor: (laneId: string, color: string) => void;
  moveLane: (laneId: string, direction: "left" | "right") => void;
  /**
   * Removes a lane. Returns the ids of notes that need rehoming, so the
   * caller can move or delete them â€” this store never reaches into the note
   * store itself.
   */
  removeLane: (laneId: string) => void;

  beginRename: (laneId: string) => void;
  endRename: () => void;

  reset: (lanes: readonly Lane[], boardId?: string) => void;
}

/** Builds the starting set of lanes for a board. */
export function createDefaultLanes(boardId: string): Lane[] {
  const now = new Date().toISOString();

  return DEFAULT_LANE_SEEDS.map((seed, index) => ({
    id: seed.id,
    boardId,
    name: seed.name,
    color: `var(${seed.colorVar})`,
    position: index,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Sorts by position and re-numbers to 0..n-1.
 *
 * Every mutation that can disturb the order runs through this, which is what
 * lets `selectOrderedLanes` be a plain read rather than a sort â€” see the note
 * on that function.
 */
function renumber(lanes: Lane[]): Lane[] {
  return reindex([...lanes].sort((a, b) => a.position - b.position));
}

/**
 * Re-numbers positions from array order, without sorting first.
 *
 * Used where the array order is already the intended order â€” a reorder, for
 * instance. Running `renumber` there would sort by the *old* positions and
 * undo the move.
 */
function reindex(lanes: Lane[]): Lane[] {
  return lanes.map((lane, index) =>
    lane.position === index ? lane : { ...lane, position: index },
  );
}

export const useLaneStore = create<LaneStoreState>()(
  persist(
    (set, get) => guardBoardActions<LaneStoreState>({
      lanes: createDefaultLanes(MOCK_BOARD_ID),
      boardId: MOCK_BOARD_ID,
      renamingLaneId: null,

      addLane: (name = UNTITLED_LANE_NAME) => {
        const existing = get().lanes;

        // Past a dozen columns the Board stops being scannable and starts
        // being a spreadsheet, so the count is capped.
        if (existing.length >= MAX_LANES) return "";

        const now = new Date().toISOString();
        const lane: Lane = {
          id: createId(),
          boardId: existing[0]?.boardId ?? get().boardId,
          name,
          color: DEFAULT_LANE_COLOR,
          position: existing.length,
          createdAt: now,
          updatedAt: now,
        };

        // A new column opens straight into rename mode â€” the user created it
        // in order to name it.
        set({ lanes: renumber([...existing, lane]), renamingLaneId: lane.id });
        return lane.id;
      },

      renameLane: (laneId, name) => {
        set((state) => ({
          lanes: state.lanes.map((lane) =>
            lane.id === laneId
              ? { ...lane, name, updatedAt: new Date().toISOString() }
              : lane,
          ),
        }));
      },

      setLaneColor: (laneId, color) => {
        set((state) => ({
          lanes: state.lanes.map((lane) =>
            lane.id === laneId
              ? { ...lane, color, updatedAt: new Date().toISOString() }
              : lane,
          ),
        }));
      },

      moveLane: (laneId, direction) => {
        set((state) => {
          const ordered = [...state.lanes].sort((a, b) => a.position - b.position);
          const index = ordered.findIndex((lane) => lane.id === laneId);
          if (index === -1) return state;

          const target = direction === "left" ? index - 1 : index + 1;
          if (target < 0 || target >= ordered.length) return state;

          const moved = ordered[index];
          const displaced = ordered[target];
          if (!moved || !displaced) return state;

          ordered[index] = displaced;
          ordered[target] = moved;

          // `reindex`, not `renumber`: the array order *is* the new order, and
          // sorting by the old positions would undo the swap.
          return { lanes: reindex(ordered) };
        });
      },

      removeLane: (laneId) => {
        set((state) => {
          // A board with no columns has nowhere to put a note, so the last
          // lane cannot be deleted.
          if (state.lanes.length <= 1) return state;

          const remaining = state.lanes.filter((lane) => lane.id !== laneId);
          if (remaining.length === state.lanes.length) return state;

          return {
            lanes: renumber(remaining),
            renamingLaneId:
              state.renamingLaneId === laneId ? null : state.renamingLaneId,
          };
        });
      },

      beginRename: (laneId) => set({ renamingLaneId: laneId }),
      endRename: () => set({ renamingLaneId: null }),

      reset: (lanes, boardId = lanes[0]?.boardId ?? MOCK_BOARD_ID) =>
        set({ lanes: renumber([...lanes]), boardId, renamingLaneId: null }),
    }, () => get().boardId, ["reset","endRename"]),
    {
      name: "tackly:lanes",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // `renamingLaneId` is interaction state â€” persisting it would drop the
      // user into a rename box on reload.
      partialize: (state) => ({ lanes: state.lanes }),
      skipHydration: true,
    },
  ),
);

/**
 * Lanes in display order.
 *
 * `state.lanes` is kept sorted by `renumber()` on every mutation, so this is a
 * plain read. Sorting a copy here instead would return a new array on every
 * call, and a Zustand selector that never returns a stable reference makes
 * `useSyncExternalStore` re-render forever.
 */
export function selectOrderedLanes(state: LaneStoreState): Lane[] {
  return state.lanes;
}

/**
 * The lane a homeless note should fall back to â€” the first column.
 *
 * Returns `null` only when a board somehow has no lanes at all, which the
 * delete guard above should make impossible.
 */
export function firstLaneId(state: LaneStoreState): string | null {
  return selectOrderedLanes(state)[0]?.id ?? null;
}
