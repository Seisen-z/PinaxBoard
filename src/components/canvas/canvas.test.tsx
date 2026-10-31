import { act, fireEvent, render, screen, within } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { LOCAL_VOCABULARY_KEY } from "@/features/import-export/vocabulary";
import { AppShell } from "@/components/shell/app-shell";
import { createBlankNote } from "@/features/notes/create-note";
import { MOCK_TAGS } from "@/features/board/mock-board";
import {
  DEFAULT_GRID_SIZE,
  DEFAULT_VIEWPORT,
  useCanvasStore,
} from "@/stores/canvas-store";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";
import type { Note } from "@/types/note";

/**
 * Milestone 4 — Canvas Mode through the real shell
 * (IMPLEMENTATION_PLAN.md §10).
 *
 * jsdom has no layout engine, so these cover wiring, state and the
 * interaction contract. The pointer geometry itself is covered exhaustively
 * and deterministically by `src/lib/canvas.test.ts`.
 */

/** A note that has been put on the Canvas. */
function placed(id: string, x: number, y: number, zIndex: number): Note {
  const base = createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane-todo" });
  return {
    ...base,
    id,
    title: `Note ${id}`,
    onCanvas: true,
    transform: { ...base.transform, x, y, zIndex },
  };
}

/** A note that lives only on the Board. */
function boardOnly(id: string): Note {
  return { ...placed(id, 0, 0, 1), onCanvas: false };
}

beforeEach(() => {
  useCanvasStore.setState({
    viewport: DEFAULT_VIEWPORT,
    gridMode: "dot",
    gridSize: DEFAULT_GRID_SIZE,
    snapToGrid: false,
    interacting: false,
    viewportSize: { width: 1000, height: 600 },
  });

  useNoteStore.getState().reset([
    placed("a", 0, 0, 1),
    placed("b", 400, 200, 2),
    placed("c", 900, 500, 3),
  ]);
});

/** Renders the shell and switches to Canvas Mode. */
async function openCanvas() {
  render(<AppShell />);

  await userEvent.click(
    within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Canvas" }),
  );

  return screen.getByRole("main", { name: "Canvas" });
}

describe("switching into Canvas Mode", () => {
  it("is offered as an available view", () => {
    render(<AppShell />);

    expect(
      within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Canvas" }),
    ).toBeEnabled();
  });

  it("replaces the lane board with the canvas", async () => {
    await openCanvas();

    expect(screen.queryByRole("main", { name: "Board" })).not.toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Canvas" })).toBeInTheDocument();
  });

  it("renders every note as a positioned canvas object", async () => {
    const canvas = await openCanvas();

    const notes = within(canvas).getAllByTestId("canvas-note");
    expect(notes).toHaveLength(3);

    // Position comes from the note's own transform, in canvas units.
    expect(notes.find((el) => el.dataset.noteId === "b")).toHaveStyle({
      transform: "translate(400px, 200px) rotate(0deg)",
    });
  });

  it("applies the viewport as a single transform on the content layer", async () => {
    await openCanvas();

    act(() => {
      useCanvasStore.getState().panBy({ x: 50, y: 25 });
    });

    expect(screen.getByTestId("canvas-content")).toHaveStyle({
      transform: "translate(50px, 25px) scale(1)",
    });
  });

  it("hides archived notes", async () => {
    useNoteStore.getState().setArchived("b", true);
    const canvas = await openCanvas();

    expect(within(canvas).getAllByTestId("canvas-note")).toHaveLength(2);
  });
});

