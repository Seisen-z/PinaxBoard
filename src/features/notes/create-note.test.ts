import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_SIZE,
  DEFAULT_NOTE_STYLE,
  NOTE_SIZE_PRESETS,
} from "@/config/note-styles";
import { createBlankNote } from "@/features/notes/create-note";
import { getSubtaskProgress } from "@/types/note";

describe("createBlankNote", () => {
  const input = {
    boardId: "board-1",
    ownerId: "owner-1",
    laneId: "lane-todo",
  } as const;

  it("returns an untitled note with empty content", () => {
    const note = createBlankNote(input);

    expect(note.title).toBe("");
    expect(note.excerpt).toBe("");
    expect(note.content).toBeNull();
  });

  it("applies the default appearance rather than asking the user to choose", () => {
    const note = createBlankNote(input);

    expect(note.appearance).toEqual({
      color: DEFAULT_NOTE_COLOR,
      style: DEFAULT_NOTE_STYLE,
      coverUrl: null,
    });
  });

  it("sizes the note from the default preset", () => {
    const note = createBlankNote(input);
    const preset = NOTE_SIZE_PRESETS[DEFAULT_NOTE_SIZE];

    expect(note.transform.width).toBe(preset.width);
    expect(note.transform.height).toBe(preset.height);
    expect(note.transform.rotation).toBe(0);
  });

  it("lands in the column it was created from", () => {
    expect(createBlankNote(input).laneId).toBe("lane-todo");
    expect(createBlankNote({ ...input, laneId: "lane-ideas" }).laneId).toBe(
      "lane-ideas",
    );
  });

  it("starts with every flag off and no organization applied", () => {
    const note = createBlankNote(input);

    expect(note.completed).toBe(false);
    expect(note.pinned).toBe(false);
    expect(note.locked).toBe(false);
    expect(note.archived).toBe(false);
    expect(note.priority).toBe("none");
    expect(note.subtasks).toEqual([]);
    expect(note.tagIds).toEqual([]);
    expect(note.categoryId).toBeNull();
    expect(note.dueAt).toBeNull();
    expect(note.deletedAt).toBeNull();
  });

  it("generates a distinct id per note", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => createBlankNote(input).id),
    );
    expect(ids.size).toBe(50);
  });

  it("honours an explicit canvas position and z-index", () => {
    const note = createBlankNote({ ...input, x: 120, y: -40, zIndex: 7 });

    expect(note.transform.x).toBe(120);
    expect(note.transform.y).toBe(-40);
    expect(note.transform.zIndex).toBe(7);
  });

  it("stamps createdAt and updatedAt as parseable ISO timestamps", () => {
    const note = createBlankNote(input);

    expect(Number.isNaN(Date.parse(note.createdAt))).toBe(false);
    expect(note.updatedAt).toBe(note.createdAt);
  });
});

describe("getSubtaskProgress", () => {
  it("returns null for a note with no checklist, distinct from 0%", () => {
    expect(getSubtaskProgress({ subtasks: [] })).toBeNull();
  });

  it("counts completed subtasks and reports a ratio", () => {
    const progress = getSubtaskProgress({
      subtasks: [
        { id: "a", noteId: "n", title: "A", completed: true, position: 0 },
        { id: "b", noteId: "n", title: "B", completed: false, position: 1 },
        { id: "c", noteId: "n", title: "C", completed: true, position: 2 },
        { id: "d", noteId: "n", title: "D", completed: false, position: 3 },
      ],
    });

    expect(progress).toEqual({ completed: 2, total: 4, ratio: 0.5 });
  });
});
