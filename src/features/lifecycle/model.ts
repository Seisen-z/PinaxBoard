import type { Note } from "@/types/note";
export type LifecycleMode="archive"|"trash";
export interface PurgeTarget {id:string;deletedAt:string}
export function lifecycleNotes(notes:readonly Note[],mode:LifecycleMode,query=""):Note[]{
 const needle=query.trim().toLocaleLowerCase();
 return notes.filter((note)=>(mode==="trash"?Boolean(note.deletedAt):note.archived&&!note.deletedAt)&&(!needle||`${note.title} ${note.excerpt} ${note.subtasks.map((task)=>task.title).join(" ")}`.toLocaleLowerCase().includes(needle)))
 .sort((a,b)=>Date.parse(b.deletedAt??b.updatedAt)-Date.parse(a.deletedAt??a.updatedAt)||a.id.localeCompare(b.id));
}
export function purgeTargets(notes:readonly Note[]):PurgeTarget[]{return notes.filter((note)=>note.deletedAt&&!note.locked).map((note)=>({id:note.id,deletedAt:note.deletedAt!}));}
export function matchesPurge(notes:readonly Note[],targets:readonly PurgeTarget[]):boolean{return targets.length>0&&new Set(targets.map((target)=>target.id)).size===targets.length&&targets.every((target)=>notes.some((note)=>note.id===target.id&&!note.locked&&note.deletedAt===target.deletedAt));}
