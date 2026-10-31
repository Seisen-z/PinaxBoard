import { act, fireEvent, render, screen, waitFor, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteFocusDialog } from "./note-focus-dialog";
import { PaperNoteCard } from "./paper-note-card";
import { RichEditor } from "./rich-editor";
import { useNoteActions } from "@/features/notes/use-note-actions";
import { useNoteStore } from "@/stores/note-store";
import { fromPlainText, toPlainText, type RichDocument } from "@/lib/tiptap/document";

beforeEach(() => {
  useNoteStore.setState((state) => ({ notes: state.notes.map((note, index) => ({ ...note,
    title: index === 0 ? "Focus A" : "Focus B", locked: false, pinned: false,
    content: fromPlainText(index === 0 ? "Original body" : "Second body"),
    excerpt: index === 0 ? "Original body" : "Second body",
  })) }));
});
function first() {
  const note = useNoteStore.getState().notes[0];
  if (!note) throw new Error("Expected fixture note");
  return note;
}
function Harness() {
  const note = useNoteStore((state) => state.notes[0]);
  const actions = useNoteActions();
  return <>{note ? <PaperNoteCard note={note} menuActions={actions} /> : null}<NoteFocusDialog /></>;
}
async function open() {
  useNoteStore.getState().expandNote(first().id);
  render(<Harness />);
  const dialog = screen.getByTestId("note-focus-dialog");
  const body = await within(dialog).findByRole("textbox", { name: "Note content" });
  return { dialog, body };
}
async function edit(body: HTMLElement) {
  const user = userEvent.setup();
  await user.click(body);
  // One real paste is one history transaction. Four separately scheduled
  // keystrokes can span ProseMirror's grouping delay on a busy CI worker,
  // making a single Undo correctly leave the first character behind.
  await user.paste("EDIT");
  await waitFor(() => expect(first().excerpt).toContain("EDIT"));
}

