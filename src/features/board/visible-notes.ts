import { matchesFilters, type BoardFilters } from "@/features/board/filter-notes";
import { sortNotes } from "@/features/board/sort-notes";
import type { BoardSort } from "@/stores/settings-store";
import type { Note } from "@/types/note";

/** A view projection only: records, ids and canvas coordinates remain untouched. */
export function visibleNotes(
  notes: readonly Note[],
  filters: BoardFilters,
  showCompleted: boolean,
  sort: BoardSort,
  now = new Date(),
): Note[] {
  return sortNotes(notes.filter((note) =>
    !note.archived && !note.deletedAt &&
    (showCompleted || !note.completed) && matchesFilters(note, filters, now),
  ), sort);
}
