import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReminders } from "./use-reminders";
import { createBlankNote } from "@/features/notes/create-note";
const open = vi.fn();
const due = () => [{ ...createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane" }), id: "reminder-note", title: "Remember this", remindAt: new Date(Date.now() - 1000).toISOString() }];

function browser(permission: NotificationPermission, fail = false) {
  const send = vi.fn();
  const close = vi.fn();
  class FakeNotification {
    static permission = permission;
    static requestPermission = vi.fn(async () => { FakeNotification.permission = "granted"; return "granted" as const; });
    onclick: (() => void) | null = null;
    close = close;
    constructor(...args: unknown[]) { send(...args); if (fail) throw new Error("Browser delivery failed"); }
  }
  vi.stubGlobal("Notification", FakeNotification);
  return { send, close, request: FakeNotification.requestPermission };
}
afterEach(() => vi.unstubAllGlobals());

describe("reminder delivery journal", () => {
  it("delivers in-app without prompting and marks read persistently", async () => {
    const fake = browser("default"); const notes = due();
    const { result } = renderHook(() => useReminders(notes, "owner:board", open));
    await waitFor(() => expect(result.current.unread).toBe(1));
    expect(fake.request).not.toHaveBeenCalled(); expect(fake.send).not.toHaveBeenCalled();
    act(() => result.current.markRead(result.current.items[0]!.key));
    await waitFor(() => expect(result.current.unread).toBe(0));
    expect(JSON.parse(localStorage.getItem("tackly:reminders:owner:board")!)[0].read).toBe(true);
  });
  it("requests browser alerts once and retains receipts across remounts", async () => {
    const fake = browser("granted"); const notes = due();
    const first = renderHook(() => useReminders(notes, "owner:board", open));
    await waitFor(() => expect(first.result.current.items[0]?.browser).toBe("sent"));
    first.unmount();
    const second = renderHook(() => useReminders(notes, "owner:board", open));
    await waitFor(() => expect(second.result.current.unread).toBe(1));
    expect(fake.send).toHaveBeenCalledOnce(); expect(fake.close).toHaveBeenCalledOnce();
  });
  it("keeps denial/unsupported in-app and requests permission only explicitly", async () => {
    const fake = browser("denied"); const notes = due();
    const { result } = renderHook(() => useReminders(notes, "owner:board", open));
    await waitFor(() => expect(result.current.unread).toBe(1));
    expect(result.current.permission).toBe("denied"); expect(fake.send).not.toHaveBeenCalled();
    await act(async () => result.current.requestPermission());
    await waitFor(() => expect(result.current.items[0]?.browser).toBe("sent"));
    expect(fake.request).toHaveBeenCalledOnce();
  });
  it("records constructor failures without falsely reporting sent or auto-retrying", async () => {
    const fake = browser("granted", true); const notes = due();
    const { result, rerender } = renderHook(() => useReminders(notes, "owner:board", open));
    await waitFor(() => expect(result.current.items[0]?.browser).toBe("failed"));
    rerender(); expect(fake.send).toHaveBeenCalledOnce();
    act(() => result.current.retry());
    await waitFor(() => expect(fake.send).toHaveBeenCalledTimes(2));
    expect(result.current.unread).toBe(1);
  });
  it("isolates board/account scopes and removes reminders for completed notes", async () => {
    browser("granted"); const notes = due();
    const { result, rerender } = renderHook(({ scope, records }) => useReminders(records, scope, open), { initialProps: { scope: "owner:board", records: notes } });
    await waitFor(() => expect(result.current.unread).toBe(1));
    rerender({ scope: "other:board", records: [] }); expect(result.current.unread).toBe(0);
    rerender({ scope: "owner:board", records: [{ ...notes[0]!, completed: true }] });
    await waitFor(() => expect(result.current.unread).toBe(0));
  });
  it("exposes storage failure while retaining the visible reminder", async () => {
    browser("default"); const notes = due();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
    const { result } = renderHook(() => useReminders(notes, "owner:board", open));
    await waitFor(() => expect(result.current.error).toMatch(/not saved/));
    expect(result.current.unread).toBe(1);
  });
});
