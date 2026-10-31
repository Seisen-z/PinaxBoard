import { describe, expect, it } from "vitest";

import { sortNotes } from "@/features/board/sort-notes";
import { createBlankNote } from "@/features/notes/create-note";
import type { Note } from "@/types/note";

function note(id: string, overrides: Partial<Note> = {}): Note {
  return {
    ...createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane" }),
    id,
    ...overrides,
  };
}

const ids = (notes: readonly Note[]) => notes.map((n) => n.id);

describe("manual order", () => {
  it("leaves the arrangement alone", () => {
    const input = [note("c"), note("a"), note("b")];
    expect(ids(sortNotes(input, "manual"))).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input", () => {
    const input = [note("c"), note("a")];
    sortNotes(input, "title");

    expect(ids(input)).toEqual(["c", "a"]);
  });
});

describe("pinned notes", () => {
  it("stay on top in every mode", () => {
    const input = [
      note("plain", { title: "A" }),
      note("pinned", { title: "Z", pinned: true }),
    ];

    // A pin means "keep this where I can see it" — a sort must not override it.
    for (const sort of ["title", "created", "priority", "due"] as const) {
      expect(ids(sortNotes(input, sort))[0], sort).toBe("pinned");
    }
  });
});

describe("title", () => {
  it("sorts alphabetically, ignoring case", () => {
    const input = [note("b", { title: "banana" }), note("a", { title: "Apple" })];
    expect(ids(sortNotes(input, "title"))).toEqual(["a", "b"]);
  });

  it("puts an untitled note first", () => {
    // A blank note is the one just created, so the top is where it belongs.
    const input = [note("named", { title: "Apple" }), note("blank", { title: "" })];
    expect(ids(sortNotes(input, "title"))).toEqual(["blank", "named"]);
  });
});

describe("dates", () => {
  it("sorts created newest first", () => {
    const input = [
      note("old", { createdAt: "2026-01-01T00:00:00.000Z" }),
      note("new", { createdAt: "2026-09-01T00:00:00.000Z" }),
    ];
    expect(ids(sortNotes(input, "created"))).toEqual(["new", "old"]);
  });

  it("sorts updated newest first", () => {
    const input = [
      note("stale", { updatedAt: "2026-01-01T00:00:00.000Z" }),
      note("fresh", { updatedAt: "2026-09-01T00:00:00.000Z" }),
    ];
    expect(ids(sortNotes(input, "updated"))).toEqual(["fresh", "stale"]);
  });

  it("sorts due soonest first", () => {
    const input = [
      note("later", { dueAt: "2026-09-10T00:00:00.000Z" }),
      note("sooner", { dueAt: "2026-09-02T00:00:00.000Z" }),
    ];
    expect(ids(sortNotes(input, "due"))).toEqual(["sooner", "later"]);
  });

  it("sinks undated notes below dated ones", () => {
    // Undated notes crowding the top would read as overdue.
    const input = [
      note("undated", { dueAt: null }),
      note("dated", { dueAt: "2026-09-02T00:00:00.000Z" }),
    ];
    expect(ids(sortNotes(input, "due"))).toEqual(["dated", "undated"]);
  });

  it("keeps two undated notes in their existing order", () => {
    const input = [note("a", { dueAt: null }), note("b", { dueAt: null })];
    expect(ids(sortNotes(input, "due"))).toEqual(["a", "b"]);
  });

  it("does not throw on an unparseable timestamp", () => {
    const input = [
      note("bad", { createdAt: "not a date" }),
      note("good", { createdAt: "2026-09-01T00:00:00.000Z" }),
    ];

    expect(() => sortNotes(input, "created")).not.toThrow();
    expect(ids(sortNotes(input, "created"))[0]).toBe("good");
  });
});

describe("priority", () => {
  it("sorts highest first", () => {
    const input = [
      note("low", { priority: "low" }),
      note("urgent", { priority: "urgent" }),
      note("none", { priority: "none" }),
      note("high", { priority: "high" }),
    ];

    expect(ids(sortNotes(input, "priority"))).toEqual([
      "urgent",
      "high",
      "low",
      "none",
    ]);
  });
});
