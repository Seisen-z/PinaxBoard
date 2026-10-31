import {createElement,type ReactNode} from "react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {renderHook,act} from "@/test/render";
import {useBoardSync} from "@/features/notes/use-board-sync";
import {queryKeys} from "@/lib/query-client";
import type {BoardContents} from "@/features/notes/repository";
import { beforeEach, describe, expect, it } from "vitest";

import { createBlankNote } from "@/features/notes/create-note";
import { LOCAL_BOARD_CONTEXT, useNoteStore } from "@/stores/note-store";
import type { Note, Subtask } from "@/types/note";

/**
 * Milestone 3 — note state mutations (IMPLEMENTATION_PLAN.md §9).
 */

function note(overrides: Partial<Note> = {}): Note {
  return {
    ...createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane-todo" }),
    ...overrides,
  };
}

function subtasks(titles: string[], completedCount = 0): Subtask[] {
  return titles.map((title, index) => ({
    id: `sub-${index}`,
    noteId: "note",
    title,
    completed: index < completedCount,
    position: index,
  }));
}

const store = () => useNoteStore.getState();
const find = (id: string) => store().notes.find((n) => n.id === id);

beforeEach(() => {
  useNoteStore.getState().reset([]);
});

describe("addNote", () => {
  it("prepends a blank note in the requested column and focuses it", () => {
    const id = store().addNote("lane-review");

    const created = find(id);
    expect(created?.laneId).toBe("lane-review");
    expect(created?.title).toBe("");
    expect(store().notes[0]?.id).toBe(id);
    expect(store().focusedNoteId).toBe(id);
  });

  it("stacks each new note above the last", () => {
    store().reset([note({ id: "a", transform: { ...note().transform, zIndex: 7 } })]);

    const id = store().addNote("lane-todo");
    expect(find(id)?.transform.zIndex).toBe(8);
  });

  it("stamps a new note with the local board when signed out", () => {
    const created = find(store().addNote("lane-todo"));

    expect(created?.boardId).toBe(LOCAL_BOARD_CONTEXT.boardId);
    expect(created?.ownerId).toBe(LOCAL_BOARD_CONTEXT.ownerId);
  });

  // The bug this guards: `addNote` used to hard-code the mock board and owner,
  // so a signed-in user's note was written with `board_id: "mock-board"`.
  // Postgres rejects that as a malformed uuid, so the save failed and the note
  // only ever existed on that device — and nothing could be attached to it,
  // because the attachments policy requires the note row to exist.
  it("stamps a new note with the cloud board it was created on", () => {
    const context = {
      boardId: "11111111-1111-4111-8111-111111111111",
      ownerId: "22222222-2222-4222-8222-222222222222",
    };
    store().reset([], context);

    const created = find(store().addNote("lane-todo"));

    expect(created?.boardId).toBe(context.boardId);
    expect(created?.ownerId).toBe(context.ownerId);
  });

  it("returns to the local board when reset without a context", () => {
    store().reset([], {
      boardId: "11111111-1111-4111-8111-111111111111",
      ownerId: "22222222-2222-4222-8222-222222222222",
    });
    store().reset([]);

    expect(find(store().addNote("lane-todo"))?.boardId).toBe(
      LOCAL_BOARD_CONTEXT.boardId,
    );
  });
});

describe("deleteNote", () => {
  it("moves the note to Trash without losing its record", () => {
    store().reset([note({ id: "a" }), note({ id: "b" })]);
    store().deleteNote("a");

    expect(store().notes.map((n) => n.id)).toEqual(["a", "b"]);
    expect(find("a")?.deletedAt).toEqual(expect.any(String));
    expect(find("b")?.deletedAt).toBeNull();
  });

  it("clears focus when the focused note is deleted", () => {
    const id = store().addNote("todo");
    expect(store().focusedNoteId).toBe(id);

    store().deleteNote(id);
    expect(store().focusedNoteId).toBeNull();
  });

  it("leaves focus alone when a different note is deleted", () => {
    store().reset([note({ id: "other" })]);
    const id = store().addNote("lane-todo");

    store().deleteNote("other");
    expect(store().focusedNoteId).toBe(id);
  });
});

describe("duplicateNote", () => {
  beforeEach(() => {
    store().reset([
      note({
        id: "source",
        title: "Roadmap",
        pinned: true,
        subtasks: subtasks(["A", "B"], 1),
      }),
      note({ id: "after" }),
    ]);
  });

  it("inserts the copy directly after its source", () => {
    const copyId = store().duplicateNote("source");

    expect(store().notes.map((n) => n.id)).toEqual(["source", copyId, "after"]);
  });

  it("copies the content but gives the duplicate a new identity", () => {
    const copyId = store().duplicateNote("source");
    const copy = find(copyId ?? "");

    expect(copy?.title).toBe("Roadmap");
    expect(copy?.id).not.toBe("source");
    // Subtasks belong to the note, so they cannot share ids with the original.
    expect(copy?.subtasks.map((s) => s.id)).not.toEqual(["sub-0", "sub-1"]);
    expect(copy?.subtasks.map((s) => s.completed)).toEqual([true, false]);
  });

  it("does not inherit the pin, and offsets the copy on the canvas", () => {
    const copyId = store().duplicateNote("source");
    const source = find("source");
    const copy = find(copyId ?? "");

    expect(copy?.pinned).toBe(false);
    expect(copy?.transform.x).toBe((source?.transform.x ?? 0) + 24);
    expect(copy?.transform.y).toBe((source?.transform.y ?? 0) + 24);
  });

  it("returns null for a note that no longer exists", () => {
    expect(store().duplicateNote("ghost")).toBeNull();
  });
});

