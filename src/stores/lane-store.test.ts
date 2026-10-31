import { beforeEach, describe, expect, it } from "vitest";

import { MAX_LANES, UNTITLED_LANE_NAME } from "@/config/lanes";
import { MOCK_BOARD_ID } from "@/features/board/board-identity";
import { createDefaultLanes, firstLaneId, selectOrderedLanes, useLaneStore } from "@/stores/lane-store";

const store = () => useLaneStore.getState();
const names = () => selectOrderedLanes(store()).map((lane) => lane.name);

beforeEach(() => {
  useLaneStore.getState().reset(createDefaultLanes(MOCK_BOARD_ID));
});

describe("seeded columns", () => {
  it("starts with the five familiar columns", () => {
    expect(names()).toEqual(["To Do", "In Progress", "Review", "Done", "Ideas"]);
  });

  it("numbers positions from zero", () => {
    expect(selectOrderedLanes(store()).map((lane) => lane.position)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });
});

describe("selectOrderedLanes", () => {
  it("returns a stable reference between reads", () => {
    // A selector that allocates on every call makes useSyncExternalStore
    // re-render forever, so the sorted order is a store invariant instead.
    expect(selectOrderedLanes(store())).toBe(selectOrderedLanes(store()));
  });
});

describe("adding a column", () => {
  it("appends it and opens it for renaming", () => {
    const id = store().addLane();

    expect(names().at(-1)).toBe(UNTITLED_LANE_NAME);
    // The user made a column in order to name it.
    expect(store().renamingLaneId).toBe(id);
  });

  it("accepts a name up front", () => {
    store().addLane("Waiting on Sam");
    expect(names().at(-1)).toBe("Waiting on Sam");
  });

  it("refuses past the column cap", () => {
    while (store().lanes.length < MAX_LANES) store().addLane();

    const before = store().lanes.length;
    expect(store().addLane()).toBe("");
    expect(store().lanes).toHaveLength(before);
  });
});

describe("renaming", () => {
  it("renames a column", () => {
    store().renameLane("lane-todo", "Today");
    expect(names()[0]).toBe("Today");
  });

  it("ignores an unknown id", () => {
    expect(() => store().renameLane("ghost", "Nope")).not.toThrow();
    expect(names()).toContain("To Do");
  });

  it("tracks which column is being renamed", () => {
    store().beginRename("lane-done");
    expect(store().renamingLaneId).toBe("lane-done");

    store().endRename();
    expect(store().renamingLaneId).toBeNull();
  });
});

describe("recolouring", () => {
  it("sets a column colour", () => {
    store().setLaneColor("lane-todo", "var(--priority-urgent)");

    expect(selectOrderedLanes(store())[0]?.color).toBe("var(--priority-urgent)");
  });
});

describe("reordering", () => {
  it("moves a column left", () => {
    store().moveLane("lane-review", "left");
    expect(names()).toEqual(["To Do", "Review", "In Progress", "Done", "Ideas"]);
  });

  it("moves a column right", () => {
    store().moveLane("lane-todo", "right");
    expect(names()).toEqual(["In Progress", "To Do", "Review", "Done", "Ideas"]);
  });

  it("keeps positions contiguous after a move", () => {
    store().moveLane("lane-ideas", "left");
    expect(selectOrderedLanes(store()).map((lane) => lane.position)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it("does nothing at the ends", () => {
    const before = store().lanes;

    store().moveLane("lane-todo", "left");
    store().moveLane("lane-ideas", "right");

    expect(store().lanes).toBe(before);
  });

  it("ignores an unknown id", () => {
    const before = store().lanes;
    store().moveLane("ghost", "left");

    expect(store().lanes).toBe(before);
  });
});

describe("deleting", () => {
  it("removes a column and re-numbers the rest", () => {
    store().removeLane("lane-review");

    expect(names()).toEqual(["To Do", "In Progress", "Done", "Ideas"]);
    expect(selectOrderedLanes(store()).map((lane) => lane.position)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  it("refuses to delete the last column", () => {
    for (const id of ["lane-in-progress", "lane-review", "lane-done", "lane-ideas"]) {
      store().removeLane(id);
    }
    expect(store().lanes).toHaveLength(1);

    // A board with no columns has nowhere to put a note.
    store().removeLane("lane-todo");
    expect(store().lanes).toHaveLength(1);
  });

  it("clears rename state when the renaming column goes away", () => {
    store().beginRename("lane-done");
    store().removeLane("lane-done");

    expect(store().renamingLaneId).toBeNull();
  });

  it("ignores an unknown id", () => {
    const before = store().lanes;
    store().removeLane("ghost");

    expect(store().lanes).toBe(before);
  });
});

describe("firstLaneId", () => {
  it("returns the leftmost column", () => {
    expect(firstLaneId(store())).toBe("lane-todo");
  });

  it("follows a reorder", () => {
    store().moveLane("lane-ideas", "left");
    store().moveLane("lane-ideas", "left");
    expect(firstLaneId(store())).toBe("lane-todo");

    store().removeLane("lane-todo");
    expect(firstLaneId(store())).toBe("lane-in-progress");
  });

  it("returns null when there are no columns at all", () => {
    store().reset([]);
    expect(firstLaneId(store())).toBeNull();
  });
});


describe("lane creation board context", () => {
  it("uses the explicit board context when an empty cloud board is hydrated", () => {
    useLaneStore.getState().reset([], "cloud-empty-board");
    const id = useLaneStore.getState().addLane("First column");
    expect(useLaneStore.getState().lanes.find((lane) => lane.id === id)?.boardId).toBe("cloud-empty-board");
  });

  it("resets to local context and does not persist the cloud creation context", () => {
    useLaneStore.getState().reset([], "cloud-board");
    const persisted: { state: Record<string, unknown> } = JSON.parse(localStorage.getItem("tackly:lanes")!);
    expect(persisted.state).not.toHaveProperty("boardId");
    useLaneStore.getState().reset([]);
    const id = useLaneStore.getState().addLane("Local column");
    expect(useLaneStore.getState().lanes.find((lane) => lane.id === id)?.boardId).toBe(MOCK_BOARD_ID);
  });
});
