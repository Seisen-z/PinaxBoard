import { fireEvent, render, screen, waitFor, within } from "@/test/render";
import { describe, expect, it, vi } from "vitest";
import { BoardWorkspace } from "@/components/board/board-workspace";
import { commitBoardDrop } from "@/features/board/board-dnd";
import { diffById, snapshotById } from "@/features/notes/sync-engine";
import { noteToUpdate } from "@/lib/mappers/note";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";

describe("Board column drops", () => {
  it("updates only laneId once, preserving id, content and Canvas coordinates", () => {
    const before = useNoteStore.getState().notes;
    const note = before[0]!;
    const lane = useLaneStore.getState().lanes.find((record) => record.id !== note.laneId)!;
    const snapshot = snapshotById(before);
    expect(commitBoardDrop(note.id, lane.id)).toBe(true);
    const after = useNoteStore.getState().notes;
    const moved = after.find((record) => record.id === note.id)!;
    expect(after).toHaveLength(before.length);
    expect(moved).toEqual({ ...note, laneId: lane.id, updatedAt: moved.updatedAt });
    expect(moved.transform).toBe(note.transform);
    expect(moved.content).toBe(note.content);
    expect(diffById(snapshot, after).upserts).toEqual([moved]);
    expect(noteToUpdate(moved).lane_id).toBe(lane.id);
    expect(diffById(snapshot, after).deletions).toEqual([]);
    expect(commitBoardDrop(note.id, lane.id)).toBe(false);
    expect(useNoteStore.getState().notes).toBe(after);
  });

  it("ignores missing destinations, cancelled/outside drops, and stale records", () => {
    const state = useNoteStore.getState();
    const note = state.notes[0]!;
    expect(commitBoardDrop(note.id, null)).toBe(false);
    expect(commitBoardDrop(note.id, "missing-column")).toBe(false);
    expect(commitBoardDrop("missing-note", note.laneId)).toBe(false);
    expect(useNoteStore.getState().notes).toBe(state.notes);
  });

  it("does not drag locked, archived, deleted or cross-board notes", () => {
    const base = useNoteStore.getState().notes[0]!;
    const lane = useLaneStore.getState().lanes.find((record) => record.id !== base.laneId)!;
    for (const patch of [{ locked: true }, { archived: true }, { deletedAt: base.createdAt }, { boardId: "another-board" }]) {
      useNoteStore.getState().reset([{ ...base, ...patch }]);
      const before = useNoteStore.getState().notes;
      expect(commitBoardDrop(base.id, lane.id)).toBe(false);
      expect(useNoteStore.getState().notes).toBe(before);
    }
  });
});

/** Geometry fixture, not a mocked drag callback: real dnd-kit sensors run in jsdom. */
function measuredBoard() {
  const lanes = useLaneStore.getState().lanes;
  const base = useNoteStore.getState().notes[0]!;
  const note = { ...base, laneId: lanes[0]!.id, locked: false, completed: false };
  useNoteStore.getState().reset([note]);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const laneId = this.closest("[data-lane-id]")?.getAttribute("data-lane-id");
    const index = lanes.findIndex((lane) => lane.id === laneId);
    const left = Math.max(0, index) * 320;
    return new DOMRect(left, this.hasAttribute("data-lane-id") ? 0 : 80, 300, this.hasAttribute("data-lane-id") ? 500 : 100);
  });
  render(<BoardWorkspace />);
  return { note, lanes, handle: screen.getByRole("button", { name: `Move ${note.title} to another column` }) };
}

describe("Board drag UI", () => {
  it("moves by pointer from the handle, not from the editable title", async () => {
    class TestPointerEvent extends MouseEvent {
      readonly isPrimary: boolean;
      readonly pointerId: number;
      readonly pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.isPrimary = init.isPrimary ?? true;
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? "mouse";
      }
    }
    vi.stubGlobal("PointerEvent", TestPointerEvent);
    try {
      const { note, lanes, handle } = measuredBoard();
      const before = useNoteStore.getState().notes;
      const title = screen.getByRole("textbox", { name: "Note title" });
      fireEvent.pointerDown(title, { clientX: 30, clientY: 100, button: 0, isPrimary: true });
      fireEvent.pointerMove(document, { clientX: 350, clientY: 150 });
      expect(document.querySelector('[data-dragging="true"]')).toBeNull();
      fireEvent.pointerUp(document);
      fireEvent.pointerDown(handle, { clientX: 30, clientY: 100, button: 0, isPrimary: true });
      fireEvent.pointerMove(document, { clientX: 50, clientY: 100 });
      await waitFor(() => expect(document.querySelector('[data-dragging="true"]')).not.toBeNull());
      fireEvent.pointerMove(document, { clientX: 350, clientY: 150 });
      await waitFor(() => expect(screen.getByTestId(`board-lane-${lanes[1]!.id}`)).toHaveAttribute("data-drop-target", "true"));
      expect(useNoteStore.getState().notes).toBe(before);
      fireEvent.pointerUp(document, { clientX: 350, clientY: 150 });
      await waitFor(() => expect(useNoteStore.getState().notes[0]!.laneId).toBe(lanes[1]!.id));
      expect(useNoteStore.getState().notes[0]!.id).toBe(note.id);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("moves by keyboard into an empty column and commits only on drop", async () => {
    const { note, lanes, handle } = measuredBoard();
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(document.querySelector('[data-dragging="true"]')).not.toBeNull());
    fireEvent.keyDown(document, { code: "ArrowRight", key: "ArrowRight" });
    await waitFor(() => expect(screen.getByTestId(`board-lane-${lanes[1]!.id}`)).toHaveAttribute("data-drop-target", "true"));
    expect(useNoteStore.getState().notes[0]!.laneId).toBe(note.laneId);
    fireEvent.keyDown(document, { code: "Space", key: " " });
    await waitFor(() => expect(useNoteStore.getState().notes[0]!.laneId).toBe(lanes[1]!.id));
    expect(within(screen.getByTestId(`board-lane-${lanes[1]!.id}`)).getAllByTestId("paper-note-card")).toHaveLength(1);
    expect(useNoteStore.getState().notes).toHaveLength(1);
  });

  it("Escape cancels without changing the note", async () => {
    const { handle } = measuredBoard();
    const before = useNoteStore.getState().notes;
    handle.focus();
    fireEvent.keyDown(handle, { code: "Space", key: " " });
    await waitFor(() => expect(document.querySelector('[data-dragging="true"]')).not.toBeNull());
    fireEvent.keyDown(document, { code: "Escape", key: "Escape" });
    await waitFor(() => expect(document.querySelector('[data-dragging="true"]')).toBeNull());
    expect(useNoteStore.getState().notes).toBe(before);
  });

  it("disables handles on locked notes but keeps title and menus independent", () => {
    const base = useNoteStore.getState().notes[0]!;
    useNoteStore.getState().reset([{ ...base, locked: true }]);
    render(<BoardWorkspace />);
    expect(screen.getByRole("button", { name: /^Move .* to another column$/ })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Note title" })).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: /^More actions/ })).toBeEnabled();
  });
});
