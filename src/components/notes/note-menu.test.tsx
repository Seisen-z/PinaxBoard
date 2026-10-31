import { render, screen, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { AppShell } from "@/components/shell/app-shell";
import { DEFAULT_LANE_SEEDS } from "@/config/lanes";
import { useNoteStore } from "@/stores/note-store";
import type { Note } from "@/types/note";

/**
 * Milestone 3 — note actions driven through the real UI
 * (IMPLEMENTATION_PLAN.md §9).
 *
 * These go through `AppShell` rather than mounting the menu in isolation,
 * because the behaviour that matters is "the action reaches the store and the
 * card reflects it" — a menu that opens but does not change anything would
 * pass a unit test and fail the user.
 */

const TEST_NOTE_ID = "note-under-test";

function seed(overrides: Partial<Note> = {}) {
  const base = useNoteStore.getState().notes[0];
  if (!base) throw new Error("expected seeded mock notes");

  useNoteStore.getState().reset([
    {
      ...base,
      id: TEST_NOTE_ID,
      title: "Roadmap",
      excerpt: "Draft the plan",
      laneId: "lane-todo",
      pinned: false,
      locked: false,
      completed: false,
      priority: "none",
      subtasks: [],
      tagIds: [],
      appearance: { color: "cream", style: "sticky", coverUrl: null },
      ...overrides,
    },
  ]);
}

/** Opens the More menu for the seeded note and returns it. */
async function openMenu() {
  render(<AppShell />);
  await userEvent.click(
    screen.getByRole("button", { name: "More actions for Roadmap" }),
  );
  return screen.getByRole("menu");
}

const note = () => useNoteStore.getState().notes.find((n) => n.id === TEST_NOTE_ID);

beforeEach(() => {
  seed();
});

describe("note menu", () => {
  it("offers the action set from FRONTEND_SPEC §38", async () => {
    const menu = await openMenu();

    for (const label of [
      "Edit",
      "Duplicate",
      "Mark Done",
      "Pin",
      "Lock",
      "Change Color",
      "Change Style",
      "Change Priority",
      "Move to Column",
      "Archive",
      "Delete",
    ]) {
      expect(
        within(menu).getByRole("menuitem", { name: label }),
        `missing “${label}”`,
      ).toBeInTheDocument();
    }
  });

  it("separates the destructive actions from the safe ones", async () => {
    const menu = await openMenu();

    // Delete sits below a separator, never adjacent to an everyday action.
    const separators = within(menu).getAllByRole("separator");
    expect(separators.length).toBeGreaterThanOrEqual(3);
  });

  it("labels the toggles by what they will do next", async () => {
    seed({ pinned: true, locked: true, completed: true });
    const menu = await openMenu();

    expect(within(menu).getByRole("menuitem", { name: "Unpin" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Unlock" })).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Mark Incomplete" }),
    ).toBeInTheDocument();
  });
});

describe("note actions reach the store and the card", () => {
  it("duplicates the note", async () => {
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Duplicate" }));

    expect(useNoteStore.getState().notes).toHaveLength(2);
    expect(screen.getAllByTestId("paper-note-card")).toHaveLength(2);
  });

  it("deletes the note and removes its card", async () => {
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));

    expect(useNoteStore.getState().notes).toHaveLength(1);
      expect(useNoteStore.getState().notes[0]?.deletedAt).toEqual(expect.any(String));
    expect(screen.queryByTestId("paper-note-card")).not.toBeInTheDocument();
  });

  it("archives the note out of the board without deleting it", async () => {
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Archive" }));

    expect(note()?.archived).toBe(true);
    // Still stored — archive is reversible (FRONTEND_SPEC.md §75).
    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(screen.queryByTestId("paper-note-card")).not.toBeInTheDocument();
  });

  it("pins the note and shows the pin marker on the card", async () => {
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Pin" }));

    expect(note()?.pinned).toBe(true);
    expect(screen.getByRole("img", { name: "Pinned" })).toBeInTheDocument();
  });

  it("disables Delete while the note is locked", async () => {
    seed({ locked: true });
    const menu = await openMenu();

    expect(
      within(menu).getByRole("menuitem", { name: /Delete/ }),
    ).toHaveAttribute("data-disabled");

    // Unlock is right there, so the note is never stranded.
    expect(within(menu).getByRole("menuitem", { name: "Unlock" })).toBeEnabled();
  });

  it("keeps a locked note when Delete is activated anyway", async () => {
    seed({ locked: true });
    const menu = await openMenu();

    await userEvent.click(within(menu).getByRole("menuitem", { name: /Delete/ }));

    expect(useNoteStore.getState().notes).toHaveLength(1);
  });

  it("locks the note and shows the lock marker", async () => {
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Lock" }));

    expect(note()?.locked).toBe(true);
    expect(screen.getByRole("img", { name: "Locked" })).toBeInTheDocument();
    expect(screen.getByTestId("paper-note-card")).toHaveAttribute(
      "data-locked",
      "true",
    );
  });

  it("completes the note and dims the card", async () => {
    const menu = await openMenu();
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Mark Done" }));

    expect(note()?.completed).toBe(true);
    expect(screen.getByTestId("paper-note-card")).toHaveAttribute(
      "data-completed",
      "true",
    );
  });

  it("moves the note to another column", async () => {
    const menu = await openMenu();
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Move to Column" }),
    );

    const submenu = await screen.findByRole("menu", { name: "" }).catch(() => null);
    const target = submenu ?? screen.getAllByRole("menu").at(-1);
    if (!target) throw new Error("expected the column submenu to open");

    await userEvent.click(within(target).getByRole("menuitem", { name: "Ideas" }));

    expect(note()?.laneId).toBe("lane-ideas");
    expect(
      within(screen.getByTestId("board-lane-lane-ideas")).getByTestId(
        "paper-note-card",
      ),
    ).toBeInTheDocument();
  });

  it("disables the column the note is already in", async () => {
    const menu = await openMenu();
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Move to Column" }),
    );

    const submenu = screen.getAllByRole("menu").at(-1);
    if (!submenu) throw new Error("expected the column submenu to open");

    const current = DEFAULT_LANE_SEEDS.find((seed) => seed.id === "lane-todo");
    expect(
      within(submenu).getByRole("menuitem", { name: current?.name ?? "To Do" }),
    ).toHaveAttribute("data-disabled");
  });
});

