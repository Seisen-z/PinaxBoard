import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@/test/render";
import { TimelineWorkspace } from "@/components/timeline/timeline-workspace";
import { NoteFocusDialog } from "@/components/notes/note-focus-dialog";
import { AppShell } from "@/components/shell/app-shell";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { EMPTY_FILTERS } from "@/features/board/filter-notes";
import { dayKey } from "@/features/calendar/month";
import type { TimelineScope } from "@/features/timeline/range";
import * as taxonomy from "@/features/taxonomy/context";
import { diffById, snapshotById } from "@/features/notes/sync-engine";
import { noteToUpdate } from "@/lib/mappers/note";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Note } from "@/types/note";

const TODAY = new Date(2026, 9, 9, 12);
const sample = (id: string) => ({ ...MOCK_NOTES[0]!, id, title: id, locked: false, completed: false, archived: false, deletedAt: null, startAt: "2026-10-08", dueAt: "2026-10-12" });
function Harness() {
  const [anchor, setAnchor] = useState(TODAY);
  const [scope, setScope] = useState<TimelineScope>("month");
  return <><TimelineWorkspace anchor={anchor} scope={scope} onChangeAnchor={setAnchor} onChangeScope={setScope} today={TODAY} /><NoteFocusDialog ownerId={null} /></>;
}
describe("timeline view", () => {
  it("renders correct range bars, duration and row labels from the same records", () => {
    useNoteStore.getState().reset([sample("Project task")]);
    const before = useNoteStore.getState().notes;
    render(<Harness />);
    const bar = screen.getByTestId("timeline-bar");
    expect(bar).toHaveAttribute("data-offset", "7");
    expect(bar).toHaveAttribute("data-span", "5");
    expect(bar).toHaveAttribute("data-duration", "5");
    expect(bar.style.gridColumn).toBe("8 / span 5");
    expect(screen.getByRole("button", { name: "Project task" })).toBeInTheDocument();
    expect(useNoteStore.getState().notes).toBe(before);
  });
  it("changes week/month/quarter scope and navigates periods without mutating notes", async () => {
    useNoteStore.getState().reset([sample("task")]);
    render(<Harness />);
    const before = useNoteStore.getState().notes;
    await userEvent.click(screen.getByRole("button", { name: "Quarter" }));
    expect(screen.getByRole("heading", { name: "Q4 2026" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(93);
    await userEvent.click(screen.getByRole("button", { name: "Next period" }));
    expect(screen.getByRole("heading", { name: "Q1 2027" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "Q4 2026" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(screen.getAllByRole("columnheader")).toHaveLength(8);
    expect(useNoteStore.getState().notes).toBe(before);
  });
  it("opens the shared editor and updates the bar when start date changes", async () => {
    useNoteStore.getState().reset([sample("task")]);
    render(<Harness />);
    await userEvent.click(screen.getByTestId("timeline-bar"));
    const dialog = await screen.findByTestId("note-focus-dialog");
    fireEvent.change(within(dialog).getByLabelText("Start date"), { target: { value: "2026-10-10" } });
    expect(dayKey(new Date(useNoteStore.getState().notes[0]!.startAt!))).toBe("2026-10-10");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close editor" }));
    expect(screen.getByTestId("timeline-bar")).toHaveAttribute("data-span", "3");
    expect(useNoteStore.getState().notes).toHaveLength(1);
  });
  it("exposes undated and invalid ranges for editing instead of losing them", () => {
    useNoteStore.getState().reset([{ ...sample("undated"), startAt: null, dueAt: null }, { ...sample("reversed"), startAt: "2026-10-20" }]);
    render(<Harness />);
    expect(within(screen.getByRole("region", { name: "Unscheduled notes" })).getByRole("button", { name: "undated" })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Date ranges need attention" })).getByRole("button", { name: "reversed" })).toBeInTheDocument();
    expect(screen.queryByTestId("timeline-bar")).not.toBeInTheDocument();
  });
  it("respects shared filters and completion settings", async () => {
    useNoteStore.getState().reset([sample("task"), { ...sample("done"), completed: true }]);
    useSettingsStore.getState().setBoardShowCompleted(false);
    useSettingsStore.getState().setBoardFilters({ ...EMPTY_FILTERS, tagIds: ["missing"] });
    render(<Harness />);
    expect(screen.getByRole("status")).toHaveTextContent("No tasks overlap");
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByTestId("timeline-bar")).toHaveLength(1);
  });
  it("applies category colours and priority to bars", () => {
    vi.spyOn(taxonomy, "useTaxonomyContext").mockReturnValue({ tags: [], categories: [{ id: "category", workspaceId: "workspace", name: "Planning", color: "var(--success)", emoji: null, icon: null }], editable: false, loading: false, error: null,
      createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn() });
    useNoteStore.getState().reset([{ ...sample("task"), categoryId: "category" }]);
    render(<Harness />);
    expect(screen.getByTestId("timeline-bar").style.getPropertyValue("--timeline-accent")).toBe("var(--success)");
    expect(within(screen.getByTestId("timeline-bar")).getByRole("img", { name: /^Priority:/ })).toBeInTheDocument();
  });
  it("persists start changes through the existing diff/mapper and protects locks", () => {
    useNoteStore.getState().reset([sample("task")]);
    const before = useNoteStore.getState().notes[0]!;
    const snapshot = snapshotById([before]);
    useNoteStore.getState().setStartAt("task", "2026-10-10");
    const after = useNoteStore.getState().notes[0]!;
    expect(diffById(snapshot, [after]).upserts).toEqual([after]);
    expect(noteToUpdate(after).start_at).toBe("2026-10-10");
    expect(after.content).toBe(before.content);
    const saved: { state: { notes: Note[] } } = JSON.parse(localStorage.getItem("tackly:notes")!);
    expect(saved.state.notes[0]!.startAt).toBe("2026-10-10");
    useNoteStore.getState().toggleLock("task");
    const locked = useNoteStore.getState().notes;
    useNoteStore.getState().setStartAt("task", null);
    useNoteStore.getState().setStartAt("task", "invalid");
    expect(useNoteStore.getState().notes).toBe(locked);
  });
  it("reacts to external edits and clearing dates without deleting the record", () => {
    useNoteStore.getState().reset([sample("task")]);
    render(<Harness />);
    act(() => { useNoteStore.getState().setStartAt("task", null); useNoteStore.getState().setDueAt("task", null); });
    expect(screen.queryByTestId("timeline-bar")).not.toBeInTheDocument();
    expect(useNoteStore.getState().notes).toHaveLength(1);
  });
  it("enables Timeline without Kanban and creates one immediately editable dated record", async () => {
    useNoteStore.getState().reset([]);
    render(<AppShell />);
    const views = screen.getByRole("group", { name: "Board view" });
    expect(within(views).queryByRole("button", { name: "Kanban" })).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Timeline" }));
    expect(screen.getByTestId("timeline-workspace")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Zoom" })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "New note" }).at(-1)!);
    expect(useNoteStore.getState().notes).toHaveLength(1);
    const note = useNoteStore.getState().notes[0]!;
    expect(note.title).toBe("");
    expect(note.startAt).not.toBeNull();
    expect(note.dueAt).not.toBeNull();
    expect(note.onCanvas).toBe(false);
    expect(await screen.findByTestId("note-focus-dialog")).toBeInTheDocument();
  });
});