describe("canvas controls", () => {
  it("appear only in Canvas Mode", async () => {
    render(<AppShell />);
    expect(screen.queryByRole("group", { name: "Canvas" })).not.toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole("navigation", { name: "Primary" })).getByRole("button", { name: "Canvas" }),
    );

    expect(screen.getByRole("group", { name: "Canvas" })).toBeInTheDocument();
  });

  it("cycles the grid through dots, lines and off", async () => {
    await openCanvas();
    const controls = screen.getByRole("group", { name: "Canvas" });

    expect(screen.getByTestId("canvas-grid")).toHaveAttribute(
      "data-grid-mode",
      "dot",
    );

    await userEvent.click(within(controls).getByRole("button", { name: /Grid: dots/ }));
    expect(useCanvasStore.getState().gridMode).toBe("line");

    await userEvent.click(within(controls).getByRole("button", { name: /Grid: lines/ }));
    expect(useCanvasStore.getState().gridMode).toBe("off");
    expect(screen.queryByTestId("canvas-grid")).not.toBeInTheDocument();
  });

  it("toggles snap-to-grid", async () => {
    await openCanvas();
    const controls = screen.getByRole("group", { name: "Canvas" });

    await userEvent.click(
      within(controls).getByRole("button", { name: "Snap to grid: off" }),
    );

    expect(useCanvasStore.getState().snapToGrid).toBe(true);
    expect(
      within(controls).getByRole("button", { name: "Snap to grid: on" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("frames every note on fit-to-content", async () => {
    await openCanvas();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Canvas" })).getByRole("button", {
        name: "Fit to content",
      }),
    );

    // The notes span well past the 1000×600 viewport, so fitting zooms out.
    expect(useCanvasStore.getState().viewport.zoom).toBeLessThan(1);
    expect(useCanvasStore.getState().viewport).not.toEqual(DEFAULT_VIEWPORT);
  });

  it("leaves the viewport alone when fitting an empty canvas", async () => {
    useNoteStore.getState().reset([]);
    await openCanvas();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Canvas" })).getByRole("button", {
        name: "Fit to content",
      }),
    );

    expect(useCanvasStore.getState().viewport).toEqual(DEFAULT_VIEWPORT);
  });
});

describe("zoom controls drive the canvas viewport", () => {
  it("steps the canvas zoom, not a separate lane zoom", async () => {
    await openCanvas();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", {
        name: "Zoom in",
      }),
    );

    expect(useCanvasStore.getState().viewport.zoom).toBe(1.25);
  });

  it("resets the whole viewport, not only the zoom", async () => {
    await openCanvas();
    useCanvasStore.getState().panBy({ x: 300, y: 300 });

    await userEvent.click(
      within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", {
        name: /Zoom level 100 percent/,
      }),
    );

    expect(useCanvasStore.getState().viewport).toEqual(DEFAULT_VIEWPORT);
  });
});

describe("selection on the canvas", () => {
  it("selects a note on pointer down", async () => {
    const canvas = await openCanvas();

    const noteB = within(canvas)
      .getAllByTestId("canvas-note")
      .find((el) => el.dataset.noteId === "b");
    if (!noteB) throw new Error("expected note b");

    await userEvent.pointer({ target: noteB, keys: "[MouseLeft>]" });

    expect([...useSelectionStore.getState().selectedIds]).toEqual(["b"]);
  });

  it("extends the selection with Ctrl", async () => {
    const canvas = await openCanvas();
    const notes = within(canvas).getAllByTestId("canvas-note");

    const a = notes.find((el) => el.dataset.noteId === "a");
    const b = notes.find((el) => el.dataset.noteId === "b");
    if (!a || !b) throw new Error("expected notes a and b");

    await userEvent.pointer({ target: a, keys: "[MouseLeft>]" });
    // userEvent's keyboard state does not reach synthesized pointer events, so
    // the modifier is set on the event itself.
    fireEvent.pointerDown(b, { button: 0, ctrlKey: true });

    expect([...useSelectionStore.getState().selectedIds].sort()).toEqual(["a", "b"]);
  });

  it("shows resize grips only for a lone selection", async () => {
    const canvas = await openCanvas();

    expect(screen.queryByTestId("resize-handle-se")).not.toBeInTheDocument();

    act(() => {
      useSelectionStore.getState().selectMany(["a"]);
    });
    expect(within(canvas).getByTestId("resize-handle-se")).toBeInTheDocument();

    act(() => {
      useSelectionStore.getState().selectMany(["a", "b"]);
    });
    expect(screen.queryByTestId("resize-handle-se")).not.toBeInTheDocument();
  });

  it("does not offer resize grips on a locked note", async () => {
    useNoteStore.getState().toggleLock("a");
    await openCanvas();

    act(() => {
      useSelectionStore.getState().selectMany(["a"]);
    });
    expect(screen.queryByTestId("resize-handle-se")).not.toBeInTheDocument();
  });
});

