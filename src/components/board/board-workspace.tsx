"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import { Plus } from "lucide-react";
import { useMemo, useRef } from "react";

import { BoardDndContext } from "@/components/board/board-dnd-context";
import { BoardLane } from "@/components/board/board-lane";
import { BoardSettingsItems } from "@/components/board/board-controls";
import { ClayButton } from "@/components/ui/clay-button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CONTEXT_MENU_PRIMITIVES } from "@/components/ui/menu-primitives";
import { MAX_LANES } from "@/config/lanes";
import { matchesFilters } from "@/features/board/filter-notes";
import { sortNotes } from "@/features/board/sort-notes";
import { useLaneActions } from "@/features/board/use-lane-actions";
import { useNoteActions } from "@/features/notes/use-note-actions";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { useHorizontalWheelScroll } from "@/hooks/use-horizontal-wheel-scroll";
import { useLaneStore, selectOrderedLanes } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Note } from "@/types/note";

/**
 * The Board: a row of column panels.
 *
 * Composition rules encoded here:
 *  - The workspace itself is transparent — the background shows through (§53).
 *  - Columns are enclosed, tinted panels separated by `--lane-gap`. This
 *    replaces the open columns and dividers of FRONTEND_SPEC.md §9/§52; see
 *    "Decisions made" in docs/HANDOFF.md.
 *  - Columns hold a practical 280–360px note width and the Board scrolls
 *    horizontally when they no longer fit (§9). The wheel drives that scroll,
 *    so a wide board does not require dragging the scrollbar.
 *
 * Columns come from `useLaneStore` and are the user's own.
 *
 * @example
 * <BoardWorkspace />
 */
export function BoardWorkspace() {
  const canEdit=useCanEditBoard();
  const { tags, categories } = useTaxonomyContext();
  const surfaceRef = useRef<HTMLElement>(null);

  const notes = useNoteStore((state) => state.notes);
  const focusedNoteId = useNoteStore((state) => state.focusedNoteId);
  const lanes = useLaneStore(selectOrderedLanes);
  const renamingLaneId = useLaneStore((state) => state.renamingLaneId);

  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const clearSelection = useSelectionStore((state) => state.clear);

  const sort = useSettingsStore((state) => state.boardSort);
  const showCompleted = useSettingsStore((state) => state.boardShowCompleted);
  const density = useSettingsStore((state) => state.boardDensity);
  const filters = useSettingsStore((state) => state.boardFilters);

  const actions = useNoteActions();
  const laneActions = useLaneActions();

  useHorizontalWheelScroll(surfaceRef);

  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  // One pass over the notes rather than a filter per column, so a large board
  // does not walk the list once per lane.
  const notesByLane = useMemo(() => {
    const grouped = new Map<string, Note[]>(lanes.map((lane) => [lane.id, []]));

    for (const note of notes) {
      if (note.archived || note.deletedAt) continue;
      if (!showCompleted && note.completed) continue;
      // Filters run per note in the same pass, rather than over each lane's
      // list afterwards, so a filtered board still walks the notes once.
      if (!matchesFilters(note, filters)) continue;
      grouped.get(note.laneId)?.push(note);
    }

    for (const [laneId, laneNotes] of grouped) {
      grouped.set(laneId, sortNotes(laneNotes, sort));
    }

    return grouped;
  }, [notes, lanes, sort, showCompleted, filters]);

  return (
    <BoardDndContext>
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <main id="main-content" tabIndex={-1} data-export-surface="true"
          ref={surfaceRef}
          aria-label="Board"
          data-testid="board-workspace"
          className="tk-scrollbar-thin relative z-[var(--z-board)] flex-1 overflow-x-auto overflow-y-hidden"
          onPointerDown={(event) => {
            // Only a click on the board itself deselects. A click that started
            // on a card bubbles up here too, and must not undo the selection
            // the card just made.
            if (event.target === event.currentTarget) clearSelection();
          }}
        >
          <div className="flex h-full min-w-full gap-[var(--lane-gap)] p-4">
            {lanes.map((lane, index) => (
              <BoardLane
                key={lane.id}
                lane={lane}
                notes={notesByLane.get(lane.id) ?? []}
                tagsById={tagsById}
                categoriesById={categoriesById}
                actions={actions}
                laneActions={laneActions}
                renaming={lane.id === renamingLaneId}
                canDelete={lanes.length > 1}
                canMoveLeft={index > 0}
                canMoveRight={index < lanes.length - 1}
                focusedNoteId={focusedNoteId}
                selectedIds={selectedIds}
                density={density}
              />
            ))}

            {lanes.length < MAX_LANES ? (
              <div className="flex shrink-0 items-start">
                <ClayButton
                  variant="ghost"
                  size="md"
                  disabled={!canEdit} onClick={() => laneActions.onAddLane()}
                  className="text-muted-foreground"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add Column
                </ClayButton>
              </div>
            ) : null}
          </div>
        </main>
      </ContextMenuTrigger>

      {/* Right-clicking the board opens its settings, not the browser menu. */}
      <ContextMenuContent className="w-auto min-w-52">
        <BoardSettingsItems ui={CONTEXT_MENU_PRIMITIVES} />
      </ContextMenuContent>
    </ContextMenu>
    </BoardDndContext>
  );
}
