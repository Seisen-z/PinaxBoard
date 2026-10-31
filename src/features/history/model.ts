import type { Note, Subtask } from "@/types/note";
import { parseSubtasks } from "@/lib/mappers/note";
import { createId } from "@/lib/utils";
export const VERSION_LIMIT=20, ACTIVITY_LIMIT=100, VERSION_BYTES=512*1024, CHECKPOINT_MS=60_000;
export type ActivityKind="created"|"edited"|"moved"|"completed"|"archived"|"restored"|"deleted";
export interface ContentSnapshot { title: string; content: Note["content"]; excerpt: string; subtasks: Subtask[] }
export interface NoteVersion { id: string; noteId: string; reason: string; snapshot: ContentSnapshot; createdAt: string; updatedAt: string }
export interface NoteActivity { id: string; noteId: string; kind: ActivityKind; createdAt: string; snapshotSkipped: boolean }
export interface NoteHistory { versions: NoteVersion[]; activity: NoteActivity[] }
export const EMPTY_HISTORY: NoteHistory={versions:[],activity:[]};
export function contentSnapshot(note: Note): ContentSnapshot { return {title:note.title,content:note.content,excerpt:note.excerpt,subtasks:note.subtasks}; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value==="object") return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function sameContent(a: Note,b: Note): boolean { return canonical(contentSnapshot(a))===canonical(contentSnapshot(b)); }
export function parseSnapshot(value: unknown): ContentSnapshot | null {
  if (!value || typeof value!=="object") return null;
  const row=value as Record<string,unknown>;
  if(typeof row.title!=="string" || typeof row.excerpt!=="string" || !Array.isArray(row.subtasks)) return null;
  if(row.content!==null && (typeof row.content!=="object" || !row.content || (row.content as {type?:unknown}).type!=="doc"))return null;
  return {title:row.title,excerpt:row.excerpt,content:row.content as Note["content"],subtasks:parseSubtasks(row.subtasks)};
}
export function restoredNote(current: Note,snapshot: ContentSnapshot,updatedAt: string): Note {
  const reopen=current.completed && snapshot.subtasks.some((task)=>!task.completed);
  return {...current,...snapshot,completed:reopen?false:current.completed,completedAt:reopen?null:current.completedAt??null,updatedAt};
}
function repeatMetadata(note:Note){if(!note.repeatRule)return null;const rule={...note.repeatRule};delete rule.nextId;return rule;}
export function changeKinds(old: Note|null,next: Note,restored=false): ActivityKind[] {
  if (!old) return ["created"];
  if (restored) return ["restored"];
  const kinds: ActivityKind[]=[];
  if (next.deletedAt && !old.deletedAt) kinds.push("deleted");
  else if ((!next.deletedAt && old.deletedAt) || (!next.archived && old.archived)) kinds.push("restored");
  else if (next.archived && !old.archived) kinds.push("archived");
  if (next.completed && !old.completed) kinds.push("completed");
  if (old.laneId!==next.laneId || old.transform.x!==next.transform.x || old.transform.y!==next.transform.y) kinds.push("moved");
  if ((!sameContent(old,next) || old.completed!==next.completed || canonical(old.appearance)!==canonical(next.appearance) || old.priority!==next.priority || canonical(repeatMetadata(old))!==canonical(repeatMetadata(next)) || (old.remindAt??null)!==(next.remindAt??null) || old.startAt!==next.startAt || old.dueAt!==next.dueAt || old.pinned!==next.pinned || old.locked!==next.locked || old.onCanvas!==next.onCanvas || canonical(old.tagIds)!==canonical(next.tagIds) || old.categoryId!==next.categoryId) && !kinds.includes("completed")) kinds.push("edited");
  return [...new Set(kinds)];
}
/** A baseline is immutable. Recent edited checkpoints coalesce, never one row per keystroke. */
export function recordHistory(history: NoteHistory,old: Note|null,next: Note,now: string,restored=false,seed=false): NoteHistory {
  const versions=history.versions.map((version)=>({...version}));
  const activity=history.activity.map((event)=>({...event}));
  const fits=(note: Note)=>new TextEncoder().encode(JSON.stringify(contentSnapshot(note))).length<=VERSION_BYTES;
  const add=(note:Note,reason:string)=>{ if(fits(note)) versions.push({id:createId(),noteId:note.id,reason,snapshot:structuredClone(contentSnapshot(note)),createdAt:now,updatedAt:now}); };
  if (!versions.length) add(old??next,seed||old?"baseline":"created");
  const kinds=seed?[]:changeKinds(old,next,restored);
  const changed=old && !sameContent(old,next);
  if(changed && fits(next)) {
    const latest=versions.at(-1),reason=restored?"restored":kinds.includes("completed")?"completed":"edited";
    if(reason==="edited" && latest?.reason==="edited" && Date.parse(now)-Date.parse(latest.createdAt)<CHECKPOINT_MS) { latest.snapshot=structuredClone(contentSnapshot(next));latest.updatedAt=now; }
    else add(next,reason);
  }
  for(const kind of kinds){
    const latest=activity.at(-1);
    if(kind==="edited" && latest?.kind==="edited" && Date.parse(now)-Date.parse(latest.createdAt)<CHECKPOINT_MS) {latest.createdAt=now;latest.snapshotSkipped=Boolean(changed&&!fits(next));}
    else activity.push({id:createId(),noteId:next.id,kind,createdAt:now,snapshotSkipped:Boolean(changed&&!fits(next))});
  }
  return {versions:versions.slice(-VERSION_LIMIT),activity:activity.slice(-ACTIVITY_LIMIT)};
}
