import { render, screen, within, act, fireEvent } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardWorkspace, type DashboardWorkspaceProps } from "./dashboard-workspace";
import { AppShell } from "@/components/shell/app-shell";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Board } from "@/types/board";

function props(patch: Partial<DashboardWorkspaceProps> = {}): DashboardWorkspaceProps {
  return { notes: [], boards: [], boardName: "Local board", cloud: false, loading: false, error: null, onRetry: vi.fn(), onOpenNote: vi.fn(), onOpenBoard: vi.fn(), onAddNote: vi.fn(), ...patch };
}

describe("dashboard workspace", () => {
  it("renders all eight honest empty sections with no fabricated boards", () => {
    render(<DashboardWorkspace {...props()} />);
    for (const name of ["Today", "Overdue", "Upcoming", "High Priority", "Recently Edited", "Completed Today", "Pinned Notes", "Recent Boards"]) expect(screen.getByRole("region", { name })).toBeInTheDocument();
    expect(screen.getByText(/Older notes without a completion date/)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to see recent boards/)).toBeInTheDocument();
  });
  it("bounds initial lists and reveals the remaining actual records", async () => {
    const onOpenNote = vi.fn();
    const notes = Array.from({ length: 7 }, (_, i) => ({ ...MOCK_NOTES[0]!, id: String(i), title: `Item ${i}`, pinned: true }));
    render(<DashboardWorkspace {...props({ notes, onOpenNote })} />);
    const section = within(screen.getByRole("region", { name: "Pinned Notes" }));
    expect(section.getAllByRole("button")).toHaveLength(6);
    await userEvent.click(section.getByRole("button", { name: "Show all 7 in Pinned Notes" }));
    await userEvent.click(section.getByRole("button", { name: "Open Item 6" }));
    expect(onOpenNote).toHaveBeenCalledWith("6");
  });
  it("opens real recent boards in timestamp order and excludes archived ones", async () => {
    const onOpenBoard = vi.fn();
    const boards = [{ id: "older", name: "Older", updatedAt: "2026-10-12", archivedAt: null }, { id: "newer", name: "Newer", updatedAt: "2026-10-14", archivedAt: null }] as Board[];
    render(<DashboardWorkspace {...props({ cloud: true, boards, onOpenBoard })} />);
    const buttons = within(screen.getByRole("region", { name: "Recent Boards" })).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Newer", "Older"]);
    await userEvent.click(buttons[0]!);
    expect(onOpenBoard).toHaveBeenCalledWith("newer");
  });
  it("does not publish misleading empty sections while loading and exposes retry", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<DashboardWorkspace {...props({ loading: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your dashboard");
    expect(screen.queryByRole("region", { name: "Today" })).not.toBeInTheDocument();
    rerender(<DashboardWorkspace {...props({ error: new Error("Network interrupted"), onRetry })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network interrupted");
    await userEvent.click(screen.getByRole("button", { name: "Retry dashboard" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
  it("refreshes local-day sections when the tab becomes visible after midnight", () => {
    const clock = vi.spyOn(Date, "now");
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    try {
      vi.setSystemTime(new Date(2026, 9, 14, 23, 59));
      render(<DashboardWorkspace {...props({ notes: [{ ...MOCK_NOTES[0]!, completed: false, dueAt: "2026-10-14" }] })} />);
      expect(within(screen.getByRole("region", { name: "Today" })).getByRole("button")).toBeInTheDocument();
      vi.setSystemTime(new Date(2026, 9, 15));
      fireEvent(document, new Event("visibilitychange"));
      expect(within(screen.getByRole("region", { name: "Overdue" })).getByRole("button")).toBeInTheDocument();
    } finally { vi.useRealTimers(); clock.mockRestore(); }
  });
});

describe("dashboard shell integration", () => {
  it("opens from sidebar, shares live edits and completion events, and preserves navigation", async () => {
    render(<AppShell />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    await userEvent.click(within(nav).getByRole("button", { name: "Dashboard" }));
    expect(screen.getByRole("main", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Board view" })).not.toBeInTheDocument();
    const id = MOCK_NOTES[0]!.id;
    act(() => {
      useNoteStore.getState().setTitle(id, "Live dashboard note");
      if (useNoteStore.getState().notes.find((n) => n.id === id)?.completed) useNoteStore.getState().toggleComplete(id);
      useNoteStore.getState().toggleComplete(id);
    });
    const done = within(screen.getByRole("region", { name: "Completed Today" }));
    await userEvent.click(done.getByRole("button", { name: "Open Live dashboard note" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Note title" })).toHaveValue("Live dashboard note");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(nav).getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("main", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Board view" })).not.toBeInTheDocument();
    await userEvent.click(within(nav).getByRole("button", { name: "Board" }));
    const views = screen.getByRole("group", { name: "Board view" });
    expect(within(views).getAllByRole("button").map((b) => b.textContent)).toEqual(["Board", "Grid", "List"]);
  });
  it("creates exactly one blank note and returns to the Board without a chooser", async () => {
    render(<AppShell />);
    const count = useNoteStore.getState().notes.length;
    await userEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Dashboard" }));
    await userEvent.click(within(screen.getByRole("main", { name: "Dashboard" })).getByRole("button", { name: "Add note" }));
    expect(useNoteStore.getState().notes).toHaveLength(count + 1);
    const blank = useNoteStore.getState().notes.find((n) => n.id === useNoteStore.getState().focusedNoteId)!;
    expect(blank.title).toBe(""); expect(blank.content).toBeNull(); expect(blank.excerpt).toBe("");
    expect(screen.queryByRole("main", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Dashboard" }));
    await userEvent.click(within(screen.getByTestId("app-sidebar")).getByRole("button", { name: "New note" }));
    expect(useNoteStore.getState().notes).toHaveLength(count + 2);
    expect(screen.queryByRole("main", { name: "Dashboard" })).not.toBeInTheDocument();
  });
  it("does not apply hidden board filters to summaries or reset them on navigation", async () => {
    useSettingsStore.setState({ boardShowCompleted: false });
    render(<AppShell />);
    await userEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Dashboard" }));
    const recent = within(screen.getByRole("region", { name: "Recently Edited" }));
    expect(recent.getAllByRole("button")).toHaveLength(Math.min(MOCK_NOTES.length, 5) + (MOCK_NOTES.length > 5 ? 1 : 0));
    expect(useSettingsStore.getState().boardShowCompleted).toBe(false);
    // A stale account/board working copy must never become the local summary.
    act(() => useNoteStore.getState().reset(MOCK_NOTES, { boardId: "other-board", ownerId: "other-owner" }));
    expect(within(screen.getByRole("region", { name: "Recently Edited" })).queryByRole("button")).not.toBeInTheDocument();
    expect(within(screen.getByRole("main", { name: "Dashboard" })).getByRole("button", { name: "Add note" })).toBeDisabled();
  });
});
