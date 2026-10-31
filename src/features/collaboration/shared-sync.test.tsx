import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBoardSync } from "@/features/notes/use-board-sync";
import { useNoteStore } from "@/stores/note-store";
import { createDefaultLanes, useLaneStore } from "@/stores/lane-store";
import { createBlankNote } from "@/features/notes/create-note";
import { readCachedBoard } from "@/features/offline/board-cache";
const repo = vi.hoisted(() => ({ upsertLanes: vi.fn(), upsertNotes: vi.fn(), deleteNotes: vi.fn(), deleteLanes: vi.fn(), fetchBoardContents: vi.fn() }));
const shared = vi.hoisted(() => ({ saveSharedBoard: vi.fn(async () => {}) }));
vi.mock("@/features/notes/repository", () => repo);
vi.mock("./repository", () => shared);
function wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>; }
function initialize() {
  const lanes = createDefaultLanes("shared-board");
  const note = { ...createBlankNote({ boardId: "shared-board", ownerId: "owner", laneId: lanes[0]!.id }), title: "Original", createdBy: "owner", inbox: false };
  useLaneStore.getState().reset(lanes, "shared-board"); useNoteStore.getState().reset([note], { boardId: "shared-board", ownerId: "owner" }); return { notes: [note], lanes };
}
const options = { boardId: "shared-board", ownerId: "editor", boardOwnerId: "owner", enabled: true, shared: true };
beforeEach(() => { vi.clearAllMocks(); repo.fetchBoardContents.mockReset(); shared.saveSharedBoard.mockResolvedValue(); localStorage.clear(); Object.defineProperty(navigator, "onLine", { value: true, configurable: true }); });

describe("shared cloud sync", () => {
  it("saves another owner's note through atomic RPC and scopes offline cache to the actor", async () => {
    const baseline = initialize(); const { result } = renderHook(() => useBoardSync(options), { wrapper }); act(() => result.current.markClean());
    act(() => useNoteStore.getState().setTitle(baseline.notes[0]!.id, "Editor changed"));
    await act(async () => { expect(await result.current.savePending()).toBe(true); });
    expect(shared.saveSharedBoard).toHaveBeenCalledWith("shared-board", expect.objectContaining({ notes: expect.objectContaining({ upserts: [expect.objectContaining({ title: "Editor changed", ownerId: "owner" })] }) }), baseline, "owner");
    expect(repo.upsertNotes).not.toHaveBeenCalled(); expect(readCachedBoard("editor", "shared-board")?.pending).toBe(false); expect(readCachedBoard("owner", "shared-board")).toBeNull();
  });
  it("receives scoped remote updates without echo-writing unchanged records", async () => {
    const baseline = initialize(); repo.fetchBoardContents.mockResolvedValue({ ...baseline, notes: [{ ...baseline.notes[0], title: "Remote live edit" }] });
    const { result } = renderHook(() => useBoardSync(options), { wrapper }); act(() => result.current.markClean());
    act(() => window.dispatchEvent(new CustomEvent("tackly:remote-board", { detail: "other-board" })));
    expect(repo.fetchBoardContents).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new CustomEvent("tackly:remote-board", { detail: "shared-board" })));
    await waitFor(() => expect(useNoteStore.getState().notes[0]?.title).toBe("Remote live edit")); expect(shared.saveSharedBoard).not.toHaveBeenCalled();
  });
  it("retains a failed simultaneous edit as a separate actor-authored conflict copy", async () => {
    const baseline = initialize(); shared.saveSharedBoard.mockRejectedValue(new Error("Concurrent edit"));
    const { result } = renderHook(() => useBoardSync(options), { wrapper }); act(() => result.current.markClean()); act(() => useNoteStore.getState().setTitle(baseline.notes[0]!.id, "My edit"));
    await act(async () => { expect(await result.current.savePending()).toBe(false); });
    shared.saveSharedBoard.mockResolvedValue();
    repo.fetchBoardContents.mockResolvedValue({ ...baseline, notes: [{ ...baseline.notes[0], title: "Their edit" }] });
    act(() => window.dispatchEvent(new CustomEvent("tackly:remote-board", { detail: "shared-board" })));
    await waitFor(() => expect(useNoteStore.getState().notes).toHaveLength(2));
    expect(useNoteStore.getState().notes).toEqual(expect.arrayContaining([expect.objectContaining({ id: baseline.notes[0]!.id, title: "Their edit" }), expect.objectContaining({ title: "My edit (offline conflict copy)", createdBy: "editor" })]));
    await waitFor(() => expect(readCachedBoard("editor", "shared-board")?.pending).toBe(false));
  });
  it("updates a viewer from the server but never writes their working copy", async () => {
    const baseline = initialize(); repo.fetchBoardContents.mockResolvedValue({ ...baseline, notes: [{ ...baseline.notes[0], title: "Owner updated" }] });
    const { result } = renderHook(() => useBoardSync({ ...options, canWrite: false }), { wrapper }); act(() => result.current.markClean());
    act(() => window.dispatchEvent(new CustomEvent("tackly:remote-board", { detail: "shared-board" })));
    await waitFor(() => expect(useNoteStore.getState().notes[0]?.title).toBe("Owner updated")); expect(shared.saveSharedBoard).not.toHaveBeenCalled();
  });
});
