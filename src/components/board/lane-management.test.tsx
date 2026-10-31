import { act, render, screen, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { BoardWorkspace } from "@/components/board/board-workspace";
import { MAX_LANES } from "@/config/lanes";
import { useLaneStore, selectOrderedLanes } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";

/**
 * Columns are the user's own — created, renamed, recoloured, reordered and
 * deleted from the board (see `src/types/lane.ts`).
 */

const laneNames = () =>
  selectOrderedLanes(useLaneStore.getState()).map((lane) => lane.name);

/** Keep the real menu -> actions -> stores path, without unrelated shell/editor load.
 * The Ideas notes remain so delete/rehome assertions still exercise actual notes. */
function renderColumns() {
  useNoteStore.getState().reset(useNoteStore.getState().notes.filter((note) => note.laneId === "lane-ideas"));
  return render(<BoardWorkspace />);
}

/** Opens a column's options menu. */
async function openLaneMenu(name: string) {
  await userEvent.click(
    screen.getByRole("button", { name: `Column options for ${name}` }),
  );
  return screen.getByRole("menu");
}

describe("creating columns", () => {
  it("adds a column from the board", async () => {
    renderColumns();

    await userEvent.click(screen.getByRole("button", { name: "Add Column" }));

    expect(useLaneStore.getState().lanes).toHaveLength(6);
  });

  it("drops the new column straight into rename mode", async () => {
    renderColumns();

    await userEvent.click(screen.getByRole("button", { name: "Add Column" }));

    const input = document.activeElement;
    expect(input).toHaveAccessibleName(/^Rename column/);
  });

  it("hides Add Column once the cap is reached", () => {
    renderColumns();

    // Filled through the store rather than seven UI round-trips: the cap
    // itself is covered in lane-store.test.ts, and what matters here is that
    // the board's control disappears once it is hit.
    act(() => {
      while (useLaneStore.getState().lanes.length < MAX_LANES) {
        useLaneStore.getState().addLane();
      }
      useLaneStore.getState().endRename();
    });

    expect(
      screen.queryByRole("button", { name: "Add Column" }),
    ).not.toBeInTheDocument();
  });
});

describe("renaming columns", () => {
  it("renames from the column menu", async () => {
    renderColumns();

    const menu = await openLaneMenu("To Do");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Rename" }));

    const input = screen.getByRole("textbox", { name: "Rename column To Do" });
    await userEvent.clear(input);
    await userEvent.type(input, "Today{Enter}");

    expect(laneNames()[0]).toBe("Today");
  });

  it("renames by double-clicking the column title", async () => {
    renderColumns();

    await userEvent.dblClick(screen.getByRole("heading", { name: "Ideas" }));

    const input = screen.getByRole("textbox", { name: "Rename column Ideas" });
    await userEvent.clear(input);
    await userEvent.type(input, "Someday{Enter}");

    expect(laneNames().at(-1)).toBe("Someday");
  });

  it("keeps the old name when Escape cancels", async () => {
    renderColumns();

    await userEvent.dblClick(screen.getByRole("heading", { name: "Done" }));

    const input = screen.getByRole("textbox", { name: "Rename column Done" });
    await userEvent.clear(input);
    await userEvent.type(input, "Shipped{Escape}");

    expect(laneNames()).toContain("Done");
    expect(laneNames()).not.toContain("Shipped");
  });

  it("keeps the old name when the field is left blank", async () => {
    renderColumns();

    await userEvent.dblClick(screen.getByRole("heading", { name: "Review" }));

    const input = screen.getByRole("textbox", { name: "Rename column Review" });
    await userEvent.clear(input);
    await userEvent.tab();

    // An anonymous column header helps nobody.
    expect(laneNames()).toContain("Review");
  });
});

describe("reordering columns", () => {
  it("moves a column left", async () => {
    renderColumns();

    const menu = await openLaneMenu("Review");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Move Left" }));

    expect(laneNames()).toEqual([
      "To Do",
      "Review",
      "In Progress",
      "Done",
      "Ideas",
    ]);
  });

  it("disables Move Left on the first column", async () => {
    renderColumns();

    const menu = await openLaneMenu("To Do");
    expect(
      within(menu).getByRole("menuitem", { name: "Move Left" }),
    ).toHaveAttribute("data-disabled");
  });

  it("disables Move Right on the last column", async () => {
    renderColumns();

    const menu = await openLaneMenu("Ideas");
    expect(
      within(menu).getByRole("menuitem", { name: "Move Right" }),
    ).toHaveAttribute("data-disabled");
  });
});

describe("deleting columns", () => {
  it("removes the column", async () => {
    renderColumns();

    const menu = await openLaneMenu("Ideas");
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: /Delete Column/ }),
    );

    expect(laneNames()).not.toContain("Ideas");
  });

  it("rehomes the column's notes rather than deleting them", async () => {
    renderColumns();

    const before = useNoteStore.getState().notes.length;
    const orphans = useNoteStore
      .getState()
      .notes.filter((note) => note.laneId === "lane-ideas");
    expect(orphans.length).toBeGreaterThan(0);

    const menu = await openLaneMenu("Ideas");
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: /Delete Column/ }),
    );

    // Losing a column's work to a menu click is not a recoverable mistake.
    expect(useNoteStore.getState().notes).toHaveLength(before);
    for (const orphan of orphans) {
      const moved = useNoteStore
        .getState()
        .notes.find((note) => note.id === orphan.id);
      expect(moved?.laneId).toBe("lane-todo");
    }
  });

  it("disables Delete on the only remaining column", async () => {
    renderColumns();

    for (const name of ["In Progress", "Review", "Done", "Ideas"]) {
      const menu = await openLaneMenu(name);
      await userEvent.click(
        within(menu).getByRole("menuitem", { name: /Delete Column/ }),
      );
    }

    const menu = await openLaneMenu("To Do");
    expect(
      within(menu).getByRole("menuitem", { name: /Delete Column/ }),
    ).toHaveAttribute("data-disabled");
  });
});

describe("recolouring columns", () => {
  it("sets a column colour from the menu", async () => {
    renderColumns();

    const menu = await openLaneMenu("To Do");
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Column Color" }),
    );
    await userEvent.click(await screen.findByRole("radio", { name: "Red" }));

    expect(selectOrderedLanes(useLaneStore.getState())[0]?.color).toBe(
      "var(--priority-urgent)",
    );
  });
});
