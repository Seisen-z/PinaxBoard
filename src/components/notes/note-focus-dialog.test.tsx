import { render, screen, waitFor, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/shell/app-shell";
import { isRichDocument, toPlainText } from "@/lib/tiptap/document";
import { useNoteStore } from "@/stores/note-store";

/**
 * Full-screen editing, and the migration that gets a pre-Milestone-9 note into
 * it (IMPLEMENTATION_PLAN.md §15).
 *
 * Driven through `AppShell` because that is where the dialog is mounted: one
 * editor for the whole app, opened from the store, so Edit on a card and Edit
 * on the canvas reach the same surface.
 */

/** The first note on the board, which the mock data gives a plain excerpt. */
function firstNote() {
  const note = useNoteStore.getState().notes[0];
  if (!note) throw new Error("expected the mock board to have a note");
  return note;
}

async function openFocusEditor(noteId: string) {
  render(<AppShell />);

  await act(async () => {
    useNoteStore.getState().expandNote(noteId);
  });

  return screen.findByTestId("note-focus-dialog");
}

describe("opening the full-screen editor", () => {
  it("is closed until a note is expanded", () => {
    render(<AppShell />);

    expect(screen.queryByTestId("note-focus-dialog")).not.toBeInTheDocument();
  });

  it("opens from the note menu's Edit", async () => {
    render(<AppShell />);

    const card = screen.getAllByTestId("paper-note-card")[0];
    if (!card) throw new Error("expected a note card");

    const title = card.getAttribute("aria-label") ?? "";
    await userEvent.click(
      within(card).getByRole("button", { name: `More actions for ${title}` }),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(await screen.findByTestId("note-focus-dialog")).toBeInTheDocument();
  });

  it("shows the note's body uncapped, and closes again", async () => {
    const note = firstNote();
    const dialog = await openFocusEditor(note.id);

    expect(
      within(dialog).getByRole("textbox", { name: "Note content" }),
    ).toHaveTextContent(note.excerpt.split("\n")[0] ?? "");

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Close editor" }),
    );

    await waitFor(() =>
      expect(screen.queryByTestId("note-focus-dialog")).not.toBeInTheDocument(),
    );
    expect(useNoteStore.getState().expandedNoteId).toBeNull();
  });

  it("closes if the note it is showing is deleted", async () => {
    const note = firstNote();
    await openFocusEditor(note.id);

    await act(async () => {
      useNoteStore.getState().deleteNote(note.id);
    });

    // Otherwise the editor stays open over a note that no longer exists.
    await waitFor(() =>
      expect(screen.queryByTestId("note-focus-dialog")).not.toBeInTheDocument(),
    );
  });
});

describe("editing in the full-screen editor", () => {
  it("writes the title straight through to the note", async () => {
    const note = firstNote();
    const dialog = await openFocusEditor(note.id);

    const title = within(dialog).getByRole("textbox", { name: "Note title" });
    await userEvent.clear(title);
    await userEvent.type(title, "Venue");

    expect(useNoteStore.getState().notes.find((n) => n.id === note.id)?.title).toBe(
      "Venue",
    );
  });

  it("migrates a pre-Milestone-9 note on its first edit", async () => {
    const note = firstNote();

    // Every note from Milestones 0–8 looks like this: text in `excerpt`, no
    // document at all.
    await act(async () => {
      useNoteStore.setState((state) => ({
        notes: state.notes.map((candidate) =>
          candidate.id === note.id
            ? { ...candidate, content: null, excerpt: "old plain body" }
            : candidate,
        ),
      }));
    });

    const dialog = await openFocusEditor(note.id);
    const body = within(dialog).getByRole("textbox", { name: "Note content" });

    // The old text is there to begin with, converted on the way in.
    expect(body).toHaveTextContent("old plain body");

    await userEvent.click(body);
    await userEvent.keyboard(" and more");

    await waitFor(() => {
      const updated = useNoteStore.getState().notes.find((n) => n.id === note.id);
      if (!updated) throw new Error("note disappeared");

      // Now stored as a document, with the original text preserved...
      expect(isRichDocument(updated.content)).toBe(true);
      expect(toPlainText(updated.content)).toContain("old plain body");

      // ...and the excerpt still matching it, since the two are written
      // together.
      expect(updated.excerpt).toBe(toPlainText(updated.content));
    });
  });
});

describe("a locked note", () => {
  it("opens read-only and says why", async () => {
    const note = firstNote();

    await act(async () => {
      useNoteStore.getState().toggleLock(note.id);
    });

    const dialog = await openFocusEditor(note.id);

    expect(within(dialog).getByText(/locked/i)).toBeInTheDocument();
    expect(
      within(dialog).getByRole("textbox", { name: "Note content" }),
    ).toHaveAttribute("contenteditable", "false");

    // The title is rendered as text, not as a field.
    expect(
      within(dialog).queryByRole("textbox", { name: "Note title" }),
    ).not.toBeInTheDocument();
  });
});
