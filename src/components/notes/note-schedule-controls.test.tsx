import { render, screen, within, fireEvent, act, waitFor } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/app-shell";
import { NoteScheduleControls } from "./note-schedule-controls";
import { useNoteStore } from "@/stores/note-store";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { localDateTime } from "@/features/reminders/schedule";

vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: () => ({ from: () => ({ select: () => ({ limit: async () => ({ error: { code: "42703", message: "missing schedule columns" } }) }) }) }) }));

describe("post-creation reminder controls", () => {
  it("sets/removes a reminder and selects repeat in the shared editor", async () => {
    render(<AppShell />);
    act(() => useNoteStore.getState().expandNote(MOCK_NOTES[0]!.id));
    fireEvent.change(screen.getByLabelText("Reminder time"), { target: { value: "2026-10-15T08:30" } });
    expect(localDateTime(useNoteStore.getState().notes[0]?.remindAt)).toBe("2026-10-15T08:30");
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-10-15" } });
    await userEvent.selectOptions(screen.getByLabelText("Repeat rule"), "daily");
    expect(useNoteStore.getState().notes[0]?.repeatRule?.frequency).toBe("daily");
    expect(screen.getByText(/creates one next occurrence/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove reminder" }));
    expect(useNoteStore.getState().notes[0]?.remindAt).toBeNull();
  });
  it("locks schedule controls and explains why repeats need a due date", async () => {
    const note = { ...MOCK_NOTES[0]!, dueAt: null, locked: true };
    const { rerender } = render(<NoteScheduleControls note={note} ownerId={null} />);
    expect(screen.getByLabelText("Reminder time")).toBeDisabled(); expect(screen.getByLabelText("Repeat rule")).toBeDisabled();
    expect(screen.getByText("Set a due date to enable repeat.")).toBeInTheDocument();
    rerender(<NoteScheduleControls note={{ ...note, locked: false }} ownerId="cloud-owner" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("0004_note_schedules.sql");
    expect(screen.getByLabelText("Reminder time")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retry scheduling" })).toBeInTheDocument();
  });
  it("opens the reminder bell, marks read and opens the same note", async () => {
    vi.stubGlobal("Notification", undefined);
    useNoteStore.getState().setReminder(MOCK_NOTES[0]!.id, new Date(Date.now() - 1000).toISOString());
    render(<AppShell />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications, 1 unread" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Notifications, 1 unread" }));
    const center = within(screen.getByRole("dialog", { name: "Reminders" }));
    expect(center.getByText(/unavailable here/)).toBeInTheDocument();
    await userEvent.click(center.getByRole("button", { name: MOCK_NOTES[0]!.title }));
    expect(useNoteStore.getState().expandedNoteId).toBe(MOCK_NOTES[0]!.id);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