describe("completion", () => {
  it("toggles completion and completes the whole checklist with it", () => {
    store().reset([note({ id: "a", subtasks: subtasks(["A", "B", "C"], 1) })]);

    store().toggleComplete("a");
    expect(find("a")?.completed).toBe(true);
    expect(find("a")?.subtasks.every((s) => s.completed)).toBe(true);
  });

  it("does not un-complete the checklist when the note is reopened", () => {
    store().reset([note({ id: "a", subtasks: subtasks(["A", "B"], 2) })]);

    store().toggleComplete("a");
    store().toggleComplete("a");

    expect(find("a")?.completed).toBe(false);
    // Reopening the note must not silently discard the user's tick marks.
    expect(find("a")?.subtasks.every((s) => s.completed)).toBe(true);
  });
});

describe("pin and lock", () => {
  it("toggles the pin", () => {
    store().reset([note({ id: "a" })]);

    store().togglePin("a");
    expect(find("a")?.pinned).toBe(true);

    store().togglePin("a");
    expect(find("a")?.pinned).toBe(false);
  });

  it("toggles the lock", () => {
    store().reset([note({ id: "a" })]);

    store().toggleLock("a");
    expect(find("a")?.locked).toBe(true);
  });
});

describe("locking guards accidental edits", () => {
  beforeEach(() => {
    store().reset([
      note({
        id: "a",
        title: "Original",
        excerpt: "Body",
        locked: true,
        subtasks: subtasks(["A"]),
      }),
    ]);
  });

  it("rejects title, body and checklist changes", () => {
    store().setTitle("a", "Changed");
    store().setText("a", "Changed");
    store().toggleSubtask("a", "sub-0", true);

    expect(find("a")?.title).toBe("Original");
    expect(find("a")?.excerpt).toBe("Body");
    expect(find("a")?.subtasks[0]?.completed).toBe(false);
  });

  it("refuses to delete a locked note", () => {
    // Losing a note the user explicitly protected is what a lock exists to
    // prevent, so delete is guarded along with editing.
    store().deleteNote("a");
    expect(find("a")).toBeDefined();
  });

  it("allows delete once the note is unlocked", () => {
    store().toggleLock("a");
    store().deleteNote("a");

    expect(find("a")?.deletedAt).toEqual(expect.any(String));
  });

  it("keeps the notes array identity when a delete is refused", () => {
    const before = store().notes;
    store().deleteNote("a");

    expect(store().notes).toBe(before);
  });

  it("still allows the deliberate, reversible actions, including unlock", () => {
    // A lock the user cannot undo from the UI would strand the note.
    store().toggleLock("a");
    expect(find("a")?.locked).toBe(false);

    store().toggleLock("a");
    store().setColor("a", "mint");
    store().setPriority("a", "high");
    store().setArchived("a", true);

    expect(find("a")?.appearance.color).toBe("mint");
    expect(find("a")?.priority).toBe("high");
    expect(find("a")?.archived).toBe(true);
  });

  it("leaves the notes array identity untouched on a rejected edit", () => {
    const before = store().notes;
    store().setTitle("a", "Changed");

    // A no-op must not publish a new array, or every card re-renders.
    expect(store().notes).toBe(before);
  });
});

describe("appearance", () => {
  it("changes color and style independently", () => {
    store().reset([note({ id: "a" })]);

    store().setColor("a", "lavender");
    expect(find("a")?.appearance.color).toBe("lavender");

    store().setStyle("a", "lined");
    expect(find("a")?.appearance.style).toBe("lined");
    // A style with no forced paper leaves the chosen color alone.
    expect(find("a")?.appearance.color).toBe("lavender");
  });

  it("writes through the paper a style forces, so the picker matches the card", () => {
    store().reset([note({ id: "a" })]);

    store().setColor("a", "yellow");
    store().setStyle("a", "dark");

    expect(find("a")?.appearance.color).toBe("slate");
  });
});

describe("priority and columns", () => {
  it("sets priority", () => {
    store().reset([note({ id: "a" })]);
    store().setPriority("a", "urgent");

    expect(find("a")?.priority).toBe("urgent");
  });

  it("moves a note between columns without touching its content", () => {
    store().reset([note({ id: "a", title: "Keep me", laneId: "lane-todo" })]);
    store().setLane("a", "lane-done");

    expect(find("a")?.laneId).toBe("lane-done");
    expect(find("a")?.title).toBe("Keep me");
  });

  it("keeps the array identity when the note is already in that column", () => {
    store().reset([note({ id: "a", laneId: "lane-todo" })]);
    const before = store().notes;

    store().setLane("a", "lane-todo");
    expect(store().notes).toBe(before);
  });
});

