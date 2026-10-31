import { act } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@/test/render";
import { GridWorkspace } from "@/components/grid/grid-workspace";
import { AppShell } from "@/components/shell/app-shell";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { EMPTY_FILTERS } from "@/features/board/filter-notes";
import { visibleNotes } from "@/features/board/visible-notes";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";

describe("grid view", () => {
  it("projects existing records without copies, mutations or canvas membership changes", () => {
    const before = JSON.stringify(MOCK_NOTES);
    const result = visibleNotes(MOCK_NOTES, EMPTY_FILTERS, true, "title");
    expect(result).toHaveLength(MOCK_NOTES.length);
    expect(result.every((note) => MOCK_NOTES.includes(note))).toBe(true);
    expect(JSON.stringify(MOCK_NOTES)).toBe(before);
  });

  it("excludes archived/deleted notes and respects completion and facets", () => {
    const base = MOCK_NOTES[0]!;
    const notes = [
      { ...base, id: "live", completed: false },
      { ...base, id: "archived", archived: true },
      { ...base, id: "deleted", deletedAt: base.createdAt },
      { ...base, id: "complete", completed: true },
    ];
    expect(visibleNotes(notes, EMPTY_FILTERS, false, "manual").map((n) => n.id)).toEqual(["live"]);
    expect(visibleNotes(notes, { ...EMPTY_FILTERS, completion: "complete" }, true, "manual").map((n) => n.id)).toEqual(["complete"]);
  });

  it("renders every board note once with last-edit metadata and checklist counts", () => {
    render(<GridWorkspace />);
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(MOCK_NOTES.length);
    expect(screen.getAllByText(/^Edited /)).toHaveLength(MOCK_NOTES.length);
    expect(screen.getByTestId("note-grid")).toHaveClass("tk-note-grid");
  });

  it("edits and completes the original record", async () => {
    render(<GridWorkspace />);
    const card = screen.getAllByTestId("paper-note-card")[0]!;
    const id = card.getAttribute("data-note-id");
    const title = within(card).getByRole("textbox", { name: "Note title" });
    await userEvent.clear(title);
    await userEvent.type(title, "Grid edit");
    expect(useNoteStore.getState().notes.find((n) => n.id === id)?.title).toBe("Grid edit");
    await userEvent.click(within(card).getByRole("checkbox", { name: /Mark Grid edit/ }));
    expect(useNoteStore.getState().notes.find((n) => n.id === id)?.completed).toBe(true);
  });

  it("clears an empty-result filter and restores notes", async () => {
    useSettingsStore.getState().setBoardFilters({ ...EMPTY_FILTERS, tagIds: ["missing"] });
    render(<GridWorkspace />);
    expect(screen.getByRole("status")).toHaveTextContent("No notes match");
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(MOCK_NOTES.length);
  });

  it("creates a blank immediately editable note in an empty grid", async () => {
    useNoteStore.getState().reset([]);
    render(<GridWorkspace />);
    await userEvent.click(screen.getByRole("button", { name: "New note" }));
    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: "Note title" })).toHaveFocus();
  });

  it("updates the grid after shared-store mutations", () => {
    render(<GridWorkspace />);
    const note = useNoteStore.getState().notes[0]!;
    act(() => useNoteStore.getState().setArchived(note.id, true));
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(MOCK_NOTES.length - 1);
  });

  it("switches Board â†’ Grid â†’ Canvas â†’ Board without duplicating notes", async () => {
    // A representative pair keeps this routing test focused; full rendering is tested separately.
    useNoteStore.getState().reset(MOCK_NOTES.slice(0, 2));
    render(<AppShell />);
    const before = JSON.stringify(useNoteStore.getState().notes);
    const switcher = screen.getByRole("group", { name: "Board view" });
    await userEvent.click(within(switcher).getByRole("button", { name: "Grid" }));
    expect(screen.getByRole("main", { name: "Grid" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Board settings" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Canvas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Zoom" })).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Canvas" }));
    expect(screen.queryByTestId("grid-workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", {name:"Board view"})).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("navigation",{name:"Primary"})).getByRole("button", { name: "Board" }));
    expect(screen.getByTestId("board-workspace")).toBeInTheDocument();
    expect(JSON.stringify(useNoteStore.getState().notes)).toBe(before);
  });
});


