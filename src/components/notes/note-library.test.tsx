import { render, screen, within, act } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppShell } from "@/components/shell/app-shell";
import { NoteLibrary } from "./note-library";
import { useNoteStore } from "@/stores/note-store";
import { useBoardAccess } from "@/features/collaboration/access";
import { MOCK_NOTES } from "@/features/board/mock-board";
afterEach(() => useBoardAccess.setState({ boardId: null, actorId: null, role: "owner" }));

it("gives Inbox and My Notes their own surfaces, with no copied Board toolbar", async () => {
  render(<AppShell />); const nav = within(screen.getByRole("navigation", { name: "Primary" }));
  await userEvent.click(nav.getByRole("button", { name: "Inbox" }));
  expect(screen.getByRole("main", { name: "Inbox" })).toBeInTheDocument();
  expect(screen.getByText("A clear inbox")).toBeInTheDocument(); expect(screen.queryByRole("group", { name: "Board view" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Quick capture" }));
  const id = useNoteStore.getState().expandedNoteId!;
  expect(useNoteStore.getState().notes.find(note => note.id === id)).toMatchObject({ inbox: true, title: "", content: null });
  await userEvent.keyboard("{Escape}");
  act(() => useNoteStore.getState().setTitle(id, "Captured thought"));
  expect(screen.getByRole("button", { name: /Captured thought/ })).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Organize Captured thought into column" }), MOCK_NOTES[0]!.laneId);
  expect(screen.getByText("A clear inbox")).toBeInTheDocument();
  await userEvent.click(nav.getByRole("button", { name: "My Notes" }));
  expect(screen.getByRole("main", { name: "My Notes" })).toBeInTheDocument(); expect(screen.getByRole("button", { name: /Captured thought/ })).toBeInTheDocument();
  await userEvent.click(nav.getByRole("button", { name: "Canvas" }));
  expect(screen.getByRole("main", { name: "Canvas" })).toBeInTheDocument(); expect(screen.queryByRole("group", { name: "Board view" })).not.toBeInTheDocument();
  await userEvent.click(nav.getByRole("button", { name: "Board" }));
  expect(within(screen.getByRole("group", { name: "Board view" })).getAllByRole("button").map(button => button.textContent)).toEqual(["Board", "Grid", "List"]);
});

it("searches library records without changing the Board filters and disables capture for viewers", async () => {
  const note = MOCK_NOTES[0]!; useNoteStore.getState().reset([{ ...note, title: "Alpha", createdBy: "me" }, { ...note, id: "b", title: "Beta", createdBy: "other" }]);
  useBoardAccess.setState({ boardId: note.boardId, actorId: "me", role: "viewer" });
  render(<NoteLibrary mode="mine" actorId="me" onCapture={vi.fn()} />);
  expect(screen.getByRole("button", { name: "New note" })).toBeDisabled(); expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  await userEvent.type(screen.getByRole("textbox", { name: "Search my notes" }), "no match"); expect(screen.getByText("No matching notes")).toBeInTheDocument();
});
