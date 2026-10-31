"use client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type { PurgeTarget } from "./model";
export async function purgeCloudNotes(boardId:string,targets:readonly PurgeTarget[]):Promise<string[]>{
 const {data,error}=await getSupabaseBrowserClient().rpc("purge_trashed_notes",{p_board_id:boardId,p_notes:targets.map((target)=>({id:target.id,deleted_at:target.deletedAt})) as Json});
 if(error)throw Error(error.code==="PGRST202"?"Trash deletion is not ready. Apply migration 0006, then retry.":"Permanent deletion was not confirmed. Reload Trash to check its state, then retry.");
 const ids=data??[];
 if(ids.length!==targets.length||!targets.every((target)=>ids.includes(target.id)))throw Error("Deletion result changed. Reload this board before continuing.");
 return ids;
}
/** Bytes are removed via Storage API, never direct SQL against storage.objects.
 * Durable queue survives client closure or failed Storage requests after commit. */
export async function cleanupDeletedFiles():Promise<void>{
 const client=getSupabaseBrowserClient();
 const {data,error}=await client.from("note_file_cleanup").select("*").order("created_at",{ascending:true}).limit(101);
 if(error)throw Error("File cleanup could not be checked. Retry file cleanup.");
 for(const entry of (data??[]).slice(0,100)){
  const {error:storageError}=await client.storage.from(entry.bucket).remove([entry.storage_path]);
  if(storageError)throw Error("Notes are deleted; some attachment files await cleanup. Retry file cleanup.");
  const {error:queueError}=await client.from("note_file_cleanup").delete().eq("id",entry.id);
  if(queueError)throw Error("File cleanup acknowledgement failed. Retry file cleanup.");
 }
 if((data??[]).length>100)throw Error("More attachment files await cleanup. Retry file cleanup to continue.");
}
