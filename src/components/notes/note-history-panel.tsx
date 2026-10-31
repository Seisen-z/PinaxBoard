"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RichEditor } from "@/components/notes/rich-editor";
import { NoteChecklist } from "@/components/notes/note-checklist";
import { ClayButton } from "@/components/ui/clay-button";
import { resolveDocument } from "@/lib/tiptap/document";
import { queryKeys } from "@/lib/query-client";
import { LOCAL_BOARD_CONTEXT, useNoteStore } from "@/stores/note-store";
import { EMPTY_HISTORY, restoredNote } from "@/features/history/model";
import { historyKey, useLocalHistoryStore } from "@/features/history/local-history";
import { restoreCloudVersion, useCloudHistory } from "@/features/history/queries";
import type { Note } from "@/types/note";

export interface NoteHistoryPanelProps {note:Note;ownerId:string|null;beforeRestore?:()=>Promise<boolean>;onRestored?:(note:Note)=>void;onOpen?:()=>void}
export function NoteHistoryPanel({note,ownerId,beforeRestore,onRestored,onOpen}:NoteHistoryPanelProps){
  const [open,setOpen]=useState(false),[selected,setSelected]=useState<string|null>(null),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
  const scopeReady=ownerId?note.ownerId===ownerId:note.ownerId===LOCAL_BOARD_CONTEXT.ownerId&&note.boardId===LOCAL_BOARD_CONTEXT.boardId;
  const local=useLocalHistoryStore((state)=>state.histories[historyKey(note)]??EMPTY_HISTORY);
  const localError=useLocalHistoryStore((state)=>state.errors[historyKey(note)]??null);
  const restoring=useNoteStore((state)=>state.restoringNoteId);
  const cloud=useCloudHistory(note.id,scopeReady?ownerId:null,open),client=useQueryClient();
  const history=!scopeReady?EMPTY_HISTORY:ownerId?cloud.data??EMPTY_HISTORY:local;
  const version=history.versions.find((item)=>item.id===selected)??null;
  const restore=async()=>{
    if(!version||note.locked||localError||useNoteStore.getState().restoringNoteId)return;
    setError(null);setNotice(null);useNoteStore.getState().setRestoring(note.id);
    try{
      if(beforeRestore&&!await beforeRestore())throw Error("Pending edits were not saved. Retry saving before restoring.");
      const state=useNoteStore.getState(),current=state.notes.find((item)=>item.id===note.id);
      if(!current||state.boardContext.boardId!==note.boardId||state.boardContext.ownerId!==note.ownerId)throw Error("The open board changed. Reopen the note before restoring.");
      if(!ownerId&&useLocalHistoryStore.getState().errors[historyKey(note)])throw Error("History was not saved. Retry history before restoring.");
      const latest=ownerId?version:useLocalHistoryStore.getState().histories[historyKey(note)]?.versions.find((item)=>item.id===version.id);
      if(!latest||latest.updatedAt!==version.updatedAt||(!ownerId&&JSON.stringify(latest.snapshot)!==JSON.stringify(version.snapshot)))throw Error("Version changed; refresh and preview it again.");
      const next=ownerId?await restoreCloudVersion(current,latest):restoredNote(current,latest.snapshot,new Date().toISOString());
      if(onRestored)onRestored(next);else useNoteStore.getState().applyRestoredNote(next);
      if(ownerId)await client.invalidateQueries({queryKey:queryKeys.noteHistory(note.id,ownerId)});
      setNotice("Version restored. Your previous state remains in history.");
    }catch(caught){setError(caught instanceof Error?caught.message:"Version was not restored. Retry.");}
    finally{if(useNoteStore.getState().restoringNoteId===note.id)useNoteStore.getState().setRestoring(null);}
  };
  return <section aria-label="Note history" className="border-t border-current/20 pt-3">
    <ClayButton size="sm" variant="ghost" aria-expanded={open} disabled={!scopeReady} onClick={()=>{if(!open){onOpen?.();if(!ownerId)useLocalHistoryStore.getState().hydrate(note);}setOpen(!open);}}>History</ClayButton>
    {open?<div className="mt-3 flex flex-col gap-4">
      <p className="text-xs text-current/60">Up to 20 versions and 100 activity entries per note. Edited snapshots coalesce for 60 seconds; snapshots over 512 KiB are skipped. Versions restore title, text and checklist, not dates, appearance, tags or repeats. Unfinished restored checklist items reopen a completed note.</p>
      {ownerId&&cloud.isLoading?<p role="status">Loading history...</p>:null}
      {(error||localError||(ownerId&&cloud.error))?<p role="alert">{error||localError||cloud.error?.message} <button type="button" onClick={()=>{setError(null);if(ownerId)void cloud.refetch();else useLocalHistoryStore.getState().retry(note);}}>Retry history</button></p>:null}
      {notice?<p role="status">{notice}</p>:null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><h3 className="text-sm font-semibold">Saved versions</h3>
          {!history.versions.length&&!cloud.isLoading?<p className="mt-2 text-xs text-current/60">No saved versions yet. Meaningful edits create checkpoints.</p>:null}
          <ul className="mt-2 max-h-48 overflow-y-auto">{[...history.versions].sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)).map((item)=><li key={item.id}><button type="button" aria-pressed={selected===item.id} className="w-full rounded-sm py-2 text-left text-xs hover:bg-surface-raised" onClick={()=>{setSelected(item.id);setNotice(null);}}>{item.snapshot.title||"Untitled note"} / {item.reason} / {new Date(item.updatedAt).toLocaleString()}</button></li>)}</ul>
        </div>
        <div><h3 className="text-sm font-semibold">Activity</h3>
          {!history.activity.length&&!cloud.isLoading?<p className="mt-2 text-xs text-current/60">No recorded activity yet.</p>:null}
          <ul className="mt-2 max-h-48 overflow-y-auto">{[...history.activity].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).map((item)=><li key={item.id} className="py-1.5 text-xs">{item.kind[0]!.toUpperCase()+item.kind.slice(1)} / {new Date(item.createdAt).toLocaleString()}{item.snapshotSkipped?" / Snapshot skipped: size limit":""}</li>)}</ul>
        </div>
      </div>
      {version?<div className="rounded-[var(--radius-sm)] border border-current/20 p-3">
        <h3 className="mb-2 text-sm font-semibold">Version preview: {version.snapshot.title||"Untitled note"}</h3>
        <div className="max-h-64 overflow-y-auto"><RichEditor key={`${version.id}:${version.updatedAt}`} document={resolveDocument(version.snapshot.content,version.snapshot.excerpt)} editable={false} variant="card" ariaLabel="Version preview" /><NoteChecklist subtasks={version.snapshot.subtasks}/></div>
        <ClayButton size="sm" className="mt-3" disabled={note.locked||Boolean(restoring)||Boolean(ownerId&&cloud.error)||Boolean(!ownerId&&localError)} onClick={()=>void restore()}>{restoring===note.id?"Restoring...":"Restore this version"}</ClayButton>
        {note.locked?<p className="mt-1 text-xs">Unlock this note before restoring.</p>:null}
      </div>:null}
    </div>:null}
  </section>;
}
