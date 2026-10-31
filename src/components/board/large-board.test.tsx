import { describe, expect, it } from "vitest";
import { render, screen } from "@/test/render";
import { BoardWorkspace } from "./board-workspace";
import { useNoteStore } from "@/stores/note-store";
import { MOCK_NOTES } from "@/features/board/mock-board";
describe("large column rendering",()=>{it("keeps the board DOM bounded when a column contains a thousand notes",()=>{const base=MOCK_NOTES[0]!;useNoteStore.getState().reset(Array.from({length:1000},(_,index)=>({...base,id:`large-${index}`,title:`Note ${index}`,subtasks:[],tagIds:[],content:null,excerpt:"",transform:{...base.transform,zIndex:index+1}})));render(<BoardWorkspace/>);expect(screen.getAllByTestId("paper-note-card").length).toBeLessThan(50);expect(screen.getByText(/of 1000$/)).toBeInTheDocument();});});
