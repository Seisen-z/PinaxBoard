"use client";
import { create } from "zustand";
export type BoardRole = "owner" | "editor" | "viewer";
interface AccessState { boardId: string | null; actorId: string | null; role: BoardRole | null; }
export const useBoardAccess = create<AccessState>(() => ({ boardId: null, actorId: null, role: "owner" }));
/** A second client-side guard, not a substitute for database RLS. Local mode is writable. */
export function canWriteBoard(boardId: string): boolean {
 const access=useBoardAccess.getState();return access.boardId === null || access.boardId === boardId && (access.role === "owner" || access.role === "editor");
}
export function guardBoardActions<T extends object>(state:T, board:()=>string, readable: readonly string[]):T {
 return Object.fromEntries(Object.entries(state).map(([key,value])=>[key,typeof value!=="function" || readable.includes(key) ? value : (...args:unknown[])=>{
  if(!canWriteBoard(board())) return key==="addNote" || key==="addLane" ? "" : key==="duplicateNote" ? null : undefined;
  return (value as (...args:unknown[])=>unknown)(...args);
 }])) as T;
}
export function useCanEditBoard():boolean { return useBoardAccess(state=>state.boardId===null || state.role==="owner" || state.role==="editor"); }
