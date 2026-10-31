import type { Lane } from "@/types/lane";
import type { Note } from "@/types/note";

/**
 * Works out what changed between two snapshots.
 *
 * The stores hold the truth and update immutably, so "changed" is a reference
 * comparison — no deep equality, no dirty flags threaded through every action.
 * Keeping this a pure function (rather than middleware on the store) means the
 * sync rules are testable without a React tree or a network.
 */

export interface Diff<T> {
  /** Records to insert or update. */
  upserts: T[];
  /** Ids that have disappeared. */
  deletions: string[];
}

export interface Identified {
  id: string;
}

/**
 * Compares a previous snapshot against the current records.
 *
 * @param previous Last state known to be persisted, keyed by id.
 * @param current  What the store holds now.
 */
export function diffById<T extends Identified>(
  previous: ReadonlyMap<string, T>,
  current: readonly T[],
): Diff<T> {
  const upserts: T[] = [];
  const seen = new Set<string>();

  for (const record of current) {
    seen.add(record.id);

    // Reference inequality is the whole test: an unchanged record is the same
    // object it was, because every store action builds a new one only when
    // something actually changes.
    if (previous.get(record.id) !== record) upserts.push(record);
  }

  const deletions: string[] = [];
  for (const id of previous.keys()) {
    if (!seen.has(id)) deletions.push(id);
  }

  return { upserts, deletions };
}

/** Builds the snapshot to compare against next time. */
export function snapshotById<T extends Identified>(
  records: readonly T[],
): Map<string, T> {
  return new Map(records.map((record) => [record.id, record]));
}

export interface BoardDiff {
  notes: Diff<Note>;
  lanes: Diff<Lane>;
}

/** True when a diff would produce no writes at all. */
export function isEmptyDiff(diff: BoardDiff): boolean {
  return (
    diff.notes.upserts.length === 0 &&
    diff.notes.deletions.length === 0 &&
    diff.lanes.upserts.length === 0 &&
    diff.lanes.deletions.length === 0
  );
}

/** How many records a diff will write. Drives the "n pending" readout. */
export function countPending(diff: BoardDiff): number {
  return (
    diff.notes.upserts.length +
    diff.notes.deletions.length +
    diff.lanes.upserts.length +
    diff.lanes.deletions.length
  );
}

/**
 * Autosave debounce, in milliseconds.
 *
 * IMPLEMENTATION_PLAN.md §50 recommends 400–800ms. 600 sits in the middle:
 * long enough that a burst of typing is one write, short enough that a pause
 * saves before the user looks away.
 */
export const AUTOSAVE_DELAY_MS = 600;

/**
 * Re-applies a failed batch to the snapshot so it is retried.
 *
 * Without this, a write that failed would be marked clean on the next diff and
 * the user's edit would be lost silently — the exact failure
 * IMPLEMENTATION_PLAN.md §51 forbids.
 */
export function rollbackSnapshot<T extends Identified>(
  snapshot: Map<string, T>,
  diff: Diff<T>,
): void {
  for (const record of diff.upserts) snapshot.delete(record.id);
  // A deletion that failed must stay in the snapshot, or it will never be
  // retried. Its record is gone from the store, so a placeholder id is enough
  // to make the next diff notice it again.
  for (const id of diff.deletions) {
    if (!snapshot.has(id)) snapshot.set(id, { id } as T);
  }
}
