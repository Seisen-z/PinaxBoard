"use client";
import { useCallback, useEffect, useRef } from "react";
import { LOCAL_BOARD_CONTEXT, useNoteStore } from "@/stores/note-store";
import type { Note } from "@/types/note";
import { useLocalHistoryStore } from "./local-history";
import { changeKinds } from "./model";

/** Only signed-out local records; cloud history comes from database triggers/queries. */
export function useLocalHistory(enabled:boolean){
  const pending=useRef(new Map<string,{old:Note;next:Note}>());
  const flush=useCallback(()=>{
    for(const item of pending.current.values())useLocalHistoryStore.getState().record(item.old,item.next);
    pending.current.clear();
  },[]);
  useEffect(()=>{
    if(!enabled)return;
    const eligible=(note:Note)=>note.boardId===LOCAL_BOARD_CONTEXT.boardId&&note.ownerId===LOCAL_BOARD_CONTEXT.ownerId;
    useNoteStore.getState().notes.filter(eligible).forEach((note)=>useLocalHistoryStore.getState().hydrate(note));
    let timer:ReturnType<typeof setTimeout>|undefined;
    const unsubscribe=useNoteStore.subscribe((state,previous)=>{
      if(state.notes===previous.notes)return;
      const oldById=new Map(previous.notes.filter(eligible).map((note)=>[note.id,note]));
      for(const next of state.notes.filter(eligible)){
        const old=oldById.get(next.id)??null;
        const restored=state.lastRestoration!==previous.lastRestoration&&state.lastRestoration?.noteId===next.id;
        const kinds=changeKinds(old,next,restored);
        if(!kinds.length)continue;
        if(old&&kinds.length===1&&kinds[0]==="edited"&&!restored){
          const prior=pending.current.get(next.id);pending.current.set(next.id,{old:prior?.old??old,next});
          clearTimeout(timer);timer=setTimeout(flush,1000);
        } else {
          const prior=pending.current.get(next.id);
          if(prior){useLocalHistoryStore.getState().record(prior.old,prior.next);pending.current.delete(next.id);}
          useLocalHistoryStore.getState().record(old,next,restored);
        }
      }
      for(const old of previous.notes.filter(eligible))if(!old.deletedAt&&!state.notes.some((note)=>note.id===old.id)){
        const prior=pending.current.get(old.id);if(prior){useLocalHistoryStore.getState().record(prior.old,prior.next);pending.current.delete(old.id);}
        useLocalHistoryStore.getState().record(old,{...old,deletedAt:new Date().toISOString()});
      }
    });
    const visibility=()=>{if(document.visibilityState==="hidden")flush();};
    document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",flush);
    return()=>{unsubscribe();clearTimeout(timer);flush();document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",flush);};
  },[enabled,flush]);
  return {flush};
}
