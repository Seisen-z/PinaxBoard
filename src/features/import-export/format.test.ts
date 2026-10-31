import { describe, expect, it } from "vitest";
import { materializeImport, makeBackup, parseImport, serializeExport } from "@/features/import-export/format";
import { createDefaultLanes } from "@/stores/lane-store";
import { createBlankNote } from "@/features/notes/create-note";

describe("import/export format", () => {
  const boardId = "board-a"; const ownerId = "owner-a"; const lanes = createDefaultLanes(boardId);
  it("round-trips a backup as new records without overwriting the active notes", () => {
    const original = createBlankNote({ boardId, ownerId, laneId: lanes[0]!.id }); original.title = "Keep me";
    const backup = makeBackup("board", null, lanes, [original]);
    const parsed = parseImport(serializeExport("backup", backup).text, "json");
    const restored = materializeImport(parsed, boardId, ownerId, lanes, [original]);
    expect(restored.notes).toHaveLength(2);
    expect(restored.notes[0]).toBe(original);
    expect(restored.notes[1]).toMatchObject({ title: "Keep me", boardId, ownerId });
    expect(restored.notes[1]!.id).not.toBe(original.id);
  });
  it("rejects malformed JSON before producing an import draft", () => {
    expect(() => parseImport('{oops', "json")).toThrow("invalid");
  });
  it("imports quoted CSV text and keeps commas in content", () => {
    const parsed = parseImport('title,content\n"A, note","hello, world"', "csv");
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]).toMatchObject({ title: "A, note", excerpt: "hello, world" });
  });
  it("exports readable markdown", () => {
    const note = createBlankNote({ boardId, ownerId, laneId: lanes[0]!.id }); note.title = "Read me"; note.excerpt = "Body";
    const backup = makeBackup("note", null, lanes, [note]);
    expect(serializeExport("markdown", backup).text).toContain("# Read me");
  });
});

it("rejects the entire malformed batch instead of silently importing valid rows", () => {
 const note=createBlankNote({boardId:"b",ownerId:"o",laneId:"lane-todo"});
 expect(()=>parseImport(JSON.stringify([note,{title:"bad"}]),"json")).toThrow("invalid");
});
it("preserves checklist, appearance, scheduling, canvas and lifecycle fields on restore", () => {
 const lanes=createDefaultLanes("b"); const note=createBlankNote({boardId:"b",ownerId:"o",laneId:lanes[0]!.id});
 note.title="Full backup";note.subtasks=[{id:"task",noteId:note.id,title:"Do it",completed:true,position:0}];note.dueAt="2026-11-01T10:00:00Z";note.remindAt="2026-11-01T09:00:00Z";note.onCanvas=true;note.locked=true;note.archived=true;note.transform.x=123;
 const draft=parseImport(serializeExport("backup",makeBackup("board",null,lanes,[note])).text,"json");const restored=materializeImport(draft,"new-board","new-owner",lanes,[]).notes[0]!;
 expect(restored).toMatchObject({dueAt:note.dueAt,remindAt:note.remindAt,onCanvas:true,locked:true,archived:true,transform:{x:123}});
 expect(restored.subtasks[0]).toMatchObject({noteId:restored.id,title:"Do it",completed:true});expect(restored.subtasks[0]!.id).not.toBe("task");
});
it("rejects unsupported document nodes and script image sources",()=>{
 const note=createBlankNote({boardId:"b",ownerId:"o",laneId:"lane-todo"});note.content={type:"doc",content:[{type:"image",attrs:{src:"javascript:alert(1)"}}]};
 expect(()=>parseImport(JSON.stringify([note]),"json")).toThrow("unsupported");
});
it("rejects unclosed CSV and future backup versions",()=>{expect(()=>parseImport('title,content\n"unfinished',"csv")).toThrow("unclosed");expect(()=>parseImport('{"format":"tackly-backup","version":99,"notes":[]}',"json")).toThrow();});

it("rejects documents with invalid block nesting before an editor can mount them",()=>{const note=createBlankNote({boardId:"b",ownerId:"o",laneId:"lane-todo"});note.content={type:"doc",content:[{type:"paragraph",content:[{type:"paragraph"}]}]};expect(()=>parseImport(JSON.stringify([note]),"json")).toThrow("unsupported");});
