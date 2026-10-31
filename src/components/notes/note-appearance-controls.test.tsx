import { fireEvent, render, screen, within } from "@/test/render";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { NoteAppearanceControls } from "./note-appearance-controls";
import { NoteFocusDialog } from "./note-focus-dialog";
import { useNoteStore } from "@/stores/note-store";
import { NOTE_SIZE_PRESETS } from "@/config/note-styles";

function current() {
  const note = useNoteStore.getState().notes[0];
  if (!note) throw new Error("Expected note");
  return note;
}
function Harness() {
  const note = useNoteStore((state) => state.notes[0]);
  return note ? <NoteAppearanceControls note={note} /> : null;
}
function openAppearance() {
  fireEvent.click(screen.getByText("Note appearance"));
}

describe("post-creation appearance", () => {
  it("changes paper color and texture without changing the document or identity", () => {
    useNoteStore.getState().setContent(current().id, {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Keep my content", marks: [{ type: "bold" }] }] }],
    }, "Keep my content");
    const before = current();
    render(<Harness />); openAppearance();
    fireEvent.click(screen.getByRole("radio", { name: "Soft Pink" }));
    fireEvent.click(screen.getByRole("radio", { name: "Grid Paper" }));
    const after = current();
    expect(after.appearance).toMatchObject({ color: "pink", style: "grid" });
    expect(after.content).toBe(before.content);
    expect(after.excerpt).toBe(before.excerpt);
    expect(after.id).toBe(before.id);
    expect(after.subtasks).toBe(before.subtasks);
    expect(after.laneId).toBe(before.laneId);
  });

  it("applies every Canvas preset while retaining position, rotation and content", () => {
    const before = current();
    render(<Harness />); openAppearance();
    for (const [id, preset] of Object.entries(NOTE_SIZE_PRESETS)) {
      fireEvent.change(screen.getByLabelText("Canvas size"), { target: { value: id } });
      expect(current().transform).toEqual({ ...before.transform, ...preset });
      expect(current().content).toBe(before.content);
    }
  });

  it("shows free-resized dimensions honestly instead of selecting an unrelated preset", () => {
    useNoteStore.getState().setTransform(current().id, { width: 333, height: 222 });
    render(<Harness />); openAppearance();
    expect(screen.getByLabelText("Canvas size")).toHaveValue("custom");
    expect(screen.getByRole("option", { name: "Custom (333 ? 222)" })).toBeInTheDocument();
  });

  it("explains forced paper colors and enables color after switching styles", () => {
    render(<Harness />); openAppearance();
    fireEvent.click(screen.getByRole("radio", { name: "Dark Card" }));
    expect(screen.getByRole("radio", { name: "Soft Pink" })).toBeDisabled();
    expect(screen.getByText(/sets its own color/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Minimal" }));
    expect(screen.getByRole("radio", { name: "Soft Pink" })).toBeEnabled();
  });

  it("supports pin and lock, blocks appearance while locked, and unlocks in the editor", () => {
    useNoteStore.setState((state) => ({ notes: state.notes.map((note) => ({ ...note, pinned: false, locked: false })) }));
    render(<Harness />); openAppearance();
    fireEvent.click(screen.getByRole("button", { name: "Pin note" }));
    expect(current().pinned).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Lock note" }));
    expect(current().locked).toBe(true);
    expect(screen.getByLabelText("Canvas size")).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Grid Paper" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Unlock note" }));
    expect(current().locked).toBe(false);
    expect(screen.getByLabelText("Canvas size")).toBeEnabled();
  });

  it("keeps creation blank, with appearance applied only afterward", () => {
    const count = useNoteStore.getState().notes.length;
    const id = useNoteStore.getState().addNote(current().laneId);
    const created = useNoteStore.getState().notes.find((note) => note.id === id);
    expect(useNoteStore.getState().notes).toHaveLength(count + 1);
    expect(created).toMatchObject({ title: "", excerpt: "", content: null, subtasks: [] });
    expect(created?.appearance.coverUrl).toBeNull();
  });

  it("exposes customization through the shared focus editor and retains the note body", () => {
    const before = current();
    useNoteStore.getState().expandNote(before.id);
    render(<NoteFocusDialog />);
    const dialog = screen.getByTestId("note-focus-dialog");
    fireEvent.click(within(dialog).getByText("Note appearance"));
    fireEvent.change(within(dialog).getByLabelText("Canvas size"), { target: { value: "wide" } });
    expect(current().transform.width).toBe(420);
    act(() => useNoteStore.getState().toggleLock(before.id));
    fireEvent.click(within(dialog).getByRole("button", { name: "Unlock note" }));
    expect(within(dialog).getByRole("textbox", { name: "Note content" })).toHaveAttribute("contenteditable", "true");
    expect(current().excerpt).toBe(before.excerpt);
  });
});
