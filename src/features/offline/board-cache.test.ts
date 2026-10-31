import { beforeEach, describe, expect, it } from "vitest";
import { readCachedBoard, writeCachedBoard, reconcileBoard, type CachedBoard } from "./board-cache";
import { createBlankNote } from "@/features/notes/create-note";
import { createDefaultLanes } from "@/stores/lane-store";
const make=()=>{const lanes=createDefaultLanes("b");const note=createBlankNote({boardId:"b",ownerId:"o",laneId:lanes[0]!.id});note.title="Original";return{notes:[note],lanes};};
describe("offline recovery",()=>{beforeEach(()=>localStorage.clear());
 it("journals an owner-scoped board without consuming it",()=>{const working=make();writeCachedBoard({ownerId:"o",boardId:"b",working,baseline:working,pending:true,revision:1});expect(readCachedBoard("o","b")?.working.notes).toHaveLength(1);expect(readCachedBoard("different","b")).toBeNull();expect(readCachedBoard("o","b")).not.toBeNull();});
 it("recovers a local edit when the server is unchanged",()=>{const baseline=make();const working={...baseline,notes:[{...baseline.notes[0]!,title:"Offline"}]};expect(reconcileBoard(baseline,{ownerId:"o",boardId:"b",baseline,working,pending:true,revision:1}).notes[0]?.title).toBe("Offline");});
 it("keeps both versions for concurrent edits",()=>{const baseline=make(),working={...baseline,notes:[{...baseline.notes[0]!,title:"Offline"}]},remote={...baseline,notes:[{...baseline.notes[0]!,title:"Other device"}]};const cached:CachedBoard={ownerId:"o",boardId:"b",baseline,working,pending:true,revision:1};const result=reconcileBoard(remote,cached);expect(result.notes.map((note)=>note.title)).toEqual(["Other device","Offline (offline conflict copy)"]);expect(new Set(result.notes.map((note)=>note.id)).size).toBe(2);});
 it("does not resurrect a remotely purged note under its old identity",()=>{const baseline=make(),working={...baseline,notes:[{...baseline.notes[0]!,title:"Offline"}]};const result=reconcileBoard({...baseline,notes:[]},{ownerId:"o",boardId:"b",baseline,working,pending:true,revision:1});expect(result.notes[0]?.id).not.toBe(baseline.notes[0]!.id);});
 it("prefers server facts when the device has no pending edits",()=>{const baseline=make();expect(reconcileBoard({...baseline,notes:[]},{ownerId:"o",boardId:"b",baseline,working:baseline,pending:false,revision:1}).notes).toEqual([]);});
 it("surfaces quota failures instead of claiming a successful durable save",()=>{const working=make();const method=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error("Quota");};try{expect(()=>writeCachedBoard({ownerId:"o",boardId:"b",working,baseline:working,pending:true,revision:1})).toThrow("Quota");}finally{Storage.prototype.setItem=method;}});
});

it("preserves concurrent column renames instead of silently discarding the local name",()=>{
 const baseline=make(),working={...baseline,lanes:baseline.lanes.map((lane,i)=>i===0?{...lane,name:"My rename"}:lane)},remote={...baseline,lanes:baseline.lanes.map((lane,i)=>i===0?{...lane,name:"Their rename"}:lane)};
 const result=reconcileBoard(remote,{ownerId:"o",boardId:"b",baseline,working,pending:true,revision:1});
 expect(result.lanes.map(lane=>lane.name)).toContain("Their rename");expect(result.lanes.map(lane=>lane.name)).toContain("My rename (conflict copy)");expect(new Set(result.lanes.map(lane=>lane.id)).size).toBe(result.lanes.length);
});
it("preserves a locally renamed column after its remote deletion",()=>{
 const baseline=make(),working={...baseline,lanes:baseline.lanes.map((lane,i)=>i===0?{...lane,name:"Keep local name"}:lane)},remote={...baseline,lanes:baseline.lanes.slice(1)};
 const result=reconcileBoard(remote,{ownerId:"o",boardId:"b",baseline,working,pending:true,revision:1});expect(result.lanes.map(lane=>lane.name)).toContain("Keep local name (conflict copy)");
});
it("keeps the journal intact when concurrent columns would exceed the limit",()=>{
 const baseline=make();const lanes=Array.from({length:12},(_,i)=>({...baseline.lanes[0]!,id:"lane-"+i,name:"Column "+i,position:i}));const base={...baseline,lanes};const working={...base,lanes:lanes.map((lane,i)=>i===0?{...lane,name:"Mine"}:lane)},remote={...base,lanes:lanes.map((lane,i)=>i===0?{...lane,name:"Theirs"}:lane)};
 const cached={ownerId:"o",boardId:"b",baseline:base,working,pending:true,revision:1};writeCachedBoard(cached);expect(()=>reconcileBoard(remote,cached)).toThrow(/conflict copy/);expect(readCachedBoard("o","b")?.working.lanes[0]?.name).toBe("Mine");
});
