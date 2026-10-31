import { render, screen, waitFor, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/shell/app-shell";
import { useNoteStore } from "@/stores/note-store";

/**
 * The command palette (IMPLEMENTATION_PLAN.md §18).
 *
 * Driven through `AppShell`, because the shortcut, the search button and the
 * navigation that a result performs all live at that level.
 */

async function openPalette() {
  await userEvent.keyboard("{Control>}k{/Control}");
  return screen.findByTestId("command-palette");
}

/** A title from the seeded board, to search for. */
function someNoteTitle(): string {
  const note = useNoteStore.getState().notes.find((candidate) => candidate.title);
  if (!note) throw new Error("expected a titled note on the mock board");
  return note.title;
}

describe("opening", () => {
  it("is closed until asked for", () => {
    render(<AppShell />);
    expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
  });

  it("opens with Ctrl+K, the shortcut the search button advertises", async () => {
    render(<AppShell />);

    // The button carries `aria-keyshortcuts="Control+K"`, so the binding has
    // to exist or the button is lying.
    expect(await openPalette()).toBeInTheDocument();
  });

  it("opens from the search button", async () => {
    render(<AppShell />);

    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByTestId("command-palette")).toBeInTheDocument();
  });

  it("explains what it searches before anything is typed", async () => {
    render(<AppShell />);
    const palette = await openPalette();

    expect(within(palette).getByText(/Search titles, note text/)).toBeInTheDocument();
    expect(within(palette).queryAllByRole("option")).toHaveLength(0);
  });
});

describe("searching", () => {
  it("finds a note by title as it is typed", async () => {
    render(<AppShell />);

    const title = someNoteTitle();
    const palette = await openPalette();

    await userEvent.type(within(palette).getByRole("combobox"), title.slice(0, 6));

    const options = await within(palette).findAllByRole("option");
    expect(options[0]).toHaveTextContent(title);
  });

  it("says so when nothing matches", async () => {
    render(<AppShell />);
    const palette = await openPalette();

    await userEvent.type(within(palette).getByRole("combobox"), "zzzqqq");

    expect(
      await within(palette).findByText(/No matches for/),
    ).toBeInTheDocument();
  });

  it("highlights the first result and moves with the arrow keys", async () => {
    render(<AppShell />);

    const palette = await openPalette();
    await userEvent.type(within(palette).getByRole("combobox"), "e");

    const options = await within(palette).findAllByRole("option");
    if (options.length < 2) throw new Error("expected more than one match for 'e'");

    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowDown}");

    await waitFor(() => {
      const current = within(screen.getByTestId("command-palette")).getAllByRole(
        "option",
      );
      expect(current[0]).toHaveAttribute("aria-selected", "false");
      expect(current[1]).toHaveAttribute("aria-selected", "true");
    });
  });
});

describe("choosing a result", () => {
  it("opens the chosen note and closes the palette", async () => {
    render(<AppShell />);

    const title = someNoteTitle();
    const palette = await openPalette();

    await userEvent.type(within(palette).getByRole("combobox"), title.slice(0, 6));
    await within(palette).findAllByRole("option");

    await userEvent.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument(),
    );

    // A result that only highlighted something would leave the user to find it.
    expect(useNoteStore.getState().expandedNoteId).not.toBeNull();
    expect(await screen.findByTestId("note-focus-dialog")).toBeInTheDocument();
  });

  it("forgets the query so reopening starts fresh", async () => {
    render(<AppShell />);

    const palette = await openPalette();
    await userEvent.type(within(palette).getByRole("combobox"), "venue");

    await act(async () => {
      await userEvent.keyboard("{Escape}");
    });

    const reopened = await openPalette();
    expect(within(reopened).getByRole("combobox")).toHaveValue("");
  });
});
