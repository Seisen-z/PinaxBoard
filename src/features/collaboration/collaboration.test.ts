import { afterEach, describe, expect, it } from "vitest";
import { useBoardAccess, canWriteBoard } from "./access";
import { parseCursors } from "./presence";
import { sharedChanges } from "./repository";
import { useNoteStore } from "@/stores/note-store";
import { useLaneStore } from "@/stores/lane-store";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { libraryNotes } from "@/features/notes/note-library";

afterEach(() => useBoardAccess.setState({ boardId: null, actorId: null, role: "owner" }));
const note = MOCK_NOTES[0]!;

describe("board permissions and shared records", () => {
  it("keeps local mode writable", () => { expect(canWriteBoard(note.boardId)).toBe(true); });
  it.each(["viewer", null] as const)("blocks mutation actions for role %s but retains reading", role => {
    useBoardAccess.setState({ boardId: note.boardId, actorId: "viewer", role });
    const notes = useNoteStore.getState().notes, lanes = useLaneStore.getState().lanes;
    const state = useNoteStore.getState();
    state.setTitle(note.id, "Blocked"); state.toggleComplete(note.id); state.deleteNote(note.id); state.setInbox(note.id, true);
    state.setOnCanvas(note.id, true); state.setTransform(note.id, { x: 99 }); state.setColor(note.id, "pink");
    state.setArchived(note.id, true); state.setLane(note.id, "foreign"); state.toggleLock(note.id);
    expect(state.addNote(note.laneId)).toBe(""); expect(state.duplicateNote(note.id)).toBeNull();
    useLaneStore.getState().renameLane(note.laneId, "Blocked"); expect(useLaneStore.getState().addLane()).toBe(""); useLaneStore.getState().removeLane(note.laneId);
    expect(useNoteStore.getState().notes).toBe(notes); expect(useLaneStore.getState().lanes).toBe(lanes);
    state.expandNote(note.id); expect(useNoteStore.getState().expandedNoteId).toBe(note.id);
  });
  it("does not authorize writes into a stale different board", () => {
    useBoardAccess.setState({ boardId: "another-board", actorId: "editor", role: "editor" });
    const notes = useNoteStore.getState().notes; useNoteStore.getState().setTitle(note.id, "Blocked"); expect(useNoteStore.getState().notes).toBe(notes);
  });
  it("stamps the actor separately from the board owner on new notes", () => {
    useBoardAccess.setState({ boardId: note.boardId, actorId: "editor", role: "editor" });
    const id = useNoteStore.getState().addNote(note.laneId, { inbox: true });
    expect(useNoteStore.getState().notes.find(item => item.id === id)).toMatchObject({ ownerId: note.ownerId, createdBy: "editor", inbox: true, title: "", content: null });
  });
  it("organizes an Inbox note in place without cloning or removing its Canvas placement", () => {
    const captured = { ...note, inbox: true, onCanvas: true }; useNoteStore.getState().reset([captured]);
    useNoteStore.getState().setLane(note.id, "other-column"); useNoteStore.getState().setInbox(note.id, false);
    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(useNoteStore.getState().notes[0]).toMatchObject({ id: note.id, laneId: "other-column", inbox: false, onCanvas: true });
    expect(libraryNotes(useNoteStore.getState().notes, "inbox", note.ownerId, "")).toEqual([]);
  });
});

describe("distinct note destinations", () => {
  const data = [{ ...note, id: "mine", createdBy: "me", inbox: false, archived: false, deletedAt: null }, { ...note, id: "capture", createdBy: "other", inbox: true, archived: false, deletedAt: null }, { ...note, id: "trash", createdBy: "me", inbox: true, deletedAt: "2026-10-30" }];
  it("Inbox shows only actual unorganized captures", () => expect(libraryNotes(data, "inbox", "me", "").map(item => item.id)).toEqual(["capture"]));
  it("My Notes filters by author, not board owner", () => expect(libraryNotes(data, "mine", "me", "").map(item => item.id)).toEqual(["mine"]));
  it("supports legacy authors and searches actual content", () => {
    expect(libraryNotes([{ ...note, title: "Find this", archived: false, deletedAt: null }], "mine", note.ownerId, " find ")).toHaveLength(1);
    expect(libraryNotes(data, "mine", "me", "not present")).toHaveLength(0);
  });
});

describe("bounded cursor presence", () => {
  const cursor = { session: "other-tab", userId: "12345678-1234-4234-8234-123456789abc", name: "Ada", view: "canvas:canvas", x: 12, y: 24, canvas: true, visible: true, at: 10000, noteId: null };
  it("accepts well-shaped cursor data and deduplicates sessions", () => expect(parseCursors([cursor, { ...cursor, x: 13 }], "my-tab", 10000)).toEqual([{ ...cursor, x: 13 }]));
  it("drops malformed, stale, future and own-session data", () => expect(parseCursors([{}, { ...cursor, x: Infinity }, { ...cursor, name: "x".repeat(1000) }, { ...cursor, at: 50000 }, { ...cursor, at: -50000 }, { ...cursor, session: "my-tab" }], "my-tab", 10000)).toEqual([]));
});

describe("atomic shared changes", () => {
  it("sends explicit before and after records for compare-and-save, with tags", () => {
    const lane = useLaneStore.getState().lanes[0]!;
    const input = sharedChanges({ notes: { upserts: [{ ...note, title: "Edited", tagIds: ["tag"] }], deletions: [] }, lanes: { upserts: [{ ...lane, name: "Renamed" }], deletions: [] } }, { notes: [note], lanes: [lane] }, note.ownerId);
    expect(input.notes).toEqual([expect.objectContaining({ id: note.id, before: expect.objectContaining({ title: note.title }), after: expect.objectContaining({ title: "Edited" }), tagsBefore: note.tagIds, tagsAfter: ["tag"] })]);
    expect(input.lanes).toEqual([expect.objectContaining({ before: expect.objectContaining({ owner_id: note.ownerId }), after: expect.objectContaining({ name: "Renamed" }) })]);
  });
  it("uses null expectations for new IDs and explicit soft-delete changes", () => {
    const input = sharedChanges({ notes: { upserts: [{ ...note, id: "fresh" }], deletions: [note.id] }, lanes: { upserts: [], deletions: [] } }, { notes: [note], lanes: [] }, note.ownerId);
    expect(input.notes).toEqual([expect.objectContaining({ id: "fresh", before: null }), expect.objectContaining({ id: note.id, after: null })]);
  });
});
