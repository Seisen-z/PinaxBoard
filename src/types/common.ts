/**
 * Primitives shared across every Tackly entity.
 *
 * These mirror PRODUCT_SPEC.md → "Core Data Hierarchy" and the Supabase
 * schema sketch. Database column names are snake_case; the mappers in
 * `src/lib/mappers` (added in the persistence milestone) are the only place
 * allowed to translate between the two shapes.
 */

/** An ISO-8601 timestamp, e.g. `2026-09-28T13:45:00.000Z`. */
export type ISODateString = string;

/** A UUID as produced by Supabase / `crypto.randomUUID()`. */
export type UUID = string;

/** PRODUCT_SPEC.md → "Priority System". */
export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

/** PRODUCT_SPEC.md → "Layout Modes". */
export const LAYOUT_MODES = [
  "canvas",
  "grid",
  "row",
  "column",
  "list",
  "masonry",
  "kanban",
  "calendar",
  "timeline",
] as const;
export type LayoutMode = (typeof LAYOUT_MODES)[number];

/**
 * Board columns are user-owned records, not a fixed enum — see
 * `src/types/lane.ts`. A note stores the id of the lane it sits in.
 */

/** Autosave / sync indicator states (PRODUCT_SPEC.md → "Auto Save"). */
export const SYNC_STATUSES = [
  "saved",
  "saving",
  "syncing",
  "offline",
  "error",
] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

/**
 * Narrowing helper for `readonly [...] as const` tuples.
 *
 * @example
 * if (isMemberOf(PRIORITIES, input)) { // input is Priority here }
 */
export function isMemberOf<T extends string>(
  values: readonly T[],
  candidate: unknown,
): candidate is T {
  return typeof candidate === "string" && (values as readonly string[]).includes(candidate);
}
