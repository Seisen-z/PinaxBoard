import { describe, expect, it, vi } from "vitest";

import { laneFromRow, laneToUpdate } from "@/lib/mappers/lane";
import {
  noteFromRow,
  noteToInsert,
  noteToUpdate,
  parseSubtasks,
} from "@/lib/mappers/note";
import type { LaneRow, NoteRow } from "@/types/database";

function row(overrides: Partial<NoteRow> = {}): NoteRow {
  return {
    id: "note-1",
    board_id: "board-1",
    lane_id: "lane-1",
    owner_id: "owner-1",

    title: "Roadmap",
    content: null,
    excerpt: "Draft the plan",

    x: 10,
    y: 20,
    width: 280,
    height: 240,
    rotation: 0,
    z_index: 3,

    note_color: "mint",
    note_style: "lined",
    cover_url: null,

    priority: "high",
    subtasks: [],

    completed: false,
    completed_at: null,
    pinned: false,
    locked: false,
    collapsed: false,
    archived: false,
    on_canvas: false,

    category_id: null,
    start_at: null,
    due_at: null,

    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-02T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

const options = { fallbackLaneId: "lane-fallback" } as const;

describe("noteFromRow", () => {
  it("maps snake_case columns onto the domain shape", () => {
    const note = noteFromRow(row(), options);

    expect(note.boardId).toBe("board-1");
    expect(note.laneId).toBe("lane-1");
    expect(note.transform).toEqual({
      x: 10,
      y: 20,
      width: 280,
      height: 240,
      rotation: 0,
      zIndex: 3,
    });
    expect(note.appearance).toEqual({
      color: "mint",
      style: "lined",
      coverUrl: null,
    });
  });

  it("falls back to a lane when the column has been deleted", () => {
    // `lane_id` is `on delete set null`, so a note briefly has no column.
    const note = noteFromRow(row({ lane_id: null }), options);
    expect(note.laneId).toBe("lane-fallback");
  });

  it("falls back to defaults for values this build does not know", () => {
    const note = noteFromRow(
      row({ note_color: "neon", note_style: "papyrus", priority: "critical" }),
      options,
    );

    // A row written by a newer client must degrade to a plain note, never a
    // blank card.
    expect(note.appearance.color).toBe("cream");
    expect(note.appearance.style).toBe("sticky");
    expect(note.priority).toBe("none");
  });

  it("carries the Canvas placement flag", () => {
    expect(noteFromRow(row(), options).onCanvas).toBe(false);
    expect(noteFromRow(row({ on_canvas: true }), options).onCanvas).toBe(true);
  });

  it("attaches tag ids from the join", () => {
    const note = noteFromRow(row(), { ...options, tagIds: ["tag-a", "tag-b"] });
    expect(note.tagIds).toEqual(["tag-a", "tag-b"]);
  });

  it("copies the tag ids rather than aliasing the caller's array", () => {
    const tagIds = ["tag-a"];
    const note = noteFromRow(row(), { ...options, tagIds });

    tagIds.push("tag-b");
    expect(note.tagIds).toEqual(["tag-a"]);
  });
});

describe("parseSubtasks", () => {
  const valid = [
    { id: "s1", noteId: "note-1", title: "A", completed: false, position: 0 },
  ];

  it("parses a well-formed payload", () => {
    expect(parseSubtasks(valid)).toEqual(valid);
  });

  it("returns an empty list for malformed json rather than throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // A checklist that cannot be read must not stop the note rendering.
    expect(parseSubtasks({ nope: true })).toEqual([]);
    expect(parseSubtasks([{ id: 1 }])).toEqual([]);
    expect(parseSubtasks(null)).toEqual([]);

    warn.mockRestore();
  });
});

describe("noteToInsert", () => {
  it("round-trips through the row shape", () => {
    const note = noteFromRow(row(), options);
    const inserted = noteToInsert(note);

    expect(inserted.board_id).toBe("board-1");
    expect(inserted.lane_id).toBe("lane-1");
    expect(inserted.z_index).toBe(3);
    expect(inserted.note_color).toBe("mint");
  });

  it("round-trips the Canvas placement", () => {
    const note = noteFromRow(row({ on_canvas: true }), options);
    expect(noteToInsert(note).on_canvas).toBe(true);
  });

  it("leaves completed_at null for an open note", () => {
    const note = noteFromRow(row(), options);
    expect(noteToInsert(note).completed_at).toBeNull();
  });
});

describe("noteToUpdate", () => {
  it("emits only the fields that changed", () => {
    // A full-row update would clobber a concurrent edit from another device.
    expect(noteToUpdate({ title: "New" })).toEqual({ title: "New" });
  });

  it("emits the Canvas flag when it changes", () => {
    expect(noteToUpdate({ onCanvas: true })).toEqual({ on_canvas: true });
  });

  it("emits nothing for an empty patch", () => {
    expect(noteToUpdate({})).toEqual({});
  });

  it("stamps completed_at alongside completed", () => {
    const done = noteToUpdate({ completed: true });
    expect(done.completed).toBe(true);
    expect(typeof done.completed_at).toBe("string");

    const reopened = noteToUpdate({ completed: false });
    expect(reopened.completed_at).toBeNull();
  });

  it("expands a transform patch into its columns", () => {
    expect(
      noteToUpdate({
        transform: { x: 1, y: 2, width: 3, height: 4, rotation: 5, zIndex: 6 },
      }),
    ).toEqual({ x: 1, y: 2, width: 3, height: 4, rotation: 5, z_index: 6 });
  });

  it("expands an appearance patch into its columns", () => {
    expect(
      noteToUpdate({
        appearance: { color: "peach", style: "grid", coverUrl: null },
      }),
    ).toEqual({ note_color: "peach", note_style: "grid", cover_url: null });
  });

  it("distinguishes clearing a field from leaving it alone", () => {
    // `due_at: null` must reach the database; an absent key must not.
    expect(noteToUpdate({ dueAt: null })).toEqual({ due_at: null });
    expect("due_at" in noteToUpdate({ title: "x" })).toBe(false);
  });
});

describe("lane mapping", () => {
  function laneRow(overrides: Partial<LaneRow> = {}): LaneRow {
    return {
      id: "lane-1",
      board_id: "board-1",
      owner_id: "owner-1",
      name: "To Do",
      color: "var(--status-todo)",
      position: 0,
      created_at: "2026-09-01T00:00:00.000Z",
      updated_at: "2026-09-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("maps a row onto the domain shape", () => {
    expect(laneFromRow(laneRow())).toMatchObject({
      id: "lane-1",
      boardId: "board-1",
      name: "To Do",
      position: 0,
    });
  });

  it("names an anonymous column rather than rendering a blank header", () => {
    expect(laneFromRow(laneRow({ name: "   " })).name).toBe("New Column");
  });

  it("falls back to a colour when the column has none", () => {
    expect(laneFromRow(laneRow({ color: "" })).color).toBe("var(--status-todo)");
  });

  it("emits only the changed fields on update", () => {
    expect(laneToUpdate({ name: "Today" })).toEqual({ name: "Today" });
    expect(laneToUpdate({})).toEqual({});
  });
});
