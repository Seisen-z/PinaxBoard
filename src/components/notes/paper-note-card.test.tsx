import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PaperNoteCard } from "@/components/notes/paper-note-card";
import { createBlankNote } from "@/features/notes/create-note";
import type { Note, Subtask, Tag } from "@/types/note";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    ...createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane-todo" }),
    ...overrides,
  };
}

function makeSubtasks(titles: string[], completedCount = 0): Subtask[] {
  return titles.map((title, index) => ({
    id: `sub-${index}`,
    noteId: "note",
    title,
    completed: index < completedCount,
    position: index,
  }));
}

describe("PaperNoteCard", () => {
  it("renders a read-only note as a heading, not an input", () => {
    render(<PaperNoteCard note={makeNote({ title: "Project Planning" })} />);

    expect(
      screen.getByRole("heading", { name: "Project Planning" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("falls back to 'Untitled' for a note with no title", () => {
    render(<PaperNoteCard note={makeNote({ title: "" })} />);
    expect(screen.getByRole("heading", { name: "Untitled" })).toBeInTheDocument();
  });

  it("becomes editable when change handlers are supplied", async () => {
    const onTitleChange = vi.fn();
    const note = makeNote({ id: "note-1", title: "" });

    render(<PaperNoteCard note={note} onTitleChange={onTitleChange} />);

    await userEvent.type(
      screen.getByRole("textbox", { name: "Note title" }),
      "H",
    );

    // The handler receives the note id, so callers can pass one stable callback.
    expect(onTitleChange).toHaveBeenCalledWith("note-1", "H");
  });

  it("marks completion on the card and strikes through the title", () => {
    render(
      <PaperNoteCard note={makeNote({ title: "Shipped", completed: true })} />,
    );

    expect(screen.getByTestId("paper-note-card")).toHaveAttribute(
      "data-completed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Shipped" })).toHaveClass(
      "line-through",
    );
  });

  it("shows checklist progress derived from the subtasks", () => {
    render(
      <PaperNoteCard
        note={makeNote({
          title: "Checklist",
          subtasks: makeSubtasks(["A", "B", "C", "D"], 1),
        })}
      />,
    );

    const progress = screen.getByRole("progressbar", {
      name: "1 of 4 tasks completed",
    });
    expect(progress).toHaveAttribute("aria-valuenow", "1");
    expect(progress).toHaveAttribute("aria-valuemax", "4");
  });

  it("omits the progress bar when the note has no checklist", () => {
    render(<PaperNoteCard note={makeNote({ title: "Plain" })} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("truncates a long checklist with a remainder line", () => {
    render(
      <PaperNoteCard
        note={makeNote({
          title: "Long",
          subtasks: makeSubtasks(["A", "B", "C", "D", "E", "F"]),
        })}
      />,
    );

    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("renders checkboxes disabled until a toggle handler is supplied", () => {
    const note = makeNote({ title: "Tasks", subtasks: makeSubtasks(["A"]) });

    const { rerender } = render(<PaperNoteCard note={note} />);
    expect(screen.getByRole("checkbox")).toBeDisabled();

    rerender(<PaperNoteCard note={note} onToggleSubtask={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeEnabled();
  });

  it("reports subtask toggles with the note id", async () => {
    const onToggleSubtask = vi.fn();
    render(
      <PaperNoteCard
        note={makeNote({
          id: "note-9",
          title: "Tasks",
          subtasks: makeSubtasks(["Write tests"]),
        })}
        onToggleSubtask={onToggleSubtask}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox"));
    expect(onToggleSubtask).toHaveBeenCalledWith("note-9", "sub-0", true);
  });

  it("renders tags as pills and truncates past the visible limit", () => {
    const tags: Tag[] = ["work", "planning", "design", "urgent"].map(
      (name, index) => ({
        id: `tag-${index}`,
        workspaceId: "ws",
        name,
        color: null,
      }),
    );

    render(
      <PaperNoteCard
        note={makeNote({ title: "Tagged", tagIds: tags.map((t) => t.id) })}
        tags={tags}
      />,
    );

    expect(screen.getByText(/work/)).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("shows a priority indicator only above 'none'", () => {
    const { rerender } = render(
      <PaperNoteCard note={makeNote({ title: "Plain", priority: "none" })} />,
    );
    expect(screen.queryByRole("img", { name: /Priority/ })).not.toBeInTheDocument();

    rerender(
      <PaperNoteCard note={makeNote({ title: "Plain", priority: "urgent" })} />,
    );
    expect(
      screen.getByRole("img", { name: "Priority: Urgent" }),
    ).toBeInTheDocument();
  });

  it("announces a pinned note", () => {
    render(<PaperNoteCard note={makeNote({ title: "Pinned", pinned: true })} />);
    expect(screen.getByRole("img", { name: "Pinned" })).toBeInTheDocument();
  });

  it("applies the paper style's forced color over the note's own color", () => {
    // Dark Card pins slate paper; a stale yellow must not win.
    render(
      <PaperNoteCard
        note={makeNote({
          title: "Dark",
          appearance: { color: "yellow", style: "dark", coverUrl: null },
        })}
      />,
    );

    expect(screen.getByTestId("paper-note-card")).toHaveStyle({
      backgroundColor: "var(--paper-slate)",
    });
  });
});
