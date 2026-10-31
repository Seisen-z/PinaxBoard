import { act, fireEvent, render, screen, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { AppShell } from "@/components/shell/app-shell";
import { createBlankNote } from "@/features/notes/create-note";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Note } from "@/types/note";

/**
 * Board settings, and the right-click route into them.
 *
 * The Board and the Canvas deliberately expose *different* settings, so these
 * also assert that neither surface shows the other's.
 */

function note(id: string, overrides: Partial<Note> = {}): Note {
  return {
    ...createBlankNote({
      boardId: "board",
      ownerId: "owner",
      laneId: "lane-todo",
    }),
    id,
    title: id,
    ...overrides,
  };
}

beforeEach(() => {
  useSettingsStore.setState({
    boardSort: "manual",
    boardShowCompleted: true,
    boardDensity: "comfortable",
  });
});

/** Opens the board settings menu from the floating cluster. */
async function openBoardSettings() {
  render(<AppShell />);
  await userEvent.click(screen.getByRole("button", { name: "Board settings" }));
  return screen.getByRole("menu");
}

describe("board settings menu", () => {
  it("offers sort, card size and completed visibility", async () => {
    const menu = await openBoardSettings();

    expect(within(menu).getByRole("menuitem", { name: /Sort by/ })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Card size/ })).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /completed notes/ }),
    ).toBeInTheDocument();
  });

  it("changes the sort order", async () => {
    const menu = await openBoardSettings();
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Sort by/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Priority/ }));

    expect(useSettingsStore.getState().boardSort).toBe("priority");
  });

  it("changes card density", async () => {
    const menu = await openBoardSettings();
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Card size/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /Compact/ }));

    expect(useSettingsStore.getState().boardDensity).toBe("compact");
  });

  it("toggles completed notes", async () => {
    const menu = await openBoardSettings();
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Hide completed notes" }),
    );

    expect(useSettingsStore.getState().boardShowCompleted).toBe(false);
  });
});

describe("settings change what the board renders", () => {
  beforeEach(() => {
    useNoteStore.getState().reset([
      note("open"),
      note("finished", { completed: true }),
    ]);
  });

  it("hides completed notes when asked", async () => {
    render(<AppShell />);
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(2);

    act(() => {
      useSettingsStore.getState().setBoardShowCompleted(false);
    });

    const remaining = screen.getAllByTestId("paper-note-card");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveAttribute("aria-label", "open");
  });

  it("reorders notes when the sort changes", async () => {
    useNoteStore
      .getState()
      .reset([note("b", { priority: "low" }), note("a", { priority: "urgent" })]);

    render(<AppShell />);
    expect(
      screen.getAllByTestId("paper-note-card").map((el) => el.dataset.noteId),
    ).toEqual(["b", "a"]);

    act(() => {
      useSettingsStore.getState().setBoardSort("priority");
    });

    expect(
      screen.getAllByTestId("paper-note-card").map((el) => el.dataset.noteId),
    ).toEqual(["a", "b"]);
  });
});

describe("right-click opens settings instead of the browser menu", () => {
  it("opens board settings from the board background", async () => {
    render(<AppShell />);

    fireEvent.contextMenu(screen.getByTestId("board-workspace"));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /Sort by/ })).toBeInTheDocument();
  });

  it("opens the note menu from a card", async () => {
    useNoteStore.getState().reset([note("target")]);
    render(<AppShell />);

    fireEvent.contextMenu(screen.getByTestId("paper-note-card"));

    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Duplicate" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Delete/ })).toBeInTheDocument();
  });

  it("drives the same actions as the ⋯ button", async () => {
    useNoteStore.getState().reset([note("target")]);
    render(<AppShell />);

    fireEvent.contextMenu(screen.getByTestId("paper-note-card"));
    await userEvent.click(
      within(await screen.findByRole("menu")).getByRole("menuitem", {
        name: "Duplicate",
      }),
    );

    expect(useNoteStore.getState().notes).toHaveLength(2);
  });
});

describe("the two surfaces expose different settings", () => {
  it("shows board settings on the Board and not canvas settings", () => {
    render(<AppShell />);

    expect(
      screen.getByRole("group", { name: "Board settings" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Canvas" })).not.toBeInTheDocument();
  });

  it("shows canvas settings on the Canvas and not board settings", async () => {
    render(<AppShell />);

    await userEvent.click(
      within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Canvas" }),
    );

    expect(screen.getByRole("group", { name: "Canvas" })).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Board settings" }),
    ).not.toBeInTheDocument();
  });

  it("offers grid settings on the canvas that the board does not have", async () => {
    render(<AppShell />);

    await userEvent.click(
      within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Canvas" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Canvas settings" }));

    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /Grid size/ })).toBeInTheDocument();
    // Sorting is a column concern; it has no meaning on a free canvas.
    expect(
      within(menu).queryByRole("menuitem", { name: /Sort by/ }),
    ).not.toBeInTheDocument();
  });
});
