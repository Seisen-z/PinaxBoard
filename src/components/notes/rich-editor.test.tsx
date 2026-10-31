import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RichEditor } from "@/components/notes/rich-editor";
import { fromPlainText, toPlainText, type RichDocument } from "@/lib/tiptap/document";

/**
 * The rich editor, driven the way a user drives it.
 *
 * These are deliberately integration tests against a real Tiptap instance
 * rather than a mocked one: the thing worth proving is that the slash menu,
 * the keymap and the document all agree, and a mock would assert only that we
 * called the functions we wrote.
 */

/** Mounts the editor and returns its surface plus the change spy. */
async function mountEditor(options: { document?: RichDocument } = {}) {
  const onChange = vi.fn<(document: RichDocument, text: string) => void>();

  render(
    <RichEditor
      document={options.document ?? fromPlainText("")}
      editable
      onChange={onChange}
    />,
  );

  const surface = await screen.findByRole("textbox", { name: "Note content" });
  return { surface, onChange };
}

describe("editing", () => {
  it("reports the document and its plain text on every change", async () => {
    const { surface, onChange } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("Venue booked");

    await waitFor(() => expect(onChange).toHaveBeenCalled());

    const [document, text] = onChange.mock.calls.at(-1) ?? [];

    expect(text).toBe("Venue booked");
    // The two must describe the same note — that is the whole reason the
    // store writes them together.
    expect(toPlainText(document)).toBe("Venue booked");
  });

  it("renders a note written before the rich editor", async () => {
    const { surface } = await mountEditor({
      document: fromPlainText("first line\nsecond line"),
    });

    expect(surface).toHaveTextContent("first line");
    expect(surface).toHaveTextContent("second line");
  });
});

describe("read-only rendering", () => {
  it("renders the document without an editing surface", async () => {
    render(<RichEditor document={fromPlainText("read me")} editable={false} />);

    const surface = await screen.findByRole("textbox", { name: "Note content" });

    expect(surface).toHaveTextContent("read me");
    expect(surface).toHaveAttribute("contenteditable", "false");
  });
});

describe("the slash menu", () => {
  it("opens on a slash typed at the start of a block", async () => {
    const { surface } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("/");

    const menu = await screen.findByTestId("slash-menu");
    expect(within(menu).getByRole("option", { name: /Checklist/ })).toBeInTheDocument();
  });

  it("stays shut for a slash in the middle of a word", async () => {
    const { surface } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("and/or");

    // Otherwise typing a date or a path would open a block menu mid-sentence.
    expect(screen.queryByTestId("slash-menu")).not.toBeInTheDocument();
  });

  it("filters by keyword, not only by label", async () => {
    const { surface } = await mountEditor();

    await userEvent.click(surface);
    // "todo" is nobody's name for it in our catalogue — it is a keyword.
    await userEvent.keyboard("/todo");

    const menu = await screen.findByTestId("slash-menu");
    const options = within(menu).getAllByRole("option");

    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Checklist");
  });

  it("says so when nothing matches", async () => {
    const { surface } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("/zzzz");

    expect(await screen.findByText("No matching blocks")).toBeInTheDocument();
  });

  it("closes on Escape without inserting anything", async () => {
    const { surface, onChange } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("/");
    await screen.findByTestId("slash-menu");

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByTestId("slash-menu")).not.toBeInTheDocument(),
    );

    const [, text] = onChange.mock.calls.at(-1) ?? [];
    expect(text).toBe("/");
  });

  it("inserts the chosen block and removes the typed command", async () => {
    const { surface, onChange } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("/todo");
    await screen.findByTestId("slash-menu");

    await userEvent.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.queryByTestId("slash-menu")).not.toBeInTheDocument(),
    );

    // The checklist is in the document...
    await waitFor(() => {
      const [document] = onChange.mock.calls.at(-1) ?? [];
      expect(JSON.stringify(document)).toContain("taskList");
    });

    // ...and the "/todo" the user typed to get it is not.
    const [, text] = onChange.mock.calls.at(-1) ?? [];
    expect(text).not.toContain("/todo");
  });

  it("moves the highlight with the arrow keys", async () => {
    const { surface } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("/");

    const menu = await screen.findByTestId("slash-menu");
    const optionsBefore = within(menu).getAllByRole("option");
    expect(optionsBefore[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowDown}");

    await waitFor(() => {
      const options = within(screen.getByTestId("slash-menu")).getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "false");
      expect(options[1]).toHaveAttribute("aria-selected", "true");
    });
  });

  it("wraps the highlight around the ends of the list", async () => {
    const { surface } = await mountEditor();

    await userEvent.click(surface);
    await userEvent.keyboard("/");
    await screen.findByTestId("slash-menu");

    // Up from the first row lands on the last, rather than doing nothing.
    await userEvent.keyboard("{ArrowUp}");

    await waitFor(() => {
      const options = within(screen.getByTestId("slash-menu")).getAllByRole("option");
      expect(options[options.length - 1]).toHaveAttribute("aria-selected", "true");
    });
  });
});
