/**
 * Lane seed data and the lane colour palette.
 *
 * These are **defaults, not a schema**. A board starts with five familiar
 * columns so it is not empty on first run; from then on they are ordinary
 * records the user renames, recolors, reorders and deletes
 * (see `src/types/lane.ts`).
 */

export interface LaneSeed {
  id: string;
  name: string;
  /** CSS custom property holding the accent colour. */
  colorVar: string;
}

export const DEFAULT_LANE_SEEDS: readonly LaneSeed[] = [
  { id: "lane-todo", name: "To Do", colorVar: "--status-todo" },
  { id: "lane-in-progress", name: "In Progress", colorVar: "--status-in-progress" },
  { id: "lane-review", name: "Review", colorVar: "--status-review" },
  { id: "lane-done", name: "Done", colorVar: "--status-done" },
  { id: "lane-ideas", name: "Ideas", colorVar: "--status-ideas" },
] as const;

/** Colours offered when creating or recolouring a lane. */
export interface LaneColorOption {
  label: string;
  value: string;
}

export const LANE_COLOR_OPTIONS: readonly LaneColorOption[] = [
  { label: "Slate", value: "var(--status-todo)" },
  { label: "Blue", value: "var(--status-in-progress)" },
  { label: "Amber", value: "var(--status-review)" },
  { label: "Green", value: "var(--status-done)" },
  { label: "Violet", value: "var(--status-ideas)" },
  { label: "Coral", value: "var(--priority-high)" },
  { label: "Red", value: "var(--priority-urgent)" },
] as const;

/** Written out rather than indexed, so `noUncheckedIndexedAccess` stays happy. */
export const DEFAULT_LANE_COLOR = "var(--status-todo)";

/** Name given to a lane the user has not named yet. */
export const UNTITLED_LANE_NAME = "New Column";

/** Upper bound on lanes per board — past this the Board stops being scannable. */
export const MAX_LANES = 12;
