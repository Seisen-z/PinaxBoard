import type { Priority } from "@/types/common";
import type { Note, NoteStyleId } from "@/types/note";

/**
 * Board filters (IMPLEMENTATION_PLAN.md §17; extended in §18).
 *
 * A pure function over a note list, like `sortNotes`. Keeping it out of the
 * component means the combining rules — which are the part that is easy to get
 * subtly wrong — can be tested directly.
 */

export type CompletionFilter = "all" | "complete" | "incomplete";

/**
 * Due-date buckets (IMPLEMENTATION_PLAN.md §18).
 *
 * Buckets rather than a date range picker: the questions people actually ask a
 * board are "what is late" and "what is today", not "what falls between the
 * 4th and the 11th". A range picker can follow if anyone wants one.
 */
export type DueFilter = "any" | "overdue" | "today" | "week" | "scheduled" | "none";

export interface BoardFilters {
  /** Tag ids. A note matches if it carries **any** of them. */
  tagIds: readonly string[];
  /** Category ids. `null` in the list means "uncategorised". */
  categoryIds: readonly (string | null)[];
  /** Priorities. A note matches if its priority is any of them. */
  priorities: readonly Priority[];
  completion: CompletionFilter;
  due: DueFilter;
  /**
   * Note styles — §18 calls this "note type".
   *
   * A style is appearance applied after creation, never a creation-time type
   * (PRODUCT_SPEC.md → "Create First, Customize Afterward"), so this filters on
   * what a note *looks* like. It is the only sense in which Tackly notes have
   * a type at all.
   */
  styles: readonly NoteStyleId[];
}

export const EMPTY_FILTERS: BoardFilters = {
  tagIds: [],
  categoryIds: [],
  priorities: [],
  completion: "all",
  due: "any",
  styles: [],
};

/** True when nothing is being filtered — used to hide the "clear" affordance. */
export function hasActiveFilters(filters: BoardFilters): boolean {
  return (
    filters.tagIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.priorities.length > 0 ||
    filters.completion !== "all" ||
    filters.due !== "any" ||
    filters.styles.length > 0
  );
}

/** How many separate conditions are on, for the toolbar's badge. */
export function activeFilterCount(filters: BoardFilters): number {
  return (
    filters.tagIds.length +
    filters.categoryIds.length +
    filters.priorities.length +
    filters.styles.length +
    (filters.completion === "all" ? 0 : 1) +
    (filters.due === "any" ? 0 : 1)
  );
}

/**
 * Applies the filters to one note.
 *
 * The combining rule is **OR within a facet, AND across facets**: picking two
 * tags widens the result, picking a tag and a priority narrows it. That is what
 * people expect from a filter list, and the opposite choice — AND within a
 * facet — makes selecting a second tag almost always empty the board.
 *
 * An empty facet is not a filter at all, so it matches everything.
 */
export function matchesFilters(
  note: Note,
  filters: BoardFilters,
  now: Date = new Date(),
): boolean {
  if (
    filters.tagIds.length > 0 &&
    !filters.tagIds.some((tagId) => note.tagIds.includes(tagId))
  ) {
    return false;
  }

  if (
    filters.categoryIds.length > 0 &&
    !filters.categoryIds.includes(note.categoryId)
  ) {
    return false;
  }

  if (
    filters.priorities.length > 0 &&
    !filters.priorities.includes(note.priority)
  ) {
    return false;
  }

  if (
    filters.styles.length > 0 &&
    !filters.styles.includes(note.appearance.style)
  ) {
    return false;
  }

  if (filters.completion === "complete" && !note.completed) return false;
  if (filters.completion === "incomplete" && note.completed) return false;

  if (!matchesDue(note, filters.due, now)) return false;

  return true;
}

/**
 * Whether a note falls in a due-date bucket.
 *
 * `now` is passed in rather than read from the clock so the rules are testable
 * without freezing time, and so one filter pass over a board uses a single
 * instant — otherwise a note could land in "today" and the next in "overdue"
 * because the clock ticked between them.
 */
function matchesDue(note: Note, due: DueFilter, now: Date): boolean {
  if (due === "any") return true;
  if (due === "none") return note.dueAt === null;
  if (note.dueAt === null) return false;

  if (due === "scheduled") return true;

  const dueAt = new Date(note.dueAt);
  if (Number.isNaN(dueAt.getTime())) return false;

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  if (due === "overdue") return dueAt.getTime() < now.getTime();

  if (due === "today") {
    // Anything still outstanding today, including what is already late — a
    // "today" list that hides yesterday's overdue task is a list that lets it
    // be forgotten.
    return dueAt.getTime() <= endOfToday.getTime();
  }

  const endOfWeek = new Date(endOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return dueAt.getTime() <= endOfWeek.getTime();
}

export function filterNotes(
  notes: readonly Note[],
  filters: BoardFilters,
  now: Date = new Date(),
): Note[] {
  if (!hasActiveFilters(filters)) return [...notes];

  return notes.filter((note) => matchesFilters(note, filters, now));
}

/** Adds a value to a facet, or removes it if already there. */
export function toggleInList<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}
