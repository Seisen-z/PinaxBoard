import { describe, expect, it } from "vitest";
import { dashboardSummary, recentBoards } from "./summary";
import { createBlankNote } from "@/features/notes/create-note";
import { noteFromRow, noteToInsert, noteToUpdate } from "@/lib/mappers/note";
import { useNoteStore } from "@/stores/note-store";
import type { Note } from "@/types/note";
import type { Board } from "@/types/board";

const now = new Date(2026, 9, 14, 14);
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).toISOString();
function note(id: string, patch: Partial<Note> = {}): Note {
  return { ...createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane" }), id, ...patch };
}

describe("dashboard summaries", () => {
  it("groups civil days including start-today and excludes completed work", () => {
    const result = dashboardSummary([
      note("today", { dueAt: at(14, 0) }), note("start", { startAt: at(14), dueAt: at(20) }),
      note("old", { dueAt: at(13, 23) }), note("next", { dueAt: at(21, 23) }),
      note("far", { dueAt: at(22, 0) }), note("done", { dueAt: at(13), completed: true }),
    ], now);
    expect(result.Today.map((n) => n.id)).toEqual(["today", "start"]);
    expect(result.Overdue.map((n) => n.id)).toEqual(["old"]);
    expect(result.Upcoming.map((n) => n.id)).toEqual(["start", "next"]);
  });
  it("handles date-only values and invalid dates without epoch guesses", () => {
    const result = dashboardSummary([note("civil", { dueAt: "2026-10-14" }), note("bad", { dueAt: "2026-02-30" }), note("none")], now);
    expect(result.Today.map((n) => n.id)).toEqual(["civil"]);
    expect(result.Overdue).toEqual([]);
  });
  it("excludes archived/deleted records from every section without mutating input", () => {
    const notes = [note("archived", { archived: true, pinned: true }), note("deleted", { deletedAt: at(14), pinned: true })];
    expect(Object.values(dashboardSummary(notes, now)).every((list) => list.length === 0)).toBe(true);
    expect(notes.map((n) => n.id)).toEqual(["archived", "deleted"]);
  });
  it("orders urgency before high priority and recent edits descending", () => {
    const result = dashboardSummary([note("high", { priority: "high", updatedAt: at(13) }), note("urgent", { priority: "urgent", updatedAt: at(14) }), note("done", { priority: "urgent", completed: true, pinned: true, updatedAt: at(12) })], now);
    expect(result["High Priority"].map((n) => n.id)).toEqual(["urgent", "high"]);
    expect(result["Recently Edited"].map((n) => n.id)).toEqual(["urgent", "high", "done"]);
    expect(result["Pinned Notes"].map((n) => n.id)).toEqual(["done"]);
  });
  it("uses completion events, never updatedAt, for completed today", () => {
    const result = dashboardSummary([
      note("done", { completed: true, completedAt: at(14), updatedAt: at(13) }),
      note("edited", { completed: true, completedAt: at(12), updatedAt: at(14) }),
      note("legacy", { completed: true, updatedAt: at(14) }),
      note("open", { completedAt: at(14) }),
    ], now);
    expect(result["Completed Today"].map((n) => n.id)).toEqual(["done"]);
  });
  it("rolls over at local midnight rather than elapsed 24-hour windows", () => {
    const notes = [note("due", { dueAt: at(14, 23) })];
    expect(dashboardSummary(notes, new Date(2026, 9, 14, 23, 59)).Today).toHaveLength(1);
    expect(dashboardSummary(notes, new Date(2026, 9, 15, 0)).Overdue).toHaveLength(1);
  });
  it("orders real non-archived boards by updated timestamp", () => {
    const boards = [{ id: "old", updatedAt: at(12), archivedAt: null }, { id: "new", updatedAt: at(14), archivedAt: null }, { id: "archived", updatedAt: at(15), archivedAt: at(15) }] as Board[];
    expect(recentBoards(boards).map((b) => b.id)).toEqual(["new", "old"]);
    expect(boards[0]?.id).toBe("old");
  });
});

describe("completion timestamp contract", () => {
  it("preserves the database completion event through unrelated autosaves", () => {
    const original = noteToInsert(note("done", { completed: true, completedAt: at(12), updatedAt: at(14) }));
    const hydrated = noteFromRow(original, { fallbackLaneId: "lane" });
    expect(hydrated.completedAt).toBe(at(12));
    expect(noteToInsert({ ...hydrated, title: "Changed", updatedAt: at(15) }).completed_at).toBe(at(12));
    expect(noteToInsert(note("legacy", { completed: true, updatedAt: at(14) })).completed_at).toBeNull();
    expect(noteToUpdate({ completed: true, completedAt: at(12) }).completed_at).toBe(at(12));
    expect(noteToUpdate({ completed: false, completedAt: at(12) }).completed_at).toBeNull();
  });
  it("stamps a completion, retains it across edits, clears on reopening and duplication", () => {
    useNoteStore.getState().reset([note("event")]);
    useNoteStore.getState().toggleComplete("event");
    const completed = useNoteStore.getState().notes[0]!;
    expect(completed.completedAt).toBeTruthy();
    useNoteStore.getState().setTitle("event", "Later edit");
    expect(useNoteStore.getState().notes[0]?.completedAt).toBe(completed.completedAt);
    const copy = useNoteStore.getState().duplicateNote("event");
    expect(useNoteStore.getState().notes.find((n) => n.id === copy)?.completedAt).toBeNull();
    useNoteStore.getState().toggleComplete("event");
    expect(useNoteStore.getState().notes[0]?.completedAt).toBeNull();
  });
});
