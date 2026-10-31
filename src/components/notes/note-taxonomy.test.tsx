import { render, screen, waitFor, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { TaxonomyProvider } from "@/features/taxonomy/context";
import { LOCAL_VOCABULARY_KEY } from "@/features/import-export/vocabulary";
import { PaperNoteCard } from "@/components/notes/paper-note-card";
import { AppShell } from "@/components/shell/app-shell";
import { EMPTY_FILTERS } from "@/features/board/filter-notes";
import { MOCK_TAGS } from "@/features/board/mock-board";
import { useNoteActions } from "@/features/notes/use-note-actions";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * Tags, categories and filtering (IMPLEMENTATION_PLAN.md §17).
 *
 * The harness explicitly imports a fixture vocabulary; creation is
 * unavailable — which is itself worth asserting, because offering "New tag…"
 * with no workspace to put it in would be a control that silently does nothing.
 */

/**
 * One card, with the real action wiring behind it.
 *
 * The assignment tests used to drive the whole `AppShell`, and opening a
 * submenu through it took long enough that they passed alone and timed out
 * under the full suite's parallelism. Radix submenus need `userEvent`'s normal
 * event delay to open, so the fix is less to render, not fewer waits.
 *
 * This still exercises the path that matters — menu → picker → `useNoteActions`
 * → store — without the board, canvas, palette, sidebar and toolbar.
 */
function CardHarness() {
  const actions = useNoteActions();
  const note = useNoteStore((state) => state.notes[0]);

  if (!note) throw new Error("expected the mock board to have a note");

  return <TaxonomyProvider workspaceId={null} ownerId={null}><PaperNoteCard note={note} menuActions={actions} /></TaxonomyProvider>;
}

beforeEach(() => { localStorage.setItem(LOCAL_VOCABULARY_KEY, JSON.stringify({ tags: MOCK_TAGS, categories: [] })); });

/** Renders the harness, opens its ⋯ menu, and returns the note's id. */
async function openCardMenu(): Promise<string> {
  render(<CardHarness />);

  const card = screen.getByTestId("paper-note-card");
  const noteId = card.getAttribute("data-note-id");
  if (!noteId) throw new Error("expected the card to carry its note id");

  const title = card.getAttribute("aria-label") ?? "";
  await userEvent.click(
    within(card).getByRole("button", { name: `More actions for ${title}` }),
  );

  return noteId;
}

describe("assigning tags", () => {
  it("puts a tag on a note and takes it off again", async () => {
    const noteId = await openCardMenu();

    // A tag this note does not already carry — the mock board seeds some, so
    // picking MOCK_TAGS[0] blindly would toggle an existing one *off*.
    const existing =
      useNoteStore.getState().notes.find((n) => n.id === noteId)?.tagIds ?? [];
    const tag = MOCK_TAGS.find((candidate) => !existing.includes(candidate.id));
    if (!tag) throw new Error("expected a tag the note does not have");

    await userEvent.click(screen.getByRole("menuitem", { name: /Tags/ }));

    const option = await screen.findByRole("checkbox", { name: tag.name });
    expect(option).toHaveAttribute("aria-checked", "false");

    await userEvent.click(option);

    await waitFor(() =>
      expect(
        useNoteStore.getState().notes.find((n) => n.id === noteId)?.tagIds,
      ).toContain(tag.id),
    );

    // The submenu stays open, which is the point of using checkboxes here
    // rather than menu items.
    await userEvent.click(screen.getByRole("checkbox", { name: tag.name }));

    await waitFor(() =>
      expect(
        useNoteStore.getState().notes.find((n) => n.id === noteId)?.tagIds,
      ).not.toContain(tag.id),
    );
  });

  it("offers no tag creation when there is no workspace to put it in", async () => {
    await openCardMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Tags/ }));

    await screen.findByRole("group", { name: "Note tags" });
    expect(
      screen.queryByRole("button", { name: /New tag/ }),
    ).not.toBeInTheDocument();
  });
});

describe("assigning a category", () => {
  it("offers None as a listed choice, since a note has exactly one", async () => {
    await openCardMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Category/ }));

    const group = await screen.findByRole("radiogroup", { name: "Note category" });
    const none = within(group).getByRole("radio", { name: /None/ });

    // Nothing is categorised yet, so None is the current value.
    expect(none).toHaveAttribute("aria-checked", "true");
  });
});

describe("filtering the board", () => {
  it("hides notes that do not carry the selected tag", async () => {
    render(<AppShell />);

    const tag = MOCK_TAGS[0];
    if (!tag) throw new Error("expected a seeded tag");

    const card = screen.getAllByTestId("paper-note-card")[0];
    const noteId = card?.getAttribute("data-note-id");
    if (!noteId) throw new Error("expected a note card");

    const before = screen.getAllByTestId("paper-note-card").length;

    await act(async () => {
      // Assigned outright rather than toggled: the seeded note may already
      // carry this tag, and a toggle would then take it off.
      useNoteStore.setState((state) => ({
        notes: state.notes.map((note) =>
          note.id === noteId
            ? { ...note, tagIds: [tag.id] }
            : { ...note, tagIds: [] },
        ),
      }));
      useSettingsStore.setState({
        boardFilters: { ...EMPTY_FILTERS, tagIds: [tag.id] },
      });
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("paper-note-card")).toHaveLength(1);
    });
    expect(before).toBeGreaterThan(1);
  });

  it("shows the active count on the Filter control", async () => {
    render(<AppShell />);

    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();

    await act(async () => {
      useSettingsStore.setState({
        boardFilters: {
          ...EMPTY_FILTERS,
          priorities: ["urgent"],
          completion: "complete",
        },
      });
    });

    // Filters persist, so a board can open already filtered — the count is
    // what stops that reading as missing notes.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Filter, 2 active" }),
      ).toBeInTheDocument();
    });
  });

  it("restores every note when the filters are cleared", async () => {
    render(<AppShell />);

    const before = screen.getAllByTestId("paper-note-card").length;

    await act(async () => {
      useSettingsStore.setState({
        boardFilters: { ...EMPTY_FILTERS, priorities: ["urgent"] },
      });
    });

    await act(async () => {
      useSettingsStore.getState().clearBoardFilters();
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("paper-note-card")).toHaveLength(before);
    });
  });
});
