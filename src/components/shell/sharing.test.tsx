import { render, screen, waitFor } from "@/test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ShareBoardDialog } from "./share-board-dialog";
import { InvitationNotice } from "./invitation-notice";
const repo = vi.hoisted(() => ({ createInvitation: vi.fn(), fetchPeople: vi.fn(), fetchInvitations: vi.fn(), manageMember: vi.fn(), revokeInvitation: vi.fn(), acceptInvitation: vi.fn() }));
vi.mock("@/features/collaboration/repository", () => repo);
const token = "a".repeat(64);
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear(); history.replaceState(null, "", "/");
  repo.fetchPeople.mockResolvedValue([{ id: "owner", name: "Owner", role: "owner" }, { id: "member", name: "Ada", role: "viewer" }]);
  repo.fetchInvitations.mockResolvedValue([]);
  repo.createInvitation.mockResolvedValue({ id: "invite", token, role: "viewer", expiresAt: "2026-11-06" });
  repo.manageMember.mockResolvedValue(undefined); repo.acceptInvitation.mockResolvedValue("shared-board");
});
it("creates a bounded invitation link with an explicit role and no automatic acceptance", async () => {
  render(<ShareBoardDialog open onOpenChange={vi.fn()} boardId="board" boardName="Studio" role="owner" signedIn />);
  await screen.findByRole("combobox", { name: "Access for Ada" });
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Permission" }), "editor");
  await userEvent.click(screen.getByRole("button", { name: "Create invitation link" }));
  await waitFor(() => expect(repo.createInvitation).toHaveBeenCalledWith("board", "editor"));
  expect(await screen.findByRole("textbox", { name: "Invitation link" })).toHaveValue(`${location.origin}/#invite=${token}`);
  expect(repo.acceptInvitation).not.toHaveBeenCalled();
});
it("exposes owner-managed role changes while viewers only see who has access", async () => {
  const { unmount } = render(<ShareBoardDialog open onOpenChange={vi.fn()} boardId="board" boardName="Studio" role="owner" signedIn />);
  await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Access for Ada" }), "editor");
  await waitFor(() => expect(repo.manageMember).toHaveBeenCalledWith("board", "member", "editor")); unmount();
  render(<ShareBoardDialog open onOpenChange={vi.fn()} boardId="board" boardName="Studio" role="viewer" signedIn />);
  expect(await screen.findByText("Ada")).toBeInTheDocument(); expect(screen.queryByRole("combobox")).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Create invitation link" })).not.toBeInTheDocument();
});
it("surfaces creation failures rather than publishing a fake link", async () => {
  repo.createInvitation.mockRejectedValue(new Error("Network offline; retry sharing"));
  render(<ShareBoardDialog open onOpenChange={vi.fn()} boardId="board" boardName="Studio" role="owner" signedIn />);
  await userEvent.click(screen.getByRole("button", { name: "Create invitation link" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Network offline"); expect(screen.queryByRole("textbox", { name: "Invitation link" })).not.toBeInTheDocument();
});
it("retains a signed-out invitation across sign-in navigation in this tab", async () => {
  history.replaceState(null, "", `/#invite=${token}`);
  render(<InvitationNotice signedIn={false} onAccepted={vi.fn()} />);
  expect(await screen.findByRole("link", { name: "Sign in to accept" })).toHaveAttribute("href", "/login");
  expect(sessionStorage.getItem("tackly:pending-invitation")).toBe(token); expect(location.hash).toBe(""); expect(repo.acceptInvitation).not.toHaveBeenCalled();
});
it("accepts only on a click, opens the granted board, and consumes the pending link", async () => {
  sessionStorage.setItem("tackly:pending-invitation", token); const open = vi.fn(async () => {});
  render(<InvitationNotice signedIn onAccepted={open} />);
  await userEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));
  await waitFor(() => expect(open).toHaveBeenCalledWith("shared-board"));
  expect(repo.acceptInvitation).toHaveBeenCalledWith(token); await waitFor(() => expect(sessionStorage.getItem("tackly:pending-invitation")).toBeNull());
});
it("retains a rejected link for retry or dismissal, without switching boards", async () => {
  repo.acceptInvitation.mockRejectedValue(new Error("Invitation expired or revoked")); sessionStorage.setItem("tackly:pending-invitation", token); const open = vi.fn();
  render(<InvitationNotice signedIn onAccepted={open} />); await userEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("expired or revoked"); expect(open).not.toHaveBeenCalled(); expect(sessionStorage.getItem("tackly:pending-invitation")).toBe(token);
  await userEvent.click(screen.getByRole("button", { name: "Dismiss invitation" })); expect(sessionStorage.getItem("tackly:pending-invitation")).toBeNull();
});
