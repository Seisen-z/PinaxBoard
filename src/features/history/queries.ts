"use client";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-client";
import { noteFromRow } from "@/lib/mappers/note";
import { parseSnapshot, type NoteActivity, type NoteHistory, type NoteVersion } from "./model";
import type { Note } from "@/types/note";
export function useCloudHistory(noteId:string,ownerId:string|null,open:boolean){
  return useQuery<NoteHistory,Error>({queryKey:queryKeys.noteHistory(noteId,ownerId??"local"),enabled:Boolean(ownerId)&&open,queryFn:async()=>{
    const db=getSupabaseBrowserClient();
    const [events,versions]=await Promise.all([
      db.from("note_activity").select("*").eq("note_id",noteId).order("created_at",{ascending:false}).limit(100),
      db.from("note_versions").select("*").eq("note_id",noteId).order("updated_at",{ascending:false}).limit(20),
    ]);
    if(events.error||versions.error){const error=events.error??versions.error;throw new Error(["42P01","PGRST205"].includes(error!.code)?"History migration 0005 is not ready. Apply it, then retry.":`Could not load history: ${error!.message}`);}
    return {activity:(events.data??[]).map((event)=>({id:event.id,noteId:event.note_id,kind:event.kind as NoteActivity["kind"],createdAt:event.created_at,snapshotSkipped:event.snapshot_skipped})),versions:(versions.data??[]).map((version):NoteVersion=>{
      const snapshot=parseSnapshot(version.snapshot);if(!snapshot)throw Error("A saved version is invalid; it was not loaded for restoration.");
      return {id:version.id,noteId:version.note_id,reason:version.reason,snapshot,createdAt:version.created_at,updatedAt:version.updated_at};
    })};
  }});
}
export async function restoreCloudVersion(note:Note,version:NoteVersion):Promise<Note>{
  const {data,error}=await getSupabaseBrowserClient().rpc("restore_note_version",{p_note_id:note.id,p_version_id:version.id,p_expected_updated_at:version.updatedAt}).single();
  if(error||!data)throw Error(error?.message??"Version was not restored. Please retry.");
  return noteFromRow(data,{fallbackLaneId:note.laneId,tagIds:note.tagIds});
}
