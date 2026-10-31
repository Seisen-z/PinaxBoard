import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { ImportExportDialog } from "./import-export-dialog";
import { useNoteStore, LOCAL_BOARD_CONTEXT } from "@/stores/note-store";
import { useLaneStore } from "@/stores/lane-store";
import { MOCK_TAGS } from "@/features/board/mock-board";
import { makeBackup, serializeExport } from "@/features/import-export/format";
function mount(){return render(<ImportExportDialog open onOpenChange={()=>{}} board={null} scope={LOCAL_BOARD_CONTEXT} ready/>);}
describe("import/export dialog",()=>{
 it("previews a valid import and changes records only after explicit confirmation",async()=>{
  const original=useNoteStore.getState().notes;const backup={...makeBackup("board",null,useLaneStore.getState().lanes,[original[0]!]),tags:MOCK_TAGS,categories:[]};const data=serializeExport("backup",backup).text;
  mount();const file=new File([data],"backup.json",{type:"application/json"});Object.defineProperty(file,"text",{value:async()=>data});fireEvent.change(screen.getByLabelText("Choose import file"),{target:{files:[file]}});
  await screen.findByRole("button",{name:"Confirm import"});expect(useNoteStore.getState().notes).toHaveLength(original.length);
  await userEvent.click(screen.getByRole("button",{name:"Confirm import"}));expect(useNoteStore.getState().notes).toHaveLength(original.length+1);expect(new Set(useNoteStore.getState().notes.map((note)=>note.id)).size).toBe(original.length+1);
 });
 it("rejects malformed files without touching stores",async()=>{mount();const original=useNoteStore.getState().notes;const file=new File(["{"],"bad.json",{type:"application/json"});Object.defineProperty(file,"text",{value:async()=>"{"});fireEvent.change(screen.getByLabelText("Choose import file"),{target:{files:[file]}});await waitFor(()=>expect(screen.getByRole("alert")).toHaveTextContent("invalid"));expect(useNoteStore.getState().notes).toBe(original);});
 it("offers actual note, board and workspace scope controls",()=>{mount();expect(screen.getByRole("combobox",{name:"Export scope"})).toHaveValue("board");expect(screen.getByRole("option",{name:"Note"})).toBeInTheDocument();expect(screen.getByRole("option",{name:"Workspace"})).toBeInTheDocument();});
});
