import type { Note } from "@/types/note";
import type { Lane } from "@/types/lane";
import { LOCAL_VOCABULARY_KEY } from "./vocabulary";
export const IMPORT_RECOVERY_KEY="tackly:import-recovery";
interface Contents { notes: readonly Note[]; lanes: readonly Lane[]; }
export function stageImport(previous: Contents, next: Contents): void {
 const recovery={notes:previous.notes,lanes:previous.lanes,vocabulary:localStorage.getItem(LOCAL_VOCABULARY_KEY)};
 localStorage.setItem(IMPORT_RECOVERY_KEY,JSON.stringify(recovery));
 try { localStorage.setItem("tackly:notes",JSON.stringify({state:{notes:next.notes},version:1}));localStorage.setItem("tackly:lanes",JSON.stringify({state:{lanes:next.lanes},version:1})); }
 catch(error){recoverInterruptedImport();throw error;}
}
export function finishImport():void{localStorage.removeItem(IMPORT_RECOVERY_KEY);}
/** A tab closing between the two persistent writes restores the complete pre-import snapshot. */
export function recoverInterruptedImport():boolean{
 const raw=localStorage.getItem(IMPORT_RECOVERY_KEY);if(!raw)return false;
 const value=JSON.parse(raw) as {notes:Note[];lanes:Lane[];vocabulary:string|null};
 if(!Array.isArray(value.notes)||!Array.isArray(value.lanes)||!(value.vocabulary===null||typeof value.vocabulary==="string"))throw Error("Import recovery snapshot is unreadable. Keep this browser data and retry storage recovery.");
 localStorage.setItem("tackly:notes",JSON.stringify({state:{notes:value.notes},version:1}));localStorage.setItem("tackly:lanes",JSON.stringify({state:{lanes:value.lanes},version:1}));
 if(value.vocabulary===null)localStorage.removeItem(LOCAL_VOCABULARY_KEY);else localStorage.setItem(LOCAL_VOCABULARY_KEY,value.vocabulary);
 finishImport();return true;
}
