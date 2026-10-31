import { render,screen,within,act } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { AppShell } from "@/components/shell/app-shell";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { historyKey,useLocalHistoryStore } from "@/features/history/local-history";
import { useNoteStore } from "@/stores/note-store";
beforeEach(()=>useLocalHistoryStore.setState({histories:{},errors:{},pending:{}}));
async function open(){act(()=>useNoteStore.getState().expandNote(MOCK_NOTES[0]!.id));await userEvent.click(screen.getByRole("button",{name:"History"}));return within(screen.getByRole("region",{name:"Note history"}));}
describe("shared note history",()=>{
  it("previews and restores earlier content without undoing schedule or creating notes",async()=>{
    render(<AppShell/>);const id=MOCK_NOTES[0]!.id,count=useNoteStore.getState().notes.length,original=useNoteStore.getState().notes[0]!;
    act(()=>{useNoteStore.getState().setTitle(id,"Changed title");useNoteStore.getState().setReminder(id,"2026-10-15T08:00:00.000Z");});
    const panel=await open();await userEvent.click(panel.getByRole("button",{name:new RegExp(`${original.title} / baseline`)}));
    expect(panel.getByRole("textbox",{name:"Version preview"})).toHaveAttribute("contenteditable","false");
    await userEvent.click(panel.getByRole("button",{name:"Restore this version"}));
    expect(await panel.findByText("Version restored. Your previous state remains in history.")).toBeInTheDocument();
    const current=useNoteStore.getState().notes.find((note)=>note.id===id)!;
    expect(current.title).toBe(original.title);expect(current.remindAt).toBe("2026-10-15T08:00:00.000Z");expect(useNoteStore.getState().notes).toHaveLength(count);
    expect(useLocalHistoryStore.getState().histories[historyKey(current)]?.activity.some((event)=>event.kind==="restored")).toBe(true);
  });
  it("shows an honest baseline/empty feed and disables restoring locked notes",async()=>{
    render(<AppShell/>);act(()=>useNoteStore.getState().toggleLock(MOCK_NOTES[0]!.id));
    const panel=await open();await userEvent.click(panel.getByRole("button",{name:/baseline/}));
    expect(panel.getByRole("button",{name:"Restore this version"})).toBeDisabled();expect(panel.getByText("Unlock this note before restoring.")).toBeInTheDocument();
  });
  it("publishes local history-storage errors rather than claiming a saved version",async()=>{
    render(<AppShell/>);const originalSet=Storage.prototype.setItem;vi.spyOn(Storage.prototype,"setItem").mockImplementation(function(this:Storage,key,value){if(key.startsWith("tackly:history:"))throw Error("Quota");originalSet.call(this,key,value);});
    act(()=>useNoteStore.getState().setTitle(MOCK_NOTES[0]!.id,"Unsaved history"));
    const panel=await open();expect(panel.getByRole("alert")).toHaveTextContent("History was not saved");expect(useNoteStore.getState().notes[0]?.title).toBe("Unsaved history");
    await userEvent.click(panel.getByRole("button",{name:/baseline/}));
    expect(panel.getByRole("button",{name:"Restore this version"})).toBeDisabled();
    vi.restoreAllMocks();await userEvent.click(panel.getByRole("button",{name:"Retry history"}));
    expect(panel.queryByRole("alert")).not.toBeInTheDocument();
    expect(panel.getByRole("button",{name:"Restore this version"})).toBeEnabled();
    expect(useLocalHistoryStore.getState().histories[historyKey(useNoteStore.getState().notes[0]!)]?.versions.at(-1)?.snapshot.title).toBe("Unsaved history");
  });
  it("keeps restoration flags transient and protects content while restore is pending",()=>{
    const state=useNoteStore.getState(),note=state.notes[0]!;
    state.setRestoring(note.id);state.setTitle(note.id,"Ignored while busy");expect(useNoteStore.getState().notes[0]?.title).toBe(note.title);
    state.applyRestoredNote({...note,title:"Restored",updatedAt:new Date().toISOString()});expect(useNoteStore.getState().notes[0]?.title).toBe("Restored");expect(useNoteStore.getState().restoringNoteId).toBeNull();
    const saved=JSON.parse(localStorage.getItem("tackly:notes")!);expect(saved.state).not.toHaveProperty("restoringNoteId");
  });
});
