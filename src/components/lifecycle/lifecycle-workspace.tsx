"use client";
import { useBoardAccess, useCanEditBoard } from "@/features/collaboration/access";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";
import { useEffect,useMemo,useState } from "react";
import { Dialog } from "radix-ui";
import { Archive,Trash2,LockKeyhole } from "lucide-react";
import { ClayButton } from "@/components/ui/clay-button";
import { RichEditor } from "@/components/notes/rich-editor";
import { NoteChecklist } from "@/components/notes/note-checklist";
import { resolveDocument } from "@/lib/tiptap/document";
import { useNoteStore,type BoardContext } from "@/stores/note-store";
import { useLaneStore } from "@/stores/lane-store";
import { useLocalHistoryStore } from "@/features/history/local-history";
import { lifecycleNotes,matchesPurge,purgeTargets,type LifecycleMode,type PurgeTarget } from "@/features/lifecycle/model";
import { purgeCloudNotes,cleanupDeletedFiles } from "@/features/lifecycle/repository";
import type { Note } from "@/types/note";
interface Props {mode:LifecycleMode;notes:Note[];scope:BoardContext;ready:boolean;cloud:boolean;boardName:string;beforePurge:()=>Promise<boolean>;onPurged:(ids:readonly string[])=>void}
export function LifecycleWorkspace({mode,notes,scope,ready,cloud,boardName,beforePurge,onPurged}:Props){
 const canEdit=useCanEditBoard();const accessRole=useBoardAccess(state=>state.role);const canPurge=canEdit&&(!cloud||accessRole==="owner");
  const focusReturn = useDialogFocusReturn();
 const [query,setQuery]=useState(""),[preview,setPreview]=useState<string|null>(null),[confirm,setConfirm]=useState<PurgeTarget[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null),[cleanupError,setCleanupError]=useState<string|null>(null);
 const rows=useMemo(()=>lifecycleNotes(notes,mode,query),[notes,mode,query]);
 const trash=useMemo(()=>lifecycleNotes(notes,"trash"),[notes]);const eligible=purgeTargets(trash).slice(0,1000);const selected=notes.find((note)=>note.id===preview);
 const cleanup=async()=>{try{await cleanupDeletedFiles();setCleanupError(null);}catch(caught){setCleanupError(caught instanceof Error?caught.message:"File cleanup awaits retry.");}};
 useEffect(()=>{if(cloud)void cleanupDeletedFiles().catch((caught:unknown)=>setCleanupError(caught instanceof Error?caught.message:"File cleanup awaits retry."));},[cloud]);
 const restore=(note:Note)=>{
  if(!canEdit)return;
  const lanes=useLaneStore.getState().lanes;const lane=lanes.some((item)=>item.id===note.laneId)?note.laneId:lanes[0]?.id;
  if(!lane){setError("Create a column on this board before restoring.");return;}
  if(mode==="trash")useNoteStore.getState().restoreFromTrash(note.id,lane);else {useNoteStore.getState().setLane(note.id,lane);useNoteStore.getState().setArchived(note.id,false);}
  setNotice(mode==="trash"&&note.archived?"Restored to Archive.":"Restored to Board.");setError(null);
 };
 const purge=async()=>{
  if(!canPurge||!confirm||busy||!ready)return;setBusy(true);setError(null);
  let committed:string[]|null=null;
  try{
   if(!await beforePurge())throw Error("Pending changes were not saved. Retry saving before permanent deletion.");
   const state=useNoteStore.getState();
   if(state.boardContext.boardId!==scope.boardId||state.boardContext.ownerId!==scope.ownerId)throw Error("Board changed. Reopen Trash and confirm again.");
   const current=state.notes.filter((note)=>note.boardId===scope.boardId&&note.ownerId===scope.ownerId);
   if(!matchesPurge(current,confirm))throw Error("Trash changed. Cancel and confirm the current notes again.");
   const ids=cloud?await purgeCloudNotes(scope.boardId,confirm):confirm.map((target)=>target.id);
   if(!cloud){
    const next=state.notes.filter((note)=>!ids.includes(note.id));
    // Check browser persistence before removing working records; errors retain notes.
    for(const note of current.filter((note)=>ids.includes(note.id)))useLocalHistoryStore.getState().forget(note);
    localStorage.setItem("tackly:notes",JSON.stringify({state:{notes:next},version:1}));
   }
   committed=ids;onPurged(ids);setConfirm(null);setPreview(null);setNotice(`${ids.length} note${ids.length===1?"":"s"} permanently deleted.`);
   if(cloud)await cleanup();
  }catch(caught){
   if(committed){setConfirm(null);setPreview(null);setNotice(`${committed.length} note${committed.length===1?"":"s"} permanently deleted.`);setError("Deletion committed, but the local cache could not finish updating. Reload this board.");}
   else setError(caught instanceof Error?caught.message:"Notes were not deleted. Retry.");
  }
  finally{setBusy(false);}
 };
 return <main id="main-content" tabIndex={-1} aria-label={mode==="trash"?"Trash workspace":"Archive workspace"} className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
  <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
   <div><h1 className="flex items-center gap-2 text-xl font-semibold">{mode==="trash"?<Trash2 size={20}/>:<Archive size={20}/>} {mode==="trash"?"Trash":"Archive"}</h1><p className="mt-1 text-sm text-muted-foreground">{boardName} / {mode==="trash"?"Deleted notes stay here until you restore or permanently delete them.":"Keep old notes without losing their content. Search, open or restore them."}</p></div>
   {mode==="trash"?<ClayButton variant="ghost" className="border border-border text-destructive" disabled={!canPurge||!ready||eligible.length===0||busy} onClick={()=>{setError(null);setConfirm(eligible);}}>Empty trash ({eligible.length})</ClayButton>:null}
  </header>
  <label className="mt-4 flex max-w-lg flex-col gap-1 text-sm">{mode==="trash"?"Search trash":"Search archived notes"}<input type="search" aria-label={mode==="trash"?"Search trash":"Search archived notes"} value={query} onChange={(event)=>setQuery(event.target.value)} className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2"/></label>
  {!ready?<p role="status" className="mt-4 text-muted-foreground">Select a board and wait for its notes to load.</p>:null}
  {error&&!confirm?<p role="alert" className="mt-4 text-destructive">{error}</p>:null}
  {notice?<p role="status" className="mt-4 text-sm">{notice}</p>:null}
  {cleanupError?<p role="alert" className="mt-3 text-sm">{cleanupError} <button type="button" className="underline" onClick={()=>void cleanup()}>Retry file cleanup</button></p>:null}
  {mode==="trash"&&trash.some((note)=>note.locked)?<p className="mt-3 text-sm text-muted-foreground">Locked notes are kept when emptying trash. Restore a locked note and unlock it before permanent deletion.</p>:null}
  {ready&&!rows.length?<p className="mt-8 text-sm text-muted-foreground">{query?"No matching notes.":mode==="trash"?"Trash is empty.":"Archive is empty."}</p>:null}
  <ul className="mt-4 grid gap-3 lg:grid-cols-2">{rows.map((note)=><li key={`lifecycle-${note.id}`} className="min-w-0 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4">
   <h2 className="flex items-center gap-2 truncate font-medium">{note.title||"Untitled note"}{note.locked?<LockKeyhole size={14} aria-label="Locked"/>:null}</h2>
   <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{note.excerpt||"Empty note"}</p><p className="mt-2 text-xs text-muted-foreground">{mode==="trash"?"Deleted":"Updated"} {new Date(note.deletedAt??note.updatedAt).toLocaleString()}</p>
   <div className="mt-3 flex flex-wrap gap-2"><ClayButton size="sm" variant="ghost" onClick={()=>mode==="trash"?setPreview(preview===note.id?null:note.id):useNoteStore.getState().expandNote(note.id)}>{mode==="trash"?"Preview":"Open note"}</ClayButton><ClayButton size="sm" variant="secondary" disabled={!canEdit||busy||!ready} onClick={()=>restore(note)}>Restore{mode==="trash"&&note.archived?" to Archive":""}</ClayButton>
   {mode==="trash"?<ClayButton size="sm" variant="ghost" className="ml-auto border-l border-border text-destructive" disabled={!canPurge||note.locked||busy||!ready} onClick={()=>{setError(null);setConfirm(purgeTargets([note]));}}>Delete permanently</ClayButton>:<ClayButton size="sm" variant="ghost" className="ml-auto text-destructive" disabled={!canEdit||note.locked||busy||!ready} onClick={()=>useNoteStore.getState().deleteNote(note.id)}>Move to Trash</ClayButton>}</div>
  </li>)}</ul>
  {mode==="trash"&&selected?.deletedAt?<section aria-label="Trash preview" className="mt-4 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4"><h2 className="font-medium">{selected.title||"Untitled note"} / read-only preview</h2><RichEditor key={`trash-preview-${selected.id}`} document={resolveDocument(selected.content,selected.excerpt)} editable={false} ariaLabel="Trash note preview"/><NoteChecklist subtasks={selected.subtasks}/></section>:null}
  <Dialog.Root open={Boolean(confirm)} onOpenChange={(open)=>{if(!open&&!busy)setConfirm(null);}}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-surface-sunken/70"/><Dialog.Content {...focusReturn} className="fixed left-1/2 top-1/2 z-[var(--z-overlay)] max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface-raised p-6" onEscapeKeyDown={(event)=>{if(busy)event.preventDefault();}} onPointerDownOutside={(event)=>{if(busy)event.preventDefault();}}>
   <Dialog.Title className="text-lg font-semibold">Permanently delete {confirm?.length??0} note{confirm?.length===1?"":"s"}?</Dialog.Title><Dialog.Description className="mt-2 text-sm text-muted-foreground">This removes their content, version history and attachments. This action cannot be undone. Only the listed notes from this board are included; locked notes are preserved.</Dialog.Description>
   <ul className="my-4 max-h-40 overflow-y-auto text-sm">{confirm?.map((target)=><li key={`confirm-${target.id}`}>{notes.find((note)=>note.id===target.id)?.title||"Untitled note"}</li>)}</ul>
   {error?<p role="alert" className="mb-4 text-sm text-destructive">{error} <button type="button" className="underline" disabled={busy} onClick={()=>window.location.reload()}>Reload board</button></p>:null}
   <div className="flex justify-end gap-2"><ClayButton variant="ghost" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</ClayButton><ClayButton variant="secondary" className="border border-destructive text-destructive" disabled={busy} onClick={()=>void purge()}>{busy?"Deleting...":"Confirm permanent deletion"}</ClayButton></div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
 </main>;
}