describe("appearance pickers", () => {
  it("changes the note color and repaints the card", async () => {
    const menu = await openMenu();
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Change Color" }),
    );

    await userEvent.click(
      await screen.findByRole("radio", { name: "Lavender" }),
    );

    expect(note()?.appearance.color).toBe("lavender");
    expect(screen.getByTestId("paper-note-card")).toHaveStyle({
      backgroundColor: "var(--paper-lavender)",
    });
  });

  it("marks the current color as checked", async () => {
    const menu = await openMenu();
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Change Color" }),
    );

    expect(
      await screen.findByRole("radio", { name: "Neutral Cream" }),
    ).toBeChecked();
  });

  it("changes the note style", async () => {
    const menu = await openMenu();
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Change Style" }),
    );

    await userEvent.click(await screen.findByRole("radio", { name: /Grid Paper/ }));

    expect(note()?.appearance.style).toBe("grid");
  });

  it("changes the priority and shows the indicator on the card", async () => {
    const menu = await openMenu();
    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "Change Priority" }),
    );

    await userEvent.click(await screen.findByRole("radio", { name: /Urgent/ }));

    expect(note()?.priority).toBe("urgent");

    // Picking inside a submenu leaves the menu open, and Radix marks the rest
    // of the page `aria-hidden` while it is — so the card is only queryable by
    // role once the menu has closed.
    await userEvent.keyboard("{Escape}{Escape}");
    expect(
      screen.getByRole("img", { name: "Priority: Urgent" }),
    ).toBeInTheDocument();
  });
});

describe("direct manipulation on the card (FRONTEND_SPEC §73–§74)", () => {
  it("completes a note from the card's own checkbox", async () => {
    render(<AppShell />);

    await userEvent.click(
      screen.getByRole("checkbox", { name: "Mark Roadmap as done" }),
    );

    expect(note()?.completed).toBe(true);
  });

  it("edits the title in place", async () => {
    render(<AppShell />);

    const title = screen.getByRole("textbox", { name: "Note title" });
    await userEvent.clear(title);
    await userEvent.type(title, "New plan");

    expect(note()?.title).toBe("New plan");
  });

  it("makes a locked note's title read-only", async () => {
    seed({ locked: true });
    render(<AppShell />);

    const title = screen.getByRole("textbox", { name: "Note title" });
    await userEvent.type(title, "nope");

    expect(title).toHaveAttribute("readonly");
    expect(note()?.title).toBe("Roadmap");
  });

  it("ticks a subtask and advances the progress bar", async () => {
    seed({
      subtasks: [
        { id: "s1", noteId: TEST_NOTE_ID, title: "A", completed: false, position: 0 },
        { id: "s2", noteId: TEST_NOTE_ID, title: "B", completed: false, position: 1 },
      ],
    });
    render(<AppShell />);

    await userEvent.click(screen.getByRole("checkbox", { name: "A" }));

    expect(note()?.subtasks[0]?.completed).toBe(true);
    expect(
      screen.getByRole("progressbar", { name: "1 of 2 tasks completed" }),
    ).toBeInTheDocument();
  });

  it("selects a note on click and marks the card", async () => {
    render(<AppShell />);

    await userEvent.click(screen.getByTestId("paper-note-card"));

    expect(screen.getByTestId("paper-note-card")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });
});
