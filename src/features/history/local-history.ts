"use client";
import { create } from "zustand";
import type { Note } from "@/types/note";
import { EMPTY_HISTORY, parseSnapshot, recordHistory, type NoteHistory, type NoteVersion, type NoteActivity } from "./model";
export const historyKey=(note: Pick<Note,"ownerId"|"boardId"|"id">)=>`${note.ownerId}:${note.boardId}:${note.id}`;
interface LocalHistoryState {
  histories: Record<string,NoteHistory>; errors: Record<string,string>; pending: Record<string,NoteHistory>;
  retry: (note:Note)=>void;
  forget: (note:Note)=>void;
  hydrate: (note: Note)=>void;
  record: (old: Note|null,next: Note,restored?:boolean,seed?:boolean)=>void;
}
export const useLocalHistoryStore=create<LocalHistoryState>((set,get)=>({
  histories:{},errors:{},pending:{},
  forget:(note)=>{const key=historyKey(note);localStorage.removeItem(`tackly:history:${key}`);set((state)=>{const histories={...state.histories},errors={...state.errors},pending={...state.pending};delete histories[key];delete errors[key];delete pending[key];return {histories,errors,pending};});},
  retry:(note)=>{
    const key=historyKey(note),candidate=get().pending[key];
    if(!candidate){get().hydrate(note);return;}
    try{localStorage.setItem(`tackly:history:${key}`,JSON.stringify(candidate));set((state)=>{const pending={...state.pending};delete pending[key];return {histories:{...state.histories,[key]:candidate},errors:{...state.errors,[key]:""},pending};});}
    catch{set((state)=>({errors:{...state.errors,[key]:"History was not saved. Note edits remain intact; retry after freeing browser storage."}}));}
  },
  hydrate: (note)=>{
    const key=historyKey(note);
    if(get().histories[key])return;
    try {
      const raw:unknown=JSON.parse(localStorage.getItem(`tackly:history:${key}`)??"null");
      if (!raw) {get().record(note,note,false,true);return;}
      if(typeof raw!=="object")throw Error("History storage is invalid.");
      const value=raw as {versions?:unknown;activity?:unknown};
      if(!Array.isArray(value.versions)||!Array.isArray(value.activity))throw Error("History storage is invalid.");
      const versions=value.versions.filter((item:NoteVersion)=>item.noteId===note.id&&typeof item.id==="string"&&typeof item.reason==="string"&&Number.isFinite(Date.parse(item.updatedAt))&&Number.isFinite(Date.parse(item.createdAt))&&parseSnapshot(item.snapshot)).slice(-20);
      const activity=value.activity.filter((item:NoteActivity)=>item.noteId===note.id&&typeof item.id==="string"&&["created","edited","moved","completed","archived","restored","deleted"].includes(item.kind)&&Number.isFinite(Date.parse(item.createdAt))).slice(-100);
      set((state)=>({histories:{...state.histories,[key]:{versions,activity}}}));
    } catch {set((state)=>({errors:{...state.errors,[key]:"History could not be read. Existing note edits are intact; retry after checking browser storage."}}));}
  },
  record:(old,next,restored=false,seed=false)=>{
    const key=historyKey(next),history=recordHistory(get().pending[key]??get().histories[key]??EMPTY_HISTORY,old,next,new Date().toISOString(),restored,seed);
    try {localStorage.setItem(`tackly:history:${key}`,JSON.stringify(history));set((state)=>{const pending={...state.pending};delete pending[key];return {histories:{...state.histories,[key]:history},errors:{...state.errors,[key]:""},pending};});}
    catch {set((state)=>({pending:{...state.pending,[key]:history},errors:{...state.errors,[key]:"History was not saved. Note edits remain intact; retry after freeing browser storage."}}));}
  },
}));
