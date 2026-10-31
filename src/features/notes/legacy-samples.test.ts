import { describe, expect, it } from "vitest";
import { migrateLocalNotes, LEGACY_SAMPLE_BACKUP_KEY } from "./legacy-samples";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { createBlankNote } from "./create-note";
import { useNoteStore } from "@/stores/note-store";
const personal = () => createBlankNote({ boardId: "mock-board", ownerId: "mock-owner", laneId: "lane-todo" });

describe("clean local workspace", () => {
  it("starts new sessions without demo notes", () => {
    expect(useNoteStore.getInitialState().notes).toEqual([]);
    expect(useNoteStore.persist.getOptions().version).toBe(2);
  });
  it("removes all eleven legacy local samples but preserves personal notes", () => {
    const own = { ...personal(), title: "My own note" };
    const original = { notes: [...MOCK_NOTES, own] };
    const result = migrateLocalNotes(original, localStorage);
    expect(result.notes).toEqual([own]); expect(original.notes).toHaveLength(12);
    expect(JSON.parse(localStorage.getItem(LEGACY_SAMPLE_BACKUP_KEY)!)).toEqual({ state: original, version: 1 });
  });
  it("does not remove matching titles or IDs from another owner or board", () => {
    const example = MOCK_NOTES[0]!;
    const notes = [{ ...example, ownerId: "real-owner" }, { ...example, boardId: "cloud-board" }, { ...personal(), title: example.title }];
    expect(migrateLocalNotes({ notes }, localStorage).notes).toEqual(notes);
    expect(localStorage.getItem(LEGACY_SAMPLE_BACKUP_KEY)).toBeNull();
  });
  it("preserves personal archive/trash entries and every non-note state field", () => {
    const own = { ...personal(), archived: true, deletedAt: new Date().toISOString() };
    const result = migrateLocalNotes({ notes: [MOCK_NOTES[0]!, own], extra: "keep" }, localStorage);
    expect(result).toEqual({ notes: [own], extra: "keep", legacySamplesPending: false });
  });
  it("does not overwrite an earlier backup and can restore a separate persisted copy", () => {
    const original = { notes: [...MOCK_NOTES, personal()] };
    const cleaned = migrateLocalNotes(original, localStorage);
    const backup = localStorage.getItem(LEGACY_SAMPLE_BACKUP_KEY)!;
    migrateLocalNotes({ notes: [MOCK_NOTES[0]!] }, localStorage);
    expect(localStorage.getItem(LEGACY_SAMPLE_BACKUP_KEY)).toBe(backup);
    const restoredCopy = JSON.parse(backup); expect(restoredCopy.state).toEqual(original);
    expect(cleaned.notes).toHaveLength(1); expect(restoredCopy.state.notes).toHaveLength(12);
  });
  it("keeps notes visible with a retry marker if a backup cannot be written", () => {
    const original = { notes: [...MOCK_NOTES, personal()] };
    const result = migrateLocalNotes(original, { getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } });
    expect(result.notes).toEqual(original.notes); expect(result.legacySamplesPending).toBe(true);
    expect(original.notes).toHaveLength(12);
  });
  it("leaves malformed and future storage untouched rather than silently clearing it", () => {
    expect(() => migrateLocalNotes({ unexpected: true }, localStorage)).toThrow("unsupported format");
    expect(() => migrateLocalNotes({ notes: [] }, localStorage, 3)).toThrow("unsupported format");
  });
  it("retries pending cleanup after storage becomes writable", () => {
    const original = { notes: [...MOCK_NOTES, personal()] };
    const pending = migrateLocalNotes(original, { getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } });
    const result = migrateLocalNotes(pending, localStorage, 2);
    expect(result.notes).toEqual([original.notes.at(-1)]); expect(result.legacySamplesPending).toBe(false);
  });
  it("removes duplicate legacy IDs without touching personal notes", () => {
    const own = personal(); const result = migrateLocalNotes({ notes: [...MOCK_NOTES, MOCK_NOTES[6]!, own] }, localStorage);
    expect(result.notes).toEqual([own]);
  });

  it("persists a successful retry in v2 rather than bringing samples back on reload", () => {
    const own = personal(), pending = { notes: [MOCK_NOTES[0]!, own], legacySamplesPending: true };
    const merge = useNoteStore.persist.getOptions().merge; expect(merge).toBeDefined();
    const merged = merge!(pending, useNoteStore.getState());
    expect(merged.notes).toEqual([own]); expect(merged.legacySamplesPending).toBe(false);
    expect(JSON.parse(localStorage.getItem("tackly:notes")!)).toEqual({ state: { notes: [own], legacySamplesPending: false }, version: 2 });
    expect(JSON.parse(localStorage.getItem(LEGACY_SAMPLE_BACKUP_KEY)!).version).toBe(2);
  });

});
