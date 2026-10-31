import { MAX_LANES } from "@/config/lanes";
import type { BoardContents } from "@/features/notes/repository";
import { createId } from "@/lib/utils";
import type { Note } from "@/types/note";

export interface CachedBoard { ownerId: string; boardId: string; baseline: BoardContents; working: BoardContents; pending: boolean; revision: number; }
const PREFIX = "tackly:board-cache:";
export function readCachedBoard(ownerId: string, boardId: string): CachedBoard | null {
  try { const raw = localStorage.getItem(PREFIX + ownerId + ":" + boardId); if (!raw) return null;
    const value = JSON.parse(raw) as CachedBoard;
    return value.ownerId === ownerId && value.boardId === boardId && Array.isArray(value.working?.notes) && Array.isArray(value.working?.lanes) && Array.isArray(value.baseline?.notes) && Array.isArray(value.baseline?.lanes) ? value : null;
  } catch { return null; }
}
/** Synchronous journal protects the last keystroke; IndexedDB mirrors each board snapshot. Errors are surfaced by autosave. */
export function writeCachedBoard(record: CachedBoard): void {
  localStorage.setItem(PREFIX + record.ownerId + ":" + record.boardId, JSON.stringify(record));
  if (typeof indexedDB === "undefined") return;
  const request = indexedDB.open("tackly-boards", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("boards", { keyPath: "key" });
  request.onsuccess = () => { const db = request.result; const tx = db.transaction("boards", "readwrite"); tx.objectStore("boards").put({ key: record.ownerId + ":" + record.boardId, ...record }); tx.oncomplete = () => db.close(); tx.onerror = () => db.close(); };
}
export function sameRecord(a: unknown, b: unknown): boolean { return JSON.stringify(a, (key, value: unknown) => key === "updatedAt" || key === "createdAt" ? undefined : value) === JSON.stringify(b, (key, value: unknown) => key === "updatedAt" || key === "createdAt" ? undefined : value); }
/** Three-way recovery. Concurrent note edits retain the server note AND a new local conflict copy. */
export function reconcileBoard(remote: BoardContents, cached: CachedBoard): BoardContents {
  if (!cached.pending) return remote;
  const base = new Map(cached.baseline.notes.map((note) => [note.id, note]));
  const server = new Map(remote.notes.map((note) => [note.id, note]));
  const notes = [...remote.notes];
  for (const local of cached.working.notes) {
    const previous = base.get(local.id); if (sameRecord(local, previous)) continue;
    const other = server.get(local.id);
    if (sameRecord(local, other)) continue;
    if (!other && previous || other && previous && !sameRecord(other, previous)) {
      // Remote purge or concurrent edit: never resurrect/overwrite the server record.
      const id = createId(); notes.push({ ...local, id, createdBy: cached.ownerId, title: `${local.title || "Untitled"} (offline conflict copy)`, deletedAt: null, archived: false, locked: false, recurrenceSourceId: null, subtasks: local.subtasks.map((item) => ({ ...item, id: createId(), noteId: id })) });
    } else { const index = notes.findIndex((note) => note.id === local.id); if (index < 0) notes.push(local); else notes[index] = local; }
  }
  const localLaneIds = new Set(cached.working.lanes.map((lane) => lane.id));
  const lanes = remote.lanes.filter((lane) => localLaneIds.has(lane.id) || !cached.baseline.lanes.some((previous) => previous.id === lane.id && sameRecord(previous, lane)));
  for (const lane of cached.working.lanes) {
    const previous = cached.baseline.lanes.find((item) => item.id === lane.id);
    const index = lanes.findIndex((item) => item.id === lane.id);
    if (index < 0 && !previous) {
      if(lanes.length>=MAX_LANES)throw Error("Concurrent columns exceed the 12-column limit. Your local changes remain in the device backup; remove a local column and retry.");
      lanes.push(lane);
    } else if (!sameRecord(lane, previous) && !sameRecord(lane, lanes[index])) {
      if(index>=0&&sameRecord(lanes[index],previous))lanes[index]=lane;
      else {
        if(lanes.length>=MAX_LANES)throw Error("A column changed concurrently and there is no room for a conflict copy. Your local changes remain in the device backup; remove a local column and retry.");
        lanes.push({...lane,id:createId(),name:lane.name.slice(0,43)+" (conflict copy)",position:lanes.length});
      }
    }
  }
  const laneIds = new Set(lanes.map((lane) => lane.id)); const fallback = lanes[0]?.id;
  return { lanes, notes: notes.map((note): Note => fallback && !laneIds.has(note.laneId) ? { ...note, laneId: fallback } : note) };
}