describe("rehoming a deleted column's notes", () => {
  beforeEach(() => {
    store().reset([
      note({ id: "a", laneId: "lane-old" }),
      note({ id: "b", laneId: "lane-old", locked: true }),
      note({ id: "c", laneId: "lane-keep" }),
    ]);
  });

  it("moves every note out of the column", () => {
    store().moveNotesToLane("lane-old", "lane-keep");

    expect(find("a")?.laneId).toBe("lane-keep");
    expect(find("b")?.laneId).toBe("lane-keep");
    expect(find("c")?.laneId).toBe("lane-keep");
  });

  it("does nothing when the column holds no notes", () => {
    const before = store().notes;
    store().moveNotesToLane("lane-empty", "lane-keep");

    expect(store().notes).toBe(before);
  });

  it("spares locked notes when deleting a column's notes", () => {
    store().deleteNotesInLane("lane-old");

    // A locked note survives its column being deleted, for the same reason it
    // survives Delete.
    expect(find("a")?.deletedAt).toEqual(expect.any(String));
    expect(find("b")).toBeDefined();
    expect(find("c")).toBeDefined();
  });
});

describe("updatedAt", () => {
  it("advances on a real change", async () => {
    store().reset([note({ id: "a", updatedAt: "2020-01-01T00:00:00.000Z" })]);

    store().setTitle("a", "New");
    expect(find("a")?.updatedAt).not.toBe("2020-01-01T00:00:00.000Z");
  });

  it("stays put when an action changes nothing", () => {
    store().reset([note({ id: "a", updatedAt: "2020-01-01T00:00:00.000Z" })]);

    store().setTitle("missing-id", "New");
    expect(find("a")?.updatedAt).toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("unknown ids", () => {
  it("are ignored rather than throwing", () => {
    store().reset([note({ id: "a" })]);

    expect(() => {
      store().setTitle("ghost", "x");
      store().toggleComplete("ghost");
      store().togglePin("ghost");
      store().deleteNote("ghost");
      store().setLane("ghost", "lane-done");
    }).not.toThrow();

    expect(store().notes).toHaveLength(1);
  });
});

describe("persisted lifecycle hydration cache",()=>{
  function setup(records:Note[]){
    store().reset(records,LOCAL_BOARD_CONTEXT);const client=new QueryClient();
    client.setQueryData<BoardContents>(queryKeys.notes(LOCAL_BOARD_CONTEXT.boardId),{notes:records,lanes:[]});
    const wrapper=({children}:{children:ReactNode})=>createElement(QueryClientProvider,{client},children);
    const hook=renderHook(()=>useBoardSync({...LOCAL_BOARD_CONTEXT,enabled:true}),{wrapper});
    act(()=>hook.result.current.markClean());return {client,hook};
  }
  it("removes purged notes and their cached history before a board can rehydrate them",()=>{
    const trashed=note({...LOCAL_BOARD_CONTEXT,id:"trash",deletedAt:"2026-10-14T08:00Z"});const live=note({...LOCAL_BOARD_CONTEXT,id:"live"});
    const {client,hook}=setup([trashed,live]);client.setQueryData(queryKeys.noteHistory(trashed.id,trashed.ownerId),{versions:["old content"]});client.setQueryData(queryKeys.attachments(trashed.id),["old file"]);
    act(()=>hook.result.current.acceptPurged([trashed.id]));
    expect(client.getQueryData<BoardContents>(queryKeys.notes(trashed.boardId))?.notes.map((note)=>note.id)).toEqual([live.id]);
    expect(client.getQueryData(queryKeys.noteHistory(trashed.id,trashed.ownerId))).toBeUndefined();expect(client.getQueryData(queryKeys.attachments(trashed.id))).toBeUndefined();expect(find(trashed.id)).toBeUndefined();hook.unmount();
  });
  it("retains accepted restored content in the board cache rather than rehydrating an older version",()=>{
    const original=note({...LOCAL_BOARD_CONTEXT,id:"restored"});const {client,hook}=setup([original]);const restored={...original,title:"Restored title"};
    act(()=>{store().setRestoring(original.id);hook.result.current.acceptRestored(restored);});
    expect(client.getQueryData<BoardContents>(queryKeys.notes(original.boardId))?.notes[0]?.title).toBe("Restored title");expect(find(original.id)?.title).toBe("Restored title");
    const other=note({id:"other-board-note",boardId:"other-board",ownerId:LOCAL_BOARD_CONTEXT.ownerId});
    act(()=>store().reset([other],{boardId:other.boardId,ownerId:other.ownerId}));
    client.setQueryData<BoardContents>(queryKeys.notes(original.boardId),{notes:[original],lanes:[]});
    act(()=>hook.result.current.acceptRestored(restored));
    expect(client.getQueryData<BoardContents>(queryKeys.notes(original.boardId))?.notes[0]?.title).toBe("Restored title");
    expect(store().notes[0]?.id).toBe(other.id);hook.unmount();
  });
});
