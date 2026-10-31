import { describe,it,expect } from "vitest";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { changeKinds,contentSnapshot,EMPTY_HISTORY,parseSnapshot,recordHistory,restoredNote,sameContent } from "./model";
import { useLocalHistoryStore,historyKey } from "./local-history";
const note=()=>({...MOCK_NOTES[0]!,title:"Original",excerpt:"Old body",content:null,subtasks:[]});
const at=(seconds:number)=>new Date(2026,9,14,12,0,seconds).toISOString();
describe("meaningful history",()=>{
  it("seeds an immutable baseline without inventing a Created event",()=>{
    const n=note(),history=recordHistory(EMPTY_HISTORY,n,n,at(0),false,true);
    expect(history.versions[0]?.reason).toBe("baseline");expect(history.activity).toEqual([]);
  });
  it("records actual creation and coalesces edit checkpoints, not keystroke rows",()=>{
    const n=note();let history=recordHistory(EMPTY_HISTORY,null,n,at(0));
    for(let i=1;i<=20;i++)history=recordHistory(history,n,{...n,title:`Edit ${i}`},at(i));
    expect(history.versions).toHaveLength(2);expect(history.versions[0]?.snapshot.title).toBe("Original");expect(history.versions[1]?.snapshot.title).toBe("Edit 20");
    expect(history.activity.map((event)=>event.kind)).toEqual(["created","edited"]);
    history=recordHistory(history,n,{...n,title:"Later"},at(100));expect(history.versions).toHaveLength(3);
  });
  it("does not record updatedAt-only changes or JSON key-order echoes",()=>{
    const a={...note(),content:{type:"doc",content:[{type:"paragraph"}]}},b={...a,content:{content:[{type:"paragraph"}],type:"doc"},updatedAt:at(10)};
    expect(sameContent(a,b)).toBe(true);expect(changeKinds(a,b)).toEqual([]);
  });
  it("tracks movement, completion, archive, restore, delete and metadata edits",()=>{
    const n=note();expect(changeKinds(n,{...n,laneId:"other"})).toContain("moved");
    expect(changeKinds({...n,completed:false},{...n,completed:true})).toContain("completed");
    expect(changeKinds(n,{...n,archived:true})).toContain("archived");expect(changeKinds({...n,archived:true},n)).toContain("restored");
    expect(changeKinds(n,{...n,deletedAt:at(1)})).toContain("deleted");expect(changeKinds(n,{...n,priority:"urgent"})).toContain("edited");
    expect(changeKinds(n,n,true)).toEqual(["restored"]);
  });
  it("retains at most 20 versions and 100 events",()=>{
    const n=note();let history=recordHistory(EMPTY_HISTORY,null,n,at(0));
    for(let i=1;i<=130;i++)history=recordHistory(history,n,{...n,title:String(i),laneId:String(i)},new Date(Date.parse(at(0))+i*61000).toISOString());
    expect(history.versions.length).toBeLessThanOrEqual(20);expect(history.activity.length).toBeLessThanOrEqual(100);
  });
  it("skips oversized snapshots while retaining readable activity",()=>{
    const n=note(),history=recordHistory(EMPTY_HISTORY,n,{...n,excerpt:"x".repeat(530000)},at(1));
    expect(history.versions).toHaveLength(1);expect(history.activity[0]?.snapshotSkipped).toBe(true);
  });
  it("restores content/checklist while preserving identity, dates and repeat metadata",()=>{
    const n={...note(),completed:true,completedAt:at(0),repeatRule:{frequency:"daily" as const,anchorDay:14,anchorMonth:9},remindAt:at(5)};
    const snapshot={...contentSnapshot(n),title:"Previous",excerpt:"Recovered",subtasks:[{id:"task",noteId:n.id,title:"Todo",completed:false,position:0}]};
    const restored=restoredNote(n,snapshot,at(10));
    expect(restored.title).toBe("Previous");expect(restored.completed).toBe(false);expect(restored.completedAt).toBeNull();
    expect(restored.repeatRule).toEqual(n.repeatRule);expect(restored.remindAt).toBe(n.remindAt);expect(restored.id).toBe(n.id);expect(restored.laneId).toBe(n.laneId);
    expect(parseSnapshot(snapshot)).toBeTruthy();expect(parseSnapshot({title:3})).toBeNull();
  });
  it("persists owner/board-scoped local history without losing current note edits",()=>{
    useLocalHistoryStore.setState({histories:{},errors:{},pending:{}});const n=note();useLocalHistoryStore.getState().hydrate(n);useLocalHistoryStore.getState().record(n,{...n,title:"New"});
    const key=historyKey(n);expect(localStorage.getItem(`tackly:history:${key}`)).toBeTruthy();
    useLocalHistoryStore.setState({histories:{},errors:{},pending:{}});useLocalHistoryStore.getState().hydrate(n);expect(useLocalHistoryStore.getState().histories[key]?.versions).toHaveLength(2);
    expect(historyKey({...n,ownerId:"other"})).not.toBe(key);
  });
});
