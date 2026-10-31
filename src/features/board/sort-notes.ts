import { getPriority } from "@/config/priorities";
import type { BoardSort } from "@/stores/settings-store";
import type { Note } from "@/types/note";

/**
 * Orders the notes within one column (PRODUCT_SPEC.md → "Sorting").
 *
 * Two rules hold for every mode:
 *
 *  - **Pinned notes stay on top.** A pin means "keep this where I can see it",
 *    which a sort must not override (PRODUCT_SPEC.md → "Pinning").
 *  - **The sort is a view, never a rewrite.** Nothing here touches stored
 *    order, so switching back to `manual` restores exactly what the user
 *    arranged by hand.
 *
 * Returns a new array; the input is left alone.
 */
export function sortNotes(notes: readonly Note[], sort: BoardSort): Note[] {
  const ordered = [...notes];

  ordered.sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return compareBy(a, b, sort);
  });

  return ordered;
}

function compareBy(a: Note, b: Note, sort: BoardSort): number {
  switch (sort) {
    case "manual":
      return 0;

    case "created":
      // Newest first — the order people expect from "recent".
      return compareDatesDesc(a.createdAt, b.createdAt);

    case "updated":
      return compareDatesDesc(a.updatedAt, b.updatedAt);

    case "due":
      // Soonest first, and undated notes sink to the bottom rather than
      // crowding the top as if they were overdue.
      return compareDueDates(a.dueAt, b.dueAt);

    case "priority":
      return getPriority(b.priority).rank - getPriority(a.priority).rank;

    case "title":
      // Untitled notes sort as empty strings, which puts them first — which is
      // right, since a blank note is the one just created.
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  }
}

/** Most recent first. Unparseable timestamps sort last rather than throwing. */
function compareDatesDesc(a: string, b: string): number {
  return toTime(b, -Infinity) - toTime(a, -Infinity);
}

/** Soonest first, with undated notes last. */
function compareDueDates(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  return toTime(a, Infinity) - toTime(b, Infinity);
}

function toTime(value: string, fallback: number): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? fallback : time;
}
