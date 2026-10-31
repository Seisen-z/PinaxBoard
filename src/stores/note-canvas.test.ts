import { beforeEach, describe, expect, it } from "vitest";

import { createBlankNote } from "@/features/notes/create-note";
import { useNoteStore } from "@/stores/note-store";
import type { Note } from "@/types/note";

/**
 * Moving notes between the Board and the Canvas.
 *
 * The two are separate surfaces sharing one set of records: a note always
 * belongs to a column, and `onCanvas` decides whether it is also pinned up on
 * the desk. Nothing here duplicates a note.
 */

function note(id: string, overrides: Partial<Note> = {}): Note {
  return {
    ...createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane-a" }),
    id,
    title: id,
    ...overrides,
  };
}

const store = () => useNoteStore.getState();
const find = (id: string) => store().notes.find((n) => n.id === id);

beforeEach(() => {
  useNoteStore.getState().reset([]);
});

describe("setOnCanvas", () => {
  it("places a note on the canvas", () => {
    store().reset([note("a")]);
    store().setOnCanvas("a", true);

    expect(find("a")?.onCanvas).toBe(true);
  });

  it("takes it off again without deleting it or moving its column", () => {
    store().reset([note("a", { onCanvas: true, laneId: "lane-b" })]);
    store().setOnCanvas("a", false);

    expect(find("a")).toBeDefined();
    expect(find("a")?.onCanvas).toBe(false);
    expect(find("a")?.laneId).toBe("lane-b");
  });

  it("assigns a position to a note that has never been placed", () => {
    // A Board note sits at the origin, so without this every note sent to the
    // canvas would land on top of the last one.
    store().reset([note("a")]);
    store().setOnCanvas("a", true);

    expect(find("a")?.transform.x).toBeGreaterThan(0);
    expect(find("a")?.transform.y).toBeGreaterThan(0);
  });

  it("keeps a position the user already chose", () => {
    const positioned = note("a");
    positioned.transform = { ...positioned.transform, x: 640, y: 480 };
    store().reset([positioned]);

    store().setOnCanvas("a", false);
    store().setOnCanvas("a", true);

    expect(find("a")?.transform).toMatchObject({ x: 640, y: 480 });
  });

  it("keeps the array identity when nothing changes", () => {
    store().reset([note("a", { onCanvas: true })]);
    const before = store().notes;

    store().setOnCanvas("a", true);
    expect(store().notes).toBe(before);
  });
});

describe("sendLaneToCanvas", () => {
  beforeEach(() => {
    store().reset([
      note("a", { laneId: "lane-a" }),
      note("b", { laneId: "lane-a" }),
      note("c", { laneId: "lane-b" }),
    ]);
  });

  it("places every note of that column and leaves the others alone", () => {
    store().sendLaneToCanvas("lane-a");

    expect(find("a")?.onCanvas).toBe(true);
    expect(find("b")?.onCanvas).toBe(true);
    expect(find("c")?.onCanvas).toBe(false);
  });

  it("spreads them out instead of stacking them in one spot", () => {
    store().sendLaneToCanvas("lane-a");

    const a = find("a")?.transform;
    const b = find("b")?.transform;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a?.x === b?.x && a?.y === b?.y).toBe(false);
  });

  it("skips archived and deleted notes", () => {
    store().reset([
      note("live", { laneId: "lane-a" }),
      note("archived", { laneId: "lane-a", archived: true }),
      note("deleted", { laneId: "lane-a", deletedAt: "2026-01-01T00:00:00.000Z" }),
    ]);

    store().sendLaneToCanvas("lane-a");

    expect(find("live")?.onCanvas).toBe(true);
    expect(find("archived")?.onCanvas).toBe(false);
    expect(find("deleted")?.onCanvas).toBe(false);
  });

  it("does nothing for a column with nothing left to send", () => {
    store().reset([note("a", { laneId: "lane-a", onCanvas: true })]);
    const before = store().notes;

    store().sendLaneToCanvas("lane-a");
    expect(store().notes).toBe(before);
  });

  it("does nothing for an unknown column", () => {
    const before = store().notes;
    store().sendLaneToCanvas("lane-ghost");

    expect(store().notes).toBe(before);
  });
});

describe("addNote", () => {
  it("creates a Board-only note by default", () => {
    const id = store().addNote("lane-a");
    expect(find(id)?.onCanvas).toBe(false);
  });

  it("can create a note straight onto the canvas at a position", () => {
    const id = store().addNote("lane-a", { onCanvas: true, x: 120, y: 340 });

    expect(find(id)?.onCanvas).toBe(true);
    expect(find(id)?.transform).toMatchObject({ x: 120, y: 340 });
    // It still belongs to a column, so the Board lists it too.
    expect(find(id)?.laneId).toBe("lane-a");
  });
});
