import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspacePicker } from "@/components/shell/workspace-picker";
import { render } from "@/test/render";
import type { Board } from "@/types/board";
import type { Workspace } from "@/types/workspace";

function workspace(id: string, name: string): Workspace {
  return {
    id,
    ownerId: "owner",
    name,
    icon: null,
    color: null,
    position: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    archivedAt: null,
  };
}

function board(id: string, name: string): Board {
  return {
    id,
    workspaceId: "ws-1",
    ownerId: "owner",
    name,
    icon: null,
    color: null,
    layoutMode: "canvas",
    background: {
      type: "gradient",
      source: null,
      blur: 0,
      brightness: 1,
      saturation: 1,
      contrast: 1,
      opacity: 1,
      overlay: 0,
      vignette: 0,
      grain: 0,
      tint: null,
    },
    position: 0,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    archivedAt: null,
  };
}

const WORKSPACES = [workspace("ws-1", "Personal"), workspace("ws-2", "Work")];
const BOARDS = [board("b-1", "Assignments"), board("b-2", "Exams")];

function setup(overrides: Partial<React.ComponentProps<typeof WorkspacePicker>> = {}) {
  const props = {
    workspaces: WORKSPACES,
    boards: BOARDS,
    activeWorkspace: WORKSPACES[0] ?? null,
    activeBoard: BOARDS[0] ?? null,
    loading: false,
    error: null,
    cloudEnabled: true,
    onSelectWorkspace: vi.fn(),
    onSelectBoard: vi.fn(),
    onCreateWorkspace: vi.fn(),
    onCreateBoard: vi.fn(),
    onRenameWorkspace: vi.fn(),
    onRenameBoard: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };

  render(<WorkspacePicker {...props} />);
  return props;
}

async function openPicker() {
  await userEvent.click(screen.getByRole("button"));
  return screen.getByRole("menu");
}

describe("trigger", () => {
  it("names the open workspace and board", () => {
    setup();

    expect(
      screen.getByRole("button", {
        name: "Workspace Personal, board Assignments. Switch workspace or board",
      }),
    ).toBeInTheDocument();
  });

  it("falls back to the local label when signed out", () => {
    setup({ cloudEnabled: false, activeWorkspace: null, activeBoard: null });

    expect(
      screen.getByRole("button", { name: /Workspace: Local workspace/ }),
    ).toBeInTheDocument();
  });
});

describe("signed in", () => {
  it("lists the workspaces and marks the current one", async () => {
    setup();
    const menu = await openPicker();

    const current = within(menu).getByRole("menuitem", { name: /^Personal/ });
    expect(current).toHaveAttribute("aria-current", "true");
    expect(within(menu).getByRole("menuitem", { name: "Work" })).toBeInTheDocument();
  });

  it("selects a workspace", async () => {
    const props = setup();
    const menu = await openPicker();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Work" }));
    expect(props.onSelectWorkspace).toHaveBeenCalledWith("ws-2");
  });

  it("lists boards in a submenu and selects one", async () => {
    const props = setup();
    const menu = await openPicker();

    expect(menu).toHaveClass("z-[var(--z-menu)]");
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Boards/ }));
    const exams = await screen.findByRole("menuitem", { name: "Exams" });
    expect(exams.closest('[data-slot="dropdown-menu-sub-content"]')).toHaveClass("z-[var(--z-menu)]");
    await userEvent.click(exams);

    expect(props.onSelectBoard).toHaveBeenCalledWith("b-2");
  });

  it("offers creation for both", async () => {
    const props = setup();
    const menu = await openPicker();

    await userEvent.click(
      within(menu).getByRole("menuitem", { name: "New workspace" }),
    );
    expect(props.onCreateWorkspace).toHaveBeenCalled();
  });

  it("says so plainly when there are no workspaces yet", async () => {
    setup({ workspaces: [], activeWorkspace: null });
    const menu = await openPicker();

    // An empty list with no explanation reads as broken.
    expect(
      within(menu).getByRole("menuitem", { name: "No workspaces yet" }),
    ).toBeInTheDocument();
  });
});

describe("signed out", () => {
  it("explains why there is nothing to switch between", async () => {
    setup({ cloudEnabled: false, activeWorkspace: null, activeBoard: null });
    const menu = await openPicker();

    expect(
      within(menu).getByRole("menuitem", {
        name: "Sign in to sync and add workspaces",
      }),
    ).toBeInTheDocument();
  });

  it("does not offer workspace creation", async () => {
    setup({ cloudEnabled: false, activeWorkspace: null, activeBoard: null });
    const menu = await openPicker();

    expect(
      within(menu).queryByRole("menuitem", { name: "New workspace" }),
    ).not.toBeInTheDocument();
  });

  it("offers a working sign-in link instead of a disabled explanation", async () => {
    setup({ cloudEnabled: false, activeWorkspace: null, activeBoard: null });
    const menu = await openPicker();
    const signIn = within(menu).getByRole("menuitem", {
      name: "Sign in to sync and add workspaces",
    });
    expect(signIn.tagName).toBe("A");
    expect(signIn).toHaveAttribute("href", "/login");
    expect(signIn).not.toHaveAttribute("data-disabled");
    expect(screen.getByRole("button").closest('[aria-hidden="true"]')).toBeNull();
  });
});

describe("failure", () => {
  it("offers a retry rather than an empty list", async () => {
    const props = setup({ error: new Error("network") });
    const menu = await openPicker();

    await userEvent.click(within(menu).getByRole("menuitem", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalled();
  });
});
