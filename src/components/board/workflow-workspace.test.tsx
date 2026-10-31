import { act } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@/test/render";
import { BoardWorkspace } from "@/components/board/board-workspace";
import { AppShell } from "@/components/shell/app-shell";
import { getLayout } from "@/config/layouts";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { commitBoardDrop } from "@/features/board/board-dnd";
import { laneToInsert } from "@/lib/mappers/lane";
import { EMPTY_FILTERS } from "@/features/board/filter-notes";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Note } from "@/types/note";

describe("Board workflow", () => {
  it("creates cloud columns on the hydrated board and permits notes to move into them", () => {
    const boardId = "c742220c-504e-419e-9119-24590b4ba2a6";
    const base = MOCK_NOTES[0]!;
    const lanes = useLaneStore.getState().lanes.map((lane) => ({ ...lane, boardId }));
    useLaneStore.getState().reset(lanes, boardId);
    useNoteStore.getState().reset([{ ...base, boardId, locked: false }], { boardId, ownerId: base.ownerId });
    const laneId = useLaneStore.getState().addLane("Cloud workflow");
    const lane = useLaneStore.getState().lanes.find((record) => record.id === laneId)!;
    expect(lane.boardId).toBe(boardId);
    expect(laneToInsert(lane, base.ownerId).board_id).toBe(boardId);
    expect(commitBoardDrop(base.id, laneId)).toBe(true);
    expect(useNoteStore.getState().notes[0]?.laneId).toBe(laneId);
  });

  it("enables only the current milestone and renders real notes in existing user columns", () => {
    const before = useNoteStore.getState().notes;
    const lanes = useLaneStore.getState().lanes;
    render(<BoardWorkspace />);
    expect(getLayout("kanban")).toBeUndefined();
    expect(getLayout("calendar")?.available).toBe(true);
    expect(getLayout("timeline")?.available).toBe(true);
    expect(screen.getByRole("main", { name: "Board" })).toBeInTheDocument();
    expect(screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"))).toEqual(lanes.map((lane) => lane.name));
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(MOCK_NOTES.length);
    expect(useNoteStore.getState().notes).toBe(before);
    expect(useLaneStore.getState().lanes).toBe(lanes);
  });

  it("adds and names a custom column through the existing controls", async () => {
    useNoteStore.getState().reset([]);
    render(<BoardWorkspace />);
    const count = useLaneStore.getState().lanes.length;
    await userEvent.click(screen.getByRole("button", { name: "Add Column" }));
    const input = screen.getByRole("textbox", { name: /^Rename column / });
    await userEvent.clear(input);
    await userEvent.type(input, "Waiting for review{Enter}");
    expect(useLaneStore.getState().lanes).toHaveLength(count + 1);
    expect(screen.getByRole("region", { name: "Waiting for review" })).toBeInTheDocument();
  });

  it("uses shared filtering, completion visibility and sort order", () => {
    const base = MOCK_NOTES[0]!;
    useNoteStore.getState().reset([
      { ...base, id: "b", title: "Beta", pinned: false, completed: false, priority: "urgent" },
      { ...base, id: "a", title: "Alpha", pinned: false, completed: false, priority: "urgent" },
      { ...base, id: "other", title: "Other", pinned: false, completed: false, priority: "none" },
      { ...base, id: "done", completed: true },
      { ...base, id: "archive", archived: true },
    ]);
    useSettingsStore.getState().setBoardSort("title");
    useSettingsStore.getState().setBoardShowCompleted(false);
    useSettingsStore.getState().setBoardFilters({ ...EMPTY_FILTERS, priorities: ["urgent"] });
    render(<BoardWorkspace />);
    expect(screen.getAllByTestId("paper-note-card").map((card) => card.getAttribute("data-note-id"))).toEqual(["a", "b"]);
  });

  it("edits the existing note in place without copying it", async () => {
    useNoteStore.getState().reset([{ ...MOCK_NOTES[0]!, locked: false }]);
    render(<BoardWorkspace />);
    const id = useNoteStore.getState().notes[0]!.id;
    const title = screen.getByRole("textbox", { name: "Note title" });
    await userEvent.clear(title);
    await userEvent.type(title, "Board edit");
    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(useNoteStore.getState().notes[0]).toMatchObject({ id, title: "Board edit" });
  });

  it("persists a moved note and a custom column across local rehydration", async () => {
    const base = MOCK_NOTES[0]!;
    useNoteStore.getState().reset([{ ...base, locked: false }]);
    const laneId = useLaneStore.getState().addLane("Waiting");
    expect(commitBoardDrop(base.id, laneId)).toBe(true);
    const storedNotes = localStorage.getItem("tackly:notes")!;
    const storedLanes = localStorage.getItem("tackly:lanes")!;
    const saved: { state: { notes: Note[] } } = JSON.parse(storedNotes);
    expect(saved.state.notes).toHaveLength(1);
    expect(saved.state.notes[0]).toMatchObject({ id: base.id, laneId });
    useNoteStore.setState({ notes: [] });
    useLaneStore.setState({ lanes: [] });
    localStorage.setItem("tackly:notes", storedNotes);
    localStorage.setItem("tackly:lanes", storedLanes);
    await useLaneStore.persist.rehydrate();
    await useNoteStore.persist.rehydrate();
    render(<BoardWorkspace />);
    expect(useNoteStore.getState().notes[0]).toMatchObject({ id: base.id, laneId });
    expect(within(screen.getByRole("region", { name: "Waiting" })).getAllByTestId("paper-note-card")).toHaveLength(1);
    expect(useNoteStore.getState().notes[0]!.transform).toEqual(base.transform);
    expect(useNoteStore.getState().notes[0]!.onCanvas).toBe(base.onCanvas);
  });

  it("switches Board, Grid and List without cloning or resetting columns", async () => {
    useNoteStore.getState().reset([MOCK_NOTES[0]!]);
    useLaneStore.getState().renameLane(MOCK_NOTES[0]!.laneId, "My workflow");
    render(<AppShell />);
    const notes = useNoteStore.getState().notes;
    const lanes = useLaneStore.getState().lanes;
    const views = screen.getByRole("group", { name: "Board view" });
    expect(within(views).queryByRole("button", { name: "Kanban" })).not.toBeInTheDocument();
    expect(screen.getByTestId("board-workspace")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "My workflow" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Board settings" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Canvas" })).not.toBeInTheDocument();
    for (const name of ["Grid", "List", "Board"]) {
      await userEvent.click(within(views).getByRole("button", { name }));
    }
    expect(useNoteStore.getState().notes).toBe(notes);
    expect(useLaneStore.getState().lanes).toBe(lanes);
    act(() => useNoteStore.getState().setTitle(notes[0]!.id, "Still the same note"));
    expect(screen.getByRole("textbox", { name: "Note title" })).toHaveValue("Still the same note");
  });
});