describe("Canvas Mode offers the same editing as the Board", () => {
  it("opens the note menu from a canvas note", async () => {
    const canvas = await openCanvas();

    await userEvent.click(
      within(canvas).getByRole("button", { name: "More actions for Note a" }),
    );

    const menu = screen.getByRole("menu");
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Duplicate" }));

    expect(useNoteStore.getState().notes).toHaveLength(4);
  });

  it("edits a note title in place", async () => {
    const canvas = await openCanvas();

    const title = within(canvas).getAllByRole("textbox", {
      name: "Note title",
    })[0];
    if (!title) throw new Error("expected an editable title on the canvas");

    await userEvent.clear(title);
    await userEvent.type(title, "Renamed on canvas");

    expect(
      useNoteStore.getState().notes.some((n) => n.title === "Renamed on canvas"),
    ).toBe(true);
  });

  it("completes a note from the card's checkbox", async () => {
    const canvas = await openCanvas();

    await userEvent.click(
      within(canvas).getByRole("checkbox", { name: "Mark Note a as done" }),
    );

    expect(
      useNoteStore.getState().notes.find((n) => n.id === "a")?.completed,
    ).toBe(true);
  });

  it("does not start a drag from a control or a text field", async () => {
    const canvas = await openCanvas();

    const title = within(canvas).getAllByRole("textbox", {
      name: "Note title",
    })[0];
    if (!title) throw new Error("expected an editable title on the canvas");

    await userEvent.click(title);

    // A press on a field must reach the field. Starting a drag here is what
    // made canvas notes impossible to edit.
    expect(title).toHaveFocus();
  });
});

describe("the Canvas is a separate surface from the Board", () => {
  it("shows only the notes placed on it", async () => {
    useNoteStore.getState().reset([placed("on", 0, 0, 1), boardOnly("off")]);
    const canvas = await openCanvas();

    const rendered = within(canvas).getAllByTestId("canvas-note");
    expect(rendered).toHaveLength(1);
    expect(rendered[0]?.dataset.noteId).toBe("on");
  });

  it("explains itself when nothing has been placed", async () => {
    useNoteStore.getState().reset([boardOnly("off")]);
    const canvas = await openCanvas();

    expect(within(canvas).getByTestId("canvas-empty-state")).toBeInTheDocument();
    expect(within(canvas).queryAllByTestId("canvas-note")).toHaveLength(0);
  });

  it("hides the empty state once a note is placed", async () => {
    useNoteStore.getState().reset([boardOnly("off")]);
    await openCanvas();

    act(() => {
      useNoteStore.getState().setOnCanvas("off", true);
    });

    expect(screen.queryByTestId("canvas-empty-state")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("canvas-note")).toHaveLength(1);
  });

  it("adds a note to the canvas from its own control", async () => {
    useNoteStore.getState().reset([]);
    await openCanvas();

    await userEvent.click(
      screen.getByRole("button", { name: "Add note to canvas" }),
    );

    const notes = useNoteStore.getState().notes;
    expect(notes).toHaveLength(1);
    expect(notes[0]?.onCanvas).toBe(true);
    // It still belongs to a column, so the Board shows it too.
    expect(notes[0]?.laneId).toBeTruthy();
  });

  it("takes a note off the canvas without deleting it", async () => {
    useNoteStore.getState().reset([placed("a", 0, 0, 1)]);
    const canvas = await openCanvas();

    await userEvent.click(
      within(canvas).getByRole("button", { name: "More actions for Note a" }),
    );
    await userEvent.click(
      within(screen.getByRole("menu")).getByRole("menuitem", {
        name: /Remove from Canvas/,
      }),
    );

    expect(useNoteStore.getState().notes).toHaveLength(1);
    expect(useNoteStore.getState().notes[0]?.onCanvas).toBe(false);
  });
});

describe("tags render on canvas notes", () => {
  it("resolves tag ids the same way the lane board does", async () => {
    localStorage.setItem(LOCAL_VOCABULARY_KEY, JSON.stringify({ tags: MOCK_TAGS, categories: [] }));
    const tag = MOCK_TAGS[0];
    if (!tag) throw new Error("expected a mock tag");

    useNoteStore.getState().reset([{ ...placed("a", 0, 0, 1), tagIds: [tag.id] }]);
    const canvas = await openCanvas();

    expect(within(canvas).getByText(new RegExp(tag.name))).toBeInTheDocument();
  });
});
