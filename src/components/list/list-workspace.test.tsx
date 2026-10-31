import { act } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@/test/render";
import { ListWorkspace } from "@/components/list/list-workspace";
import { NoteFocusDialog } from "@/components/notes/note-focus-dialog";
import { AppShell } from "@/components/shell/app-shell";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { EMPTY_FILTERS } from "@/features/board/filter-notes";
import { sortNotes } from "@/features/board/sort-notes";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useSettingsStore } from "@/stores/settings-store";

describe("list view", () => {
  it("renders existing records with preview, date, priority, status and menu", () => {
    render(<ListWorkspace />);
    const rows = screen.getAllByTestId("list-note-row");
    expect(rows).toHaveLength(MOCK_NOTES.length);
    expect(new Set(rows.map((row) => row.getAttribute("data-note-id"))).size).toBe(MOCK_NOTES.length);
    for (const row of rows) {
      expect(within(row).getByRole("textbox", { name: "Note title" })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: /^Open / })).toBeInTheDocument();
      expect(within(row).getByRole("img", { name: /^Priority:/ })).toBeInTheDocument();
      expect(within(row).getByRole("button", { name: /^More actions/ })).toBeInTheDocument();
      expect(row.querySelector("time")).not.toBeNull();
    }
  });

  it("uses all shared sort modes without changing source order", () => {
    render(<ListWorkspace />);
    const before = useNoteStore.getState().notes;
    for (const sort of ["manual", "title", "created", "updated", "due", "priority"] as const) {
      act(() => useSettingsStore.getState().setBoardSort(sort));
      expect(screen.getAllByTestId("list-note-row").map((row) => row.getAttribute("data-note-id")))
        .toEqual(sortNotes(before, sort).map((note) => note.id));
    }
    expect(useNoteStore.getState().notes).toBe(before);
  });

  it("applies filters and hides completed, archived and deleted rows", () => {
    const base = MOCK_NOTES[0]!;
    useNoteStore.getState().reset([
      { ...base, id: "keep", priority: "urgent", completed: false },
      { ...base, id: "other", priority: "none", completed: false },
      { ...base, id: "done", priority: "urgent", completed: true },
      { ...base, id: "archived", priority: "urgent", archived: true },
      { ...base, id: "deleted", priority: "urgent", deletedAt: base.createdAt },
    ]);
    useSettingsStore.getState().setBoardFilters({ ...EMPTY_FILTERS, priorities: ["urgent"] });
    useSettingsStore.getState().setBoardShowCompleted(false);
    render(<ListWorkspace />);
    expect(screen.getAllByTestId("list-note-row").map((row) => row.getAttribute("data-note-id"))).toEqual(["keep"]);
  });

  it("edits and completes the same record, with lock protection", async () => {
    useNoteStore.getState().reset([{ ...MOCK_NOTES[0]!, completed: false }]);
    render(<ListWorkspace />);
    const title = screen.getByRole("textbox", { name: "Note title" });
    await userEvent.clear(title);
    await userEvent.type(title, "List edit");
    expect(useNoteStore.getState().notes[0]?.title).toBe("List edit");
    await userEvent.click(screen.getByRole("checkbox", { name: /Mark List edit/ }));
    expect(useNoteStore.getState().notes[0]?.completed).toBe(true);
    act(() => useNoteStore.getState().toggleLock(useNoteStore.getState().notes[0]!.id));
    expect(title).toHaveAttribute("readonly");
  });

  it("opens the shared full-screen editor from the row icon", async () => {
    useNoteStore.getState().reset([MOCK_NOTES[0]!]);
    render(<><ListWorkspace /><NoteFocusDialog ownerId={null} /></>);
    await userEvent.click(screen.getByRole("button", { name: /^Open / }));
    expect(await screen.findByTestId("note-focus-dialog")).toBeInTheDocument();
    expect(useNoteStore.getState().expandedNoteId).toBe(MOCK_NOTES[0]!.id);
  });

  it("uses the shared menu to duplicate and delete records", async () => {
    useNoteStore.getState().reset([MOCK_NOTES[0]!]);
    render(<ListWorkspace />);
    await userEvent.click(screen.getByRole("button", { name: /^More actions/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(useNoteStore.getState().notes).toHaveLength(2);
    const row = screen.getAllByTestId("list-note-row")[0]!;
    await userEvent.click(within(row).getByRole("button", { name: /^More actions/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(useNoteStore.getState().notes).toHaveLength(2);
    expect(useNoteStore.getState().notes.filter((note)=>note.deletedAt)).toHaveLength(1);
    expect(screen.getAllByTestId("list-note-row")).toHaveLength(1);
  });

  it("recovers filtered-empty state", async () => {
    useSettingsStore.getState().setBoardFilters({ ...EMPTY_FILTERS, tagIds: ["missing"] });
    render(<ListWorkspace />);
    expect(screen.getByRole("status")).toHaveTextContent("No notes match");
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByTestId("list-note-row")).toHaveLength(MOCK_NOTES.length);
  });

  it("creates one blank immediately editable note from an empty list", async () => {
    useNoteStore.getState().reset([]);
    render(<ListWorkspace />);
    await userEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: "Note title" })).toHaveFocus();
  });

  it("supports selection and external store updates", async () => {
    render(<ListWorkspace />);
    const row = screen.getAllByTestId("list-note-row")[0]!;
    const id = row.getAttribute("data-note-id")!;
    await userEvent.click(row);
    expect(useSelectionStore.getState().selectedIds.has(id)).toBe(true);
    act(() => useNoteStore.getState().setArchived(id, true));
    expect(screen.getAllByTestId("list-note-row")).toHaveLength(MOCK_NOTES.length - 1);
  });

  it("switches List, Grid and Board without copying notes or showing Canvas controls", async () => {
    // A representative pair keeps this routing test focused; full rendering is tested separately.
    useNoteStore.getState().reset(MOCK_NOTES.slice(0, 2));
    render(<AppShell />);
    const before = JSON.stringify(useNoteStore.getState().notes);
    const views = screen.getByRole("group", { name: "Board view" });
    await userEvent.click(within(views).getByRole("button", { name: "List" }));
    expect(screen.getByRole("main", { name: "List" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Board settings" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Canvas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Zoom" })).not.toBeInTheDocument();
    await userEvent.click(within(views).getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("main", { name: "Grid" })).toBeInTheDocument();
    await userEvent.click(within(views).getByRole("button", { name: "Board" }));
    expect(screen.getByTestId("board-workspace")).toBeInTheDocument();
    expect(JSON.stringify(useNoteStore.getState().notes)).toBe(before);
  });
});
