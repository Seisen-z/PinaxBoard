import { describe, expect, it } from "vitest";

import { SEARCH_RESULT_LIMIT, search } from "@/features/search/search";
import { createBlankNote } from "@/features/notes/create-note";
import type { Board } from "@/types/board";
import type { Category, Note, Tag } from "@/types/note";
import type { Workspace } from "@/types/workspace";

/**
 * Workspace search (IMPLEMENTATION_PLAN.md §18).
 *
 * The ranking is the part worth pinning down: §18 asks search to cover six
 * surfaces, and which one matched is what decides whether the right thing is
 * at the top.
 */

function note(overrides: Partial<Note> = {}): Note {
  return {
    ...createBlankNote({ laneId: "lane-todo", boardId: "board", ownerId: "owner" }),
    ...overrides,
  };
}

const tag = (id: string, name: string): Tag => ({
  id,
  workspaceId: "ws",
  name,
  color: null,
});

const category = (id: string, name: string): Category => ({
  id,
  workspaceId: "ws",
  name,
  color: null,
  icon: null,
  emoji: null,
});

const EMPTY = { notes: [], tags: [], categories: [], boards: [], workspaces: [] };

describe("the empty query", () => {
  it("returns nothing rather than everything", () => {
    // An empty palette listing the whole workspace is noise, not a result.
    expect(search("", { ...EMPTY, notes: [note({ title: "Venue" })] })).toEqual([]);
    expect(search("   ", { ...EMPTY, notes: [note({ title: "Venue" })] })).toEqual([]);
  });
});

describe("matching notes", () => {
  it("finds a note by title, ignoring case", () => {
    const results = search("venue", {
      ...EMPTY,
      notes: [note({ id: "n1", title: "Book the Venue" })],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: "note", id: "n1", title: "Book the Venue" });
  });

  it("finds a note by its body text", () => {
    const results = search("caterer", {
      ...EMPTY,
      notes: [note({ id: "n1", title: "Venue", excerpt: "Call the caterer back" })],
    });

    expect(results).toHaveLength(1);
    // The subtitle shows where the term appeared, not a generic label.
    expect(results[0]?.subtitle).toContain("caterer");
  });

  it("finds a note by one of its tags, and says so", () => {
    const results = search("urgent", {
      ...EMPTY,
      notes: [note({ id: "n1", title: "Venue", tagIds: ["t1"] })],
      tags: [tag("t1", "urgent")],
    });

    expect(results[0]?.subtitle).toBe("Tagged “urgent”");
  });

  it("finds a note by its category, and says so", () => {
    const results = search("admin", {
      ...EMPTY,
      notes: [note({ id: "n1", title: "Venue", categoryId: "c1" })],
      categories: [category("c1", "Admin")],
    });

    expect(results[0]?.subtitle).toBe("In “Admin”");
  });

  it("skips archived and deleted notes", () => {
    // Search is for what you are working on; Trash gets its own surface.
    const results = search("venue", {
      ...EMPTY,
      notes: [
        note({ id: "n1", title: "Venue", archived: true }),
        note({ id: "n2", title: "Venue", deletedAt: new Date().toISOString() }),
      ],
    });

    expect(results).toEqual([]);
  });

  it("names an untitled note rather than returning a blank row", () => {
    const results = search("untitled", {
      ...EMPTY,
      notes: [note({ id: "n1", title: "" })],
    });

    expect(results[0]?.title).toBe("Untitled note");
  });
});

describe("ranking", () => {
  it("puts an exact title above a prefix, above a partial, above the body", () => {
    const results = search("plan", {
      ...EMPTY,
      notes: [
        note({ id: "body", title: "Something", excerpt: "the plan is ready" }),
        note({ id: "partial", title: "The plan B" }),
        note({ id: "prefix", title: "Plan the week" }),
        note({ id: "exact", title: "Plan" }),
      ],
    });

    expect(results.map((result) => result.id)).toEqual([
      "exact",
      "prefix",
      "partial",
      "body",
    ]);
  });

  it("ranks a title match above a tag match", () => {
    // Searching a word almost always means the thing called that word.
    const results = search("design", {
      ...EMPTY,
      notes: [
        note({ id: "tagged", title: "Venue", tagIds: ["t1"] }),
        note({ id: "titled", title: "Design review" }),
      ],
      tags: [tag("t1", "design")],
    });

    expect(results[0]?.id).toBe("titled");
  });

  it("reports a note once, by its strongest match", () => {
    // A note whose title *and* tag match must not appear twice.
    const results = search("design", {
      ...EMPTY,
      notes: [note({ id: "n1", title: "Design review", tagIds: ["t1"] })],
      tags: [tag("t1", "design")],
    });

    expect(results).toHaveLength(1);
  });

  it("caps the list so the palette stays scannable", () => {
    const notes = Array.from({ length: SEARCH_RESULT_LIMIT + 10 }, (_, index) =>
      note({ id: `n${index}`, title: `Plan ${index}` }),
    );

    expect(search("plan", { ...EMPTY, notes })).toHaveLength(SEARCH_RESULT_LIMIT);
  });
});

describe("boards and workspaces", () => {
  const board: Board = {
    id: "b1",
    workspaceId: "ws",
    name: "Launch board",
  } as Board;

  const workspace: Workspace = {
    id: "ws",
    name: "Launch workspace",
  } as Workspace;

  it("finds a board by name", () => {
    const results = search("launch board", { ...EMPTY, boards: [board] });

    expect(results[0]).toMatchObject({ kind: "board", id: "b1", subtitle: "Board" });
  });

  it("finds a workspace by name", () => {
    const results = search("launch workspace", { ...EMPTY, workspaces: [workspace] });

    expect(results[0]).toMatchObject({
      kind: "workspace",
      id: "ws",
      subtitle: "Workspace",
    });
  });

  it("returns notes, boards and workspaces together", () => {
    const results = search("launch", {
      ...EMPTY,
      notes: [note({ id: "n1", title: "Launch checklist" })],
      boards: [board],
      workspaces: [workspace],
    });

    expect(new Set(results.map((result) => result.kind))).toEqual(
      new Set(["note", "board", "workspace"]),
    );
  });
});
