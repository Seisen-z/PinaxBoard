import { useState } from "react";
import { act, fireEvent, render, screen, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as taxonomy from "@/features/taxonomy/context";
import { diffById, snapshotById } from "@/features/notes/sync-engine";
import { noteToUpdate } from "@/lib/mappers/note";
import type { Note } from "@/types/note";
import { CalendarWorkspace } from "@/components/calendar/calendar-workspace";
import { NoteFocusDialog } from "@/components/notes/note-focus-dialog";
import { AppShell } from "@/components/shell/app-shell";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { EMPTY_FILTERS } from "@/features/board/filter-notes";
import { dayKey, dueAtForDay, startOfMonth } from "@/features/calendar/month";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";

const TODAY = new Date(2026, 9, 9, 12);
function Harness() {
  const [month, setMonth] = useState(startOfMonth(TODAY));
  const [selected, setSelected] = useState(TODAY);
  return <><CalendarWorkspace month={month} selectedDate={selected} today={TODAY}
    onChangeMonth={setMonth} onSelectDate={setSelected} onAddNote={() => {}} /><NoteFocusDialog ownerId={null} /></>;
}
function sample(id: string, day = 9) {
  return { ...MOCK_NOTES[0]!, id, title: id, locked: false, completed: false, dueAt: dueAtForDay(new Date(2026, 9, day)) };
}

describe("month calendar", () => {
  it("uses the category colour on a pill and exposes the category name", () => {
    vi.spyOn(taxonomy, "useTaxonomyContext").mockReturnValue({
      tags: [], categories: [{ id: "category", workspaceId: "workspace", name: "Planning", color: "var(--success)", icon: null, emoji: null }],
      editable: false, loading: false, error: null,
      createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
    });
    useNoteStore.getState().reset([{ ...sample("task"), categoryId: "category" }]);
    render(<Harness />);
    const pill = screen.getByRole("button", { name: "Open task" });
    expect(pill.style.getPropertyValue("--calendar-note-accent")).toBe("var(--success)");
    expect(within(pill).getByText("Category: Planning")).toBeInTheDocument();
  });

  it("persists date changes and emits the existing autosave upsert without changing content", () => {
    useNoteStore.getState().reset([sample("task")]);
    const before = useNoteStore.getState().notes[0]!;
    const snapshot = snapshotById([before]);
    const dueAt = dueAtForDay(new Date(2026, 9, 15));
    useNoteStore.getState().setDueAt("task", dueAt);
    const after = useNoteStore.getState().notes[0]!;
    expect(diffById(snapshot, [after]).upserts).toEqual([after]);
    expect(noteToUpdate(after).due_at).toBe(dueAt);
    expect(after.content).toBe(before.content);
    expect(after.transform).toBe(before.transform);
    const saved: { state: { notes: Note[] } } = JSON.parse(localStorage.getItem("tackly:notes")!);
    expect(saved.state.notes[0]?.dueAt).toBe(dueAt);
  });

  it("shows due-dated notes as pills in the proper day with priority", () => {
    const dated = sample("October task");
    useNoteStore.getState().reset([dated, { ...dated, id: "undated", dueAt: null }]);
    render(<Harness />);
    const cell = screen.getByRole("gridcell", { name: "Friday, October 9, 2026" });
    expect(within(cell).getByRole("button", { name: "Open October task" })).toBeInTheDocument();
    expect(within(cell).getByRole("img", { name: /^Priority:/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open undated" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
  });
  it("navigates months and returns to Today without changing note records", async () => {
    useNoteStore.getState().reset([sample("task")]);
    render(<Harness />);
    const records = useNoteStore.getState().notes;
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("button", { name: "Select Friday, October 9, 2026" })).toHaveAttribute("aria-current", "date");
    expect(useNoteStore.getState().notes).toBe(records);
  });
  it("opens the shared editor and moves the same note by editing its due date", async () => {
    useNoteStore.getState().reset([sample("task")]);
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open task" }));
    const dialog = await screen.findByTestId("note-focus-dialog");
    fireEvent.change(within(dialog).getByLabelText("Due date"), { target: { value: "2026-10-12" } });
    expect(dayKey(new Date(useNoteStore.getState().notes[0]!.dueAt!))).toBe("2026-10-12");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close editor" }));
    expect(within(screen.getByRole("gridcell", { name: "Monday, October 12, 2026" })).getByRole("button", { name: "Open task" })).toBeInTheDocument();
    expect(useNoteStore.getState().notes).toHaveLength(1);
  });
  it("respects filters/completed visibility and recovers an empty filtered calendar", async () => {
    useNoteStore.getState().reset([sample("task"), { ...sample("done"), completed: true }]);
    useSettingsStore.getState().setBoardShowCompleted(false);
    useSettingsStore.getState().setBoardFilters({ ...EMPTY_FILTERS, tagIds: ["missing"] });
    render(<Harness />);
    expect(screen.getByRole("status")).toHaveTextContent("No dated notes");
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: "Open task" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open done" })).not.toBeInTheDocument();
  });
  it("expands busy days so no note is inaccessible", async () => {
    useNoteStore.getState().reset([sample("one"), sample("two"), sample("three"), sample("four")]);
    render(<Harness />);
    expect(screen.queryByRole("button", { name: "Open four" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+1 more" }));
    expect(screen.getByRole("button", { name: "Open four" })).toBeInTheDocument();
  });
  it("keeps locked notes' dates protected and rejects invalid updates", () => {
    useNoteStore.getState().reset([{ ...sample("locked"), locked: true }]);
    const before = useNoteStore.getState().notes;
    useNoteStore.getState().setDueAt("locked", dueAtForDay(new Date(2026, 9, 12)));
    expect(useNoteStore.getState().notes).toBe(before);
    useNoteStore.getState().setDueAt("locked", "invalid");
    expect(useNoteStore.getState().notes).toBe(before);
  });
  it("removes Kanban, enables Calendar, and creates one dated blank note from the selected day", async () => {
    useNoteStore.getState().reset([]);
    render(<AppShell />);
    const views = screen.getByRole("group", { name: "Board view" });
    expect(within(views).queryByRole("button", { name: "Kanban" })).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Calendar" }));
    expect(screen.getByTestId("calendar-workspace")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Zoom" })).not.toBeInTheDocument();
    const chosen = screen.getAllByRole("gridcell")[15]!;
    const key = chosen.getAttribute("data-date")!;
    await userEvent.click(within(chosen).getByRole("button", { name: /^Select / }));
    await userEvent.click(screen.getAllByRole("button", { name: "New note" }).at(-1)!);
    const note = useNoteStore.getState().notes[0]!;
    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(dayKey(new Date(note.dueAt!))).toBe(key);
    expect(note.title).toBe("");
    expect(note.onCanvas).toBe(false);
    expect(await screen.findByTestId("note-focus-dialog")).toBeInTheDocument();
  });
  it("clearing a due date removes the pill but preserves the note", () => {
    useNoteStore.getState().reset([sample("task")]);
    render(<Harness />);
    act(() => useNoteStore.getState().setDueAt("task", null));
    expect(screen.queryByRole("button", { name: "Open task" })).not.toBeInTheDocument();
    expect(useNoteStore.getState().notes).toHaveLength(1);
  });
});
