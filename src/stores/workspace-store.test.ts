import { beforeEach, describe, expect, it } from "vitest";

import { useWorkspaceStore } from "@/stores/workspace-store";

const store = () => useWorkspaceStore.getState();

beforeEach(() => {
  useWorkspaceStore.getState().reset();
});

describe("active selection", () => {
  it("starts with nothing selected", () => {
    expect(store().activeWorkspaceId).toBeNull();
    expect(store().activeBoardId).toBeNull();
  });

  it("selects a workspace and a board", () => {
    store().setActiveWorkspace("ws-1");
    store().setActiveBoard("b-1");

    expect(store().activeWorkspaceId).toBe("ws-1");
    expect(store().activeBoardId).toBe("b-1");
  });

  it("clears the board when the workspace changes", () => {
    store().setActiveWorkspace("ws-1");
    store().setActiveBoard("b-1");

    store().setActiveWorkspace("ws-2");

    // A board id from the old workspace selects nothing, which would leave a
    // blank surface.
    expect(store().activeBoardId).toBeNull();
  });

  it("clears the board even when re-selecting the same workspace", () => {
    store().setActiveWorkspace("ws-1");
    store().setActiveBoard("b-1");
    store().setActiveWorkspace("ws-1");

    // Simpler and safer than a same-id special case; the reconciliation in
    // useActiveWorkspace picks the first board straight back.
    expect(store().activeBoardId).toBeNull();
  });

  it("resets both", () => {
    store().setActiveWorkspace("ws-1");
    store().setActiveBoard("b-1");
    store().reset();

    expect(store().activeWorkspaceId).toBeNull();
    expect(store().activeBoardId).toBeNull();
  });
});
