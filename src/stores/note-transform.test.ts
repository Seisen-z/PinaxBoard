import { beforeEach, describe, expect, it } from "vitest";

import { createBlankNote } from "@/features/notes/create-note";
import { useNoteStore } from "@/stores/note-store";
import type { Note } from "@/types/note";

/**
 * Milestone 4 — canvas transform and layer actions
 * (IMPLEMENTATION_PLAN.md §10).
 */

function note(id: string, overrides: Partial<Note> = {}): Note {
  const base = createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane-todo" });
  return { ...base, id, ...overrides };
}

function at(id: string, x: number, y: number, zIndex: number): Note {
  const base = note(id);
  return { ...base, transform: { ...base.transform, x, y, zIndex } };
}

const store = () => useNoteStore.getState();
const find = (id: string) => store().notes.find((n) => n.id === id);
const zOf = (id: string) => find(id)?.transform.zIndex;

beforeEach(() => {
  useNoteStore.getState().reset([]);
});

describe("setTransform", () => {
  it("patches position and size without touching the rest", () => {
    store().reset([note("a", { title: "Keep" })]);
    store().setTransform("a", { x: 120, y: 40, width: 300, height: 260 });

    expect(find("a")?.transform).toMatchObject({
      x: 120,
      y: 40,
      width: 300,
      height: 260,
    });
    expect(find("a")?.title).toBe("Keep");
  });

  it("leaves unspecified fields alone", () => {
    store().reset([note("a")]);
    const before = find("a")?.transform.rotation;

    store().setTransform("a", { x: 10 });
    expect(find("a")?.transform.rotation).toBe(before);
  });

  it("refuses to move a locked note", () => {
    store().reset([note("a", { locked: true })]);
    const before = find("a")?.transform.x;

    store().setTransform("a", { x: 999 });
    expect(find("a")?.transform.x).toBe(before);
  });
});

describe("moveNotes", () => {
  beforeEach(() => {
    store().reset([at("a", 0, 0, 1), at("b", 100, 100, 2), at("c", 200, 200, 3)]);
  });

  it("commits positions for several notes in one update", () => {
    store().moveNotes(
      new Map([
        ["a", { x: 10, y: 20 }],
        ["c", { x: 300, y: 400 }],
      ]),
    );

    expect(find("a")?.transform).toMatchObject({ x: 10, y: 20 });
    expect(find("c")?.transform).toMatchObject({ x: 300, y: 400 });
    // Untouched.
    expect(find("b")?.transform).toMatchObject({ x: 100, y: 100 });
  });

  it("skips locked notes inside a multi-note move", () => {
    store().toggleLock("b");
    store().moveNotes(
      new Map([
        ["a", { x: 5, y: 5 }],
        ["b", { x: 5, y: 5 }],
      ]),
    );

    expect(find("a")?.transform).toMatchObject({ x: 5, y: 5 });
    expect(find("b")?.transform).toMatchObject({ x: 100, y: 100 });
  });

  it("does nothing for an empty move set", () => {
    const before = store().notes;
    store().moveNotes(new Map());

    expect(store().notes).toBe(before);
  });

  it("keeps the array identity when every moved note is locked", () => {
    store().toggleLock("a");
    const before = store().notes;

    store().moveNotes(new Map([["a", { x: 1, y: 1 }]]));
    expect(store().notes).toBe(before);
  });
});

describe("layer controls", () => {
  beforeEach(() => {
    // A sparse stack, which is what exposes increment-based implementations.
    store().reset([at("a", 0, 0, 1), at("b", 0, 0, 5), at("c", 0, 0, 9)]);
  });

  it("brings a note forward past its nearest neighbour", () => {
    store().bringForward("a");

    // Incrementing to 2 would leave `a` still beneath `b`; swapping puts it
    // genuinely above.
    expect(zOf("a")).toBe(5);
    expect(zOf("b")).toBe(1);
  });

  it("sends a note backward past its nearest neighbour", () => {
    store().sendBackward("c");

    expect(zOf("c")).toBe(5);
    expect(zOf("b")).toBe(9);
  });

  it("does nothing when the note is already at the top or bottom", () => {
    const before = store().notes;

    store().bringForward("c");
    store().sendBackward("a");

    expect(store().notes).toBe(before);
  });

  it("brings a note to the front of the whole stack", () => {
    store().bringToFront("a");
    expect(zOf("a")).toBe(10);
  });

  it("sends a note to the back of the whole stack", () => {
    store().sendToBack("c");
    expect(zOf("c")).toBe(0);
  });

  it("leaves the stack alone when the note is already at the front", () => {
    const before = store().notes;
    store().bringToFront("c");

    expect(store().notes).toBe(before);
  });

  it("ignores unknown ids", () => {
    const before = store().notes;

    expect(() => {
      store().bringForward("ghost");
      store().sendToBack("ghost");
    }).not.toThrow();

    expect(store().notes).toBe(before);
  });
});
