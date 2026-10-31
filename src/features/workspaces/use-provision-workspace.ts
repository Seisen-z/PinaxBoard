"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchWorkspaces, fetchBoards, createWorkspace, createBoard } from "./repository";
import { fetchBoardContents, upsertLanes } from "@/features/notes/repository";
import { createDefaultLanes } from "@/stores/lane-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { queryKeys } from "@/lib/query-client";
import { createId } from "@/lib/utils";
import type { ActiveWorkspace } from "./use-active-workspace";
import type { Workspace } from "@/types/workspace";
import type { Board } from "@/types/board";
const requests=new Map<string,Promise<{workspace:Workspace;board:Board}>>();
/** Provision only an empty account/workspace. Re-read on retry so a partial earlier creation is reused, not duplicated. */
export async function provisionWorkspace(ownerId:string,workspaceId:string|null){
 const workspaces=await fetchWorkspaces();
 const workspace=workspaces.find((item)=>item.id===workspaceId)??workspaces[0]??await createWorkspace({ownerId,name:"Personal",position:0});
 const boards=await fetchBoards(workspace.id);
 const board=boards[0]??await createBoard({ownerId,workspaceId:workspace.id,name:"My board",position:0});
 const contents=await fetchBoardContents(board.id);
 if(!contents.lanes.length)await upsertLanes(createDefaultLanes(board.id).map((lane)=>({...lane,id:createId()})),ownerId);
 return{workspace,board};
}
export function useProvisionWorkspace(ownerId:string|null,state:ActiveWorkspace){
 const client=useQueryClient();const [failure,setFailure]=useState<{key:string;error:Error}|null>(null);const [attempt,setAttempt]=useState(0);
 const workspaceId=state.activeWorkspace?.id??null;const boardId=state.activeBoard?.id??null;const key=`${ownerId}:${workspaceId}`;
 const needed=Boolean(ownerId&&!state.loading&&!state.error&&!boardId);const error=failure?.key===key?failure.error:null;
 useEffect(()=>{
  if(!needed||!ownerId||error)return;
  let alive=true;let task=requests.get(key);
  if(!task){task=provisionWorkspace(ownerId,workspaceId);requests.set(key,task);}
  const current=task;
  void task.then(({workspace,board})=>{if(!alive)return;
   client.setQueryData<Workspace[]>(queryKeys.workspaces(),(old)=>old?.some((item)=>item.id===workspace.id)?old:[...(old??[]),workspace]);
   client.setQueryData<Board[]>(queryKeys.boards(workspace.id),(old)=>old?.some((item)=>item.id===board.id)?old:[...(old??[]),board]);
   useWorkspaceStore.getState().setActiveWorkspace(workspace.id);useWorkspaceStore.getState().setActiveBoard(board.id);
  }).catch((caught:unknown)=>{if(alive)setFailure({key,error:caught instanceof Error?caught:new Error("Workspace setup failed. Retry to continue.")});}).finally(()=>{if(requests.get(key)===current)requests.delete(key);});
  return()=>{alive=false;};
 },[needed,ownerId,workspaceId,key,error,attempt,client]);
 return{busy:needed&&!error,error,retry:()=>{setFailure(null);setAttempt((value)=>value+1);}};
}
