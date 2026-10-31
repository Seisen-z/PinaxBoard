import { describe, expect, it } from "vitest";

import {
  AUTOSAVE_DELAY_MS,
  countPending,
  diffById,
  isEmptyDiff,
  rollbackSnapshot,
  snapshotById,
} from "@/features/notes/sync-engine";

interface Record_ {
  id: string;
  value?: string;
}

const a: Record_ = { id: "a", value: "one" };
const b: Record_ = { id: "b", value: "two" };

describe("diffById", () => {
  it("reports nothing when nothing changed", () => {
    const snapshot = snapshotById([a, b]);
    const diff = diffById(snapshot, [a, b]);

    expect(diff.upserts).toEqual([]);
    expect(diff.deletions).toEqual([]);
  });

  it("reports a record whose reference changed", () => {
    const snapshot = snapshotById([a, b]);
    const edited = { ...a, value: "edited" };

    const diff = diffById(snapshot, [edited, b]);
    expect(diff.upserts).toEqual([edited]);
  });

  it("does not report an equal-but-identical record", () => {
    // The stores update immutably, so an untouched record is literally the
    // same object — that is what makes a reference check sufficient.
    const snapshot = snapshotById([a]);
    expect(diffById(snapshot, [a]).upserts).toEqual([]);
  });

  it("reports a record with an identical value but a new reference", () => {
    // Conservative on purpose: a redundant write is harmless, a missed one
    // loses the user's edit.
    const snapshot = snapshotById([a]);
    const clone = { ...a };

    expect(diffById(snapshot, [clone]).upserts).toEqual([clone]);
  });

  it("reports a new record as an upsert", () => {
    const diff = diffById(snapshotById([a]), [a, b]);
    expect(diff.upserts).toEqual([b]);
  });

  it("reports a missing record as a deletion", () => {
    const diff = diffById(snapshotById([a, b]), [a]);
    expect(diff.deletions).toEqual(["b"]);
  });

  it("handles an empty snapshot as all-new", () => {
    const diff = diffById(new Map<string, Record_>(), [a, b]);

    expect(diff.upserts).toEqual([a, b]);
    expect(diff.deletions).toEqual([]);
  });

  it("handles everything disappearing", () => {
    const diff = diffById(snapshotById([a, b]), []);
    expect(diff.deletions.sort()).toEqual(["a", "b"]);
  });
});

describe("isEmptyDiff and countPending", () => {
  const empty = {
    notes: { upserts: [], deletions: [] },
    lanes: { upserts: [], deletions: [] },
  };

  it("recognises an empty diff", () => {
    expect(isEmptyDiff(empty)).toBe(true);
    expect(countPending(empty)).toBe(0);
  });

  it("counts across both record types and both directions", () => {
    const diff = {
      notes: { upserts: [a, b], deletions: ["x"] },
      lanes: { upserts: [a], deletions: ["y", "z"] },
    } as never;

    expect(isEmptyDiff(diff)).toBe(false);
    expect(countPending(diff)).toBe(6);
  });
});

describe("rollbackSnapshot", () => {
  it("un-marks a failed upsert so it is retried", () => {
    const snapshot = snapshotById([a, b]);
    rollbackSnapshot(snapshot, { upserts: [a], deletions: [] });

    // `a` is no longer believed to be on the server, so the next diff sends it.
    expect(diffById(snapshot, [a, b]).upserts).toEqual([a]);
  });

  it("re-marks a failed deletion so it is retried", () => {
    const snapshot = snapshotById([a]);
    // The record is already gone from the store, so a placeholder keeps the
    // deletion visible to the next diff.
    snapshot.delete("a");

    rollbackSnapshot(snapshot, { upserts: [], deletions: ["a"] });
    expect(diffById(snapshot, []).deletions).toEqual(["a"]);
  });

  it("does not clobber a record that reappeared", () => {
    const snapshot = snapshotById([a]);
    rollbackSnapshot(snapshot, { upserts: [], deletions: ["a"] });

    expect(snapshot.get("a")).toBe(a);
  });
});

describe("autosave delay", () => {
  it("sits inside the 400–800ms band from IMPLEMENTATION_PLAN §50", () => {
    expect(AUTOSAVE_DELAY_MS).toBeGreaterThanOrEqual(400);
    expect(AUTOSAVE_DELAY_MS).toBeLessThanOrEqual(800);
  });
});
