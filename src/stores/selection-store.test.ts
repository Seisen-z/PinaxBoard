import { beforeEach, describe, expect, it } from "vitest";

import { useSelectionStore } from "@/stores/selection-store";

const store = () => useSelectionStore.getState();
const selected = () => [...store().selectedIds];

beforeEach(() => {
  useSelectionStore.getState().clear();
});

describe("selection modes (PRODUCT_SPEC.md → Multi-Select)", () => {
  it("replaces the selection on a plain click", () => {
    store().select("a");
    store().select("b");

    expect(selected()).toEqual(["b"]);
  });

  it("adds and removes one note on Ctrl/Cmd click", () => {
    store().select("a");
    store().select("b", "toggle");
    expect(selected()).toEqual(["a", "b"]);

    store().select("a", "toggle");
    expect(selected()).toEqual(["b"]);
  });

  it("extends without removing on Shift click", () => {
    store().select("a");
    store().select("b", "add");
    store().select("b", "add");

    expect(selected()).toEqual(["a", "b"]);
  });
});

describe("selectMany", () => {
  it("replaces the selection by default", () => {
    store().select("a");
    store().selectMany(["b", "c"]);

    expect(selected()).toEqual(["b", "c"]);
  });

  it("merges into the selection in add mode", () => {
    store().select("a");
    store().selectMany(["b", "c"], "add");

    expect(selected()).toEqual(["a", "b", "c"]);
  });
});

describe("deselect and clear", () => {
  it("removes one note", () => {
    store().selectMany(["a", "b"]);
    store().deselect("a");

    expect(selected()).toEqual(["b"]);
  });

  it("keeps the same state object when deselecting an unselected note", () => {
    store().select("a");
    const before = store().selectedIds;

    store().deselect("b");
    expect(store().selectedIds).toBe(before);
  });

  it("keeps the same Set when clearing an already empty selection", () => {
    const before = store().selectedIds;
    store().clear();

    // A fresh empty Set would re-render every subscribed card for nothing.
    expect(store().selectedIds).toBe(before);
  });

  it("empties a populated selection", () => {
    store().selectMany(["a", "b"]);
    store().clear();

    expect(selected()).toEqual([]);
  });
});