describe("Milestone 20 focus mode", () => {
  it("opens the shared editor on a paper double-click", async () => {
    render(<Harness />);
    fireEvent.doubleClick(screen.getByTestId("paper-note-card"));
    expect(await screen.findByTestId("note-focus-dialog")).toBeInTheDocument();
    expect(useNoteStore.getState().expandedNoteId).toBe(first().id);
  });
  it("opens with Enter from the keyboard-focusable paper", async () => {
    render(<Harness />); const card = screen.getByTestId("paper-note-card");
    expect(card).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(await screen.findByTestId("note-focus-dialog")).toBeInTheDocument();
  });
  it("does not hijack nested controls or editable text selection", async () => {
    function EditableCard() {
      const note = useNoteStore((state) => state.notes[0]); const actions = useNoteActions();
      return note ? <PaperNoteCard note={note} menuActions={actions} onTitleChange={actions.setTitle} onContentChange={actions.setContent} /> : null;
    }
    render(<EditableCard />);
    const title = screen.getByRole("textbox", { name: /title/i });
    fireEvent.doubleClick(title);
    fireEvent.doubleClick(await screen.findByRole("textbox", { name: "Note content" }));
    fireEvent.doubleClick(screen.getByRole("button", { name: "More actions for Focus A" }));
    await userEvent.click(screen.getByRole("button", { name: "More actions for Focus A" }));
    fireEvent.doubleClick(screen.getByRole("menuitem", { name: "Pin" }));
    expect(useNoteStore.getState().expandedNoteId).toBeNull();
  });
  it("offers disabled Undo/Redo when no text edit exists and no Share action when an embed has no sharing handler", async () => {
    const { dialog } = await open();
    expect(within(dialog).getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Share board and its notes" })).toBeDisabled();
  });
  it("undoes and redoes real rich-text edits, keeping content/excerpt and card synchronized", async () => {
    const { dialog, body } = await open(); await edit(body);
    const edited = first().excerpt;
    await userEvent.click(within(dialog).getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(first().excerpt).toBe("Original body"));
    expect(toPlainText(first().content)).toBe(first().excerpt);
    expect(within(screen.getByTestId("paper-note-card")).getByText("Original body")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Redo" }));
    await waitFor(() => expect(first().excerpt).toBe(edited));
    expect(toPlainText(first().content)).toBe(edited);
  });
  it("tracks keyboard undo/redo in the visible controls", async () => {
    const { dialog, body } = await open(); await edit(body);
    await userEvent.keyboard("{Control>}z{/Control}");
    await waitFor(() => expect(first().excerpt).toBe("Original body"));
    expect(within(dialog).getByRole("button", { name: "Redo" })).toBeEnabled();
    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    await waitFor(() => expect(first().excerpt).toContain("EDIT"));
  });
  it("disables text history while locked without deleting the existing history", async () => {
    const { dialog, body } = await open(); await edit(body);
    act(() => useNoteStore.getState().toggleLock(first().id));
    expect(within(dialog).getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(body).toHaveAttribute("contenteditable", "false");
    const lockedText = first().excerpt;
    fireEvent.keyDown(body, { key: "z", code: "KeyZ", ctrlKey: true });
    expect(first().excerpt).toBe(lockedText);
    act(() => useNoteStore.getState().toggleLock(first().id));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Undo" })).toBeEnabled());
  });
  it("starts a fresh history when switching to another note", async () => {
    const { dialog, body } = await open(); await edit(body);
    const second = useNoteStore.getState().notes[1]; if (!second) throw new Error("Expected second note");
    act(() => useNoteStore.getState().expandNote(second.id));
    await waitFor(() => expect(within(dialog).getByRole("textbox", { name: "Note content" })).toHaveTextContent("Second body"));
    expect(within(dialog).getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Redo" })).toBeDisabled();
  });
  it("resets history on external replacement so Undo cannot overwrite newer data", async () => {
    const { dialog, body } = await open(); await edit(body);
    // JSONB may reorder keys in an otherwise identical server echo.
    const echoed: RichDocument = { content: [{ content: [{ text: first().excerpt, type: "text" }], type: "paragraph" }], type: "doc" };
    act(() => useNoteStore.getState().setContent(first().id, echoed, first().excerpt));
    expect(within(dialog).getByRole("button", { name: "Undo" })).toBeEnabled();
    act(() => {
      useNoteStore.getState().setTitle(first().id, "Remote title");
      useNoteStore.getState().setContent(first().id, fromPlainText("Newer external body"), "Newer external body");
    });
    expect(within(dialog).getByRole("textbox", { name: "Note title" })).toHaveValue("Remote title");
    await waitFor(() => expect(body).toHaveTextContent("Newer external body"));
    expect(within(dialog).getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Redo" })).toBeDisabled();
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(first().excerpt).toBe("Newer external body");
  });
  it("uses the existing More actions on the same record and closes after Archive", async () => {
    const { dialog } = await open();
    await userEvent.click(within(dialog).getByRole("button", { name: "More note actions" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Pin" }));
    expect(first().pinned).toBe(true);
    await userEvent.click(within(dialog).getByRole("button", { name: "More note actions" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(first().archived).toBe(true);
    await waitFor(() => expect(screen.queryByTestId("note-focus-dialog")).not.toBeInTheDocument());
  });
  it("Escape closes without losing the current content or creating another note", async () => {
    const { body } = await open(); await edit(body); const text = first().excerpt;
    const count = useNoteStore.getState().notes.length;
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("note-focus-dialog")).not.toBeInTheDocument());
    expect(first().excerpt).toBe(text); expect(useNoteStore.getState().notes).toHaveLength(count);
  });
  it("isolates the accessibility note editor and history across repeated note switches", async () => {
    const errors = vi.spyOn(console, "error");
    const warnings = vi.spyOn(console, "warn");
    const { dialog, body } = await open(); await edit(body);
    await userEvent.click(within(dialog).getByRole("button", { name: "History" }));
    const target = useNoteStore.getState().notes.find((note) => note.id === "note-a11y-pass")!;
    const savedTitle = target.title;
    const originalNotes = useNoteStore.getState().notes.map((note) => note.id);
    for (let index = 0; index < 3; index++) {
      act(() => useNoteStore.getState().expandNote(target.id));
      await waitFor(() => expect(within(dialog).getAllByRole("textbox", { name: "Note content" })).toHaveLength(1));
      expect(within(dialog).getAllByRole("button", { name: "Undo" })).toHaveLength(1);
      expect(within(dialog).getByRole("textbox", { name: "Note title" })).toHaveValue(savedTitle);
      expect(within(dialog).getByRole("button", { name: "History" })).toHaveAttribute("aria-expanded", "false");
      act(() => useNoteStore.getState().expandNote(first().id));
    }
    expect(useNoteStore.getState().notes.map((note) => note.id)).toEqual(originalNotes);
    const messages = [...errors.mock.calls, ...warnings.mock.calls].map((args) => args.join(" "));
    expect(messages.filter((message) => /Encountered two children|same key/.test(message))).toEqual([]);
  });
  it("does not add a history toolbar to ordinary cards", async () => {
    render(<RichEditor document={fromPlainText("Card body")} editable variant="card" />);
    await screen.findByRole("textbox", { name: "Note content" });
    expect(screen.queryByRole("toolbar", { name: "Text history" })).not.toBeInTheDocument();
  });
});
