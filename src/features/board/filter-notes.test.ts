import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  activeFilterCount,
  filterNotes,
  hasActiveFilters,
  matchesFilters,
  toggleInList,
  type BoardFilters,
} from "@/features/board/filter-notes";
import { createBlankNote } from "@/features/notes/create-note";
import type { Note } from "@/types/note";

/**
 * Board filters (IMPLEMENTATION_PLAN.md §17).
 *
 * The combining rule is the part worth pinning down: OR within a facet, AND
 * across facets. Getting that backwards makes picking a second tag empty the
 * board, which reads as a bug in the data rather than in the filter.
 */

function note(overrides: Partial<Note> = {}): Note {
  return {
    ...createBlankNote({ laneId: "lane-todo", boardId: "board", ownerId: "owner" }),
    ...overrides,
  };
}

const filters = (overrides: Partial<BoardFilters> = {}): BoardFilters => ({
  ...EMPTY_FILTERS,
  ...overrides,
});

describe("no filters", () => {
  it("matches everything", () => {
    expect(matchesFilters(note(), EMPTY_FILTERS)).toBe(true);
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it("returns a copy rather than the original array", () => {
    // The board memoizes on this result; handing back the input would let a
    // later sort mutate the store's list.
    const notes = [note()];
    const result = filterNotes(notes, EMPTY_FILTERS);

    expect(result).toEqual(notes);
    expect(result).not.toBe(notes);
  });
});

describe("tags — OR within the facet", () => {
  const tagged = note({ tagIds: ["a"] });

  it("matches a note carrying any selected tag", () => {
    expect(matchesFilters(tagged, filters({ tagIds: ["a"] }))).toBe(true);
    expect(matchesFilters(tagged, filters({ tagIds: ["a", "b"] }))).toBe(true);
  });

  it("does not require every selected tag", () => {
    // Selecting a second tag must widen the result, not narrow it to notes
    // carrying both.
    const other = note({ tagIds: ["b"] });

    expect(matchesFilters(other, filters({ tagIds: ["a", "b"] }))).toBe(true);
  });

  it("excludes a note with none of them", () => {
    expect(matchesFilters(note({ tagIds: ["z"] }), filters({ tagIds: ["a"] }))).toBe(
      false,
    );
    expect(matchesFilters(note(), filters({ tagIds: ["a"] }))).toBe(false);
  });
});

describe("categories", () => {
  it("matches by id", () => {
    const filed = note({ categoryId: "cat-1" });

    expect(matchesFilters(filed, filters({ categoryIds: ["cat-1"] }))).toBe(true);
    expect(matchesFilters(filed, filters({ categoryIds: ["cat-2"] }))).toBe(false);
  });

  it("treats null as the real choice 'uncategorised'", () => {
    // "Show me what I have not filed yet" is the most useful category filter
    // there is, so `null` is a selectable value rather than an absence.
    const unfiled = note({ categoryId: null });
    const filed = note({ categoryId: "cat-1" });

    expect(matchesFilters(unfiled, filters({ categoryIds: [null] }))).toBe(true);
    expect(matchesFilters(filed, filters({ categoryIds: [null] }))).toBe(false);
  });
});

describe("priority and completion", () => {
  it("matches any selected priority", () => {
    const urgent = note({ priority: "urgent" });

    expect(matchesFilters(urgent, filters({ priorities: ["urgent"] }))).toBe(true);
    expect(matchesFilters(urgent, filters({ priorities: ["low", "urgent"] }))).toBe(
      true,
    );
    expect(matchesFilters(urgent, filters({ priorities: ["low"] }))).toBe(false);
  });

  it.each([
    ["all", true, true],
    ["complete", true, false],
    ["incomplete", false, true],
  ] as const)("completion %s", (completion, keepsDone, keepsOpen) => {
    expect(matchesFilters(note({ completed: true }), filters({ completion }))).toBe(
      keepsDone,
    );
    expect(matchesFilters(note({ completed: false }), filters({ completion }))).toBe(
      keepsOpen,
    );
  });
});

describe("AND across facets", () => {
  it("requires a note to satisfy every active facet", () => {
    const match = note({ tagIds: ["a"], priority: "urgent" });
    const wrongPriority = note({ tagIds: ["a"], priority: "low" });
    const wrongTag = note({ tagIds: ["z"], priority: "urgent" });

    const combined = filters({ tagIds: ["a"], priorities: ["urgent"] });

    expect(matchesFilters(match, combined)).toBe(true);
    expect(matchesFilters(wrongPriority, combined)).toBe(false);
    expect(matchesFilters(wrongTag, combined)).toBe(false);
  });

  it("counts each selection, so the toolbar badge adds up", () => {
    const combined = filters({
      tagIds: ["a", "b"],
      categoryIds: [null],
      priorities: ["urgent"],
      completion: "incomplete",
    });

    expect(activeFilterCount(combined)).toBe(5);
    expect(hasActiveFilters(combined)).toBe(true);
  });
});

describe("toggleInList", () => {
  it("adds what is missing and removes what is there", () => {
    expect(toggleInList(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleInList(["a", "b"], "a")).toEqual(["b"]);
  });

  it("handles null, which categories use for uncategorised", () => {
    expect(toggleInList<string | null>([], null)).toEqual([null]);
    expect(toggleInList<string | null>([null], null)).toEqual([]);
  });
});

describe("due dates (IMPLEMENTATION_PLAN §18)", () => {
  /*
   * Built in **local** time, not UTC.
   *
   * "Due today" means the user's today, so `matchesDue` takes the day boundary
   * from the local clock. Fixing these to UTC instants made the test pass or
   * fail by the machine's timezone — a 18:00Z due time is the next day in
   * Sydney and the previous evening in Los Angeles.
   */
  const now = new Date(2026, 5, 15, 12, 0, 0);
  const at = (date: Date) => note({ dueAt: date.toISOString() });

  const yesterday = at(new Date(2026, 5, 14, 9, 0, 0));
  const earlierToday = at(new Date(2026, 5, 15, 9, 0, 0));
  const laterToday = at(new Date(2026, 5, 15, 18, 0, 0));
  const inThreeDays = at(new Date(2026, 5, 18, 9, 0, 0));
  const nextMonth = at(new Date(2026, 6, 20, 9, 0, 0));
  const undated = note({ dueAt: null });

  it("matches everything when the bucket is 'any'", () => {
    for (const candidate of [yesterday, laterToday, undated]) {
      expect(matchesFilters(candidate, filters({ due: "any" }), now)).toBe(true);
    }
  });

  it("finds what is late", () => {
    expect(matchesFilters(yesterday, filters({ due: "overdue" }), now)).toBe(true);
    expect(matchesFilters(earlierToday, filters({ due: "overdue" }), now)).toBe(true);
    expect(matchesFilters(laterToday, filters({ due: "overdue" }), now)).toBe(false);
    expect(matchesFilters(undated, filters({ due: "overdue" }), now)).toBe(false);
  });

  it("includes overdue work in 'today'", () => {
    // A today list that hides yesterday's overdue task is a list that lets it
    // be forgotten.
    expect(matchesFilters(yesterday, filters({ due: "today" }), now)).toBe(true);
    expect(matchesFilters(laterToday, filters({ due: "today" }), now)).toBe(true);
    expect(matchesFilters(inThreeDays, filters({ due: "today" }), now)).toBe(false);
  });

  it("covers the next seven days", () => {
    expect(matchesFilters(inThreeDays, filters({ due: "week" }), now)).toBe(true);
    expect(matchesFilters(nextMonth, filters({ due: "week" }), now)).toBe(false);
  });

  it("separates dated from undated work", () => {
    expect(matchesFilters(nextMonth, filters({ due: "scheduled" }), now)).toBe(true);
    expect(matchesFilters(undated, filters({ due: "scheduled" }), now)).toBe(false);

    expect(matchesFilters(undated, filters({ due: "none" }), now)).toBe(true);
    expect(matchesFilters(nextMonth, filters({ due: "none" }), now)).toBe(false);
  });

  it("does not crash on an unparseable stored date", () => {
    // `due_at` is a timestamp column, but the store is also hydrated from
    // localStorage, which has held whatever an older build wrote.
    const broken = note({ dueAt: "not a date" });

    expect(matchesFilters(broken, filters({ due: "overdue" }), now)).toBe(false);
  });
});

describe("note style — §18's 'note type'", () => {
  it("matches any selected style", () => {
    const sticky = note();
    const kraft = note({
      appearance: { ...note().appearance, style: "kraft" },
    });

    expect(matchesFilters(sticky, filters({ styles: ["sticky"] }))).toBe(true);
    expect(matchesFilters(kraft, filters({ styles: ["sticky"] }))).toBe(false);
    expect(matchesFilters(kraft, filters({ styles: ["sticky", "kraft"] }))).toBe(true);
  });

  it("counts the new facets in the toolbar badge", () => {
    const combined = filters({ due: "overdue", styles: ["sticky", "kraft"] });

    expect(activeFilterCount(combined)).toBe(3);
    expect(hasActiveFilters(combined)).toBe(true);
  });
});
