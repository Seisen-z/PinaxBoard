"use client";

import { create } from "zustand";

/**
 * Which notes are currently selected (IMPLEMENTATION_PLAN.md §9, §10).
 *
 * Kept separate from `useNoteStore` on purpose: selection changes far more
 * often than note data, and a component that only cares about "am I selected"
 * should not re-render when an unrelated note's title changes.
 *
 * Selection is stored as a `Set` for O(1) membership — a canvas hit-test runs
 * this check once per note per frame.
 */

/** How a new selection combines with the current one (PRODUCT_SPEC.md → Multi-Select). */
export type SelectionMode =
  /** Plain click — replaces the selection. */
  | "replace"
  /** Ctrl/Cmd + click — adds or removes one note. */
  | "toggle"
  /** Shift + click / drag rectangle — adds without removing. */
  | "add";

export interface SelectionStoreState {
  selectedIds: ReadonlySet<string>;
  select: (noteId: string, mode?: SelectionMode) => void;
  selectMany: (noteIds: readonly string[], mode?: SelectionMode) => void;
  deselect: (noteId: string) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionStoreState>()((set) => ({
  selectedIds: new Set<string>(),

  select: (noteId, mode = "replace") => {
    set((state) => {
      if (mode === "replace") return { selectedIds: new Set([noteId]) };

      const next = new Set(state.selectedIds);
      if (mode === "toggle" && next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }

      return { selectedIds: next };
    });
  },

  selectMany: (noteIds, mode = "replace") => {
    set((state) => {
      const next = mode === "replace" ? new Set<string>() : new Set(state.selectedIds);
      for (const id of noteIds) next.add(id);
      return { selectedIds: next };
    });
  },

  deselect: (noteId) => {
    set((state) => {
      if (!state.selectedIds.has(noteId)) return state;

      const next = new Set(state.selectedIds);
      next.delete(noteId);
      return { selectedIds: next };
    });
  },

  clear: () => {
    set((state) =>
      // Avoid publishing a new empty Set when the selection is already empty.
      state.selectedIds.size === 0 ? state : { selectedIds: new Set<string>() },
    );
  },
}));

/**
 * Subscribes to one note's selected state.
 *
 * Returns a boolean, so a card only re-renders when *its own* selection
 * changes — not whenever any other note is selected.
 *
 * @example
 * const isSelected = useIsNoteSelected(note.id);
 */
export function useIsNoteSelected(noteId: string): boolean {
  return useSelectionStore((state) => state.selectedIds.has(noteId));
}
