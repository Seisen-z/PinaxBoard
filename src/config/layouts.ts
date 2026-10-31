import type { LayoutMode } from "@/types/common";

/**
 * Board layout catalogue (PRODUCT_SPEC.md → "Layout Modes").
 *
 * Every layout is an alternate representation of the *same* note records —
 * switching layouts never copies or mutates note data
 * (IMPLEMENTATION_PLAN.md §19 "Rule").
 *
 * `available` marks which layouts are implemented today. The bottom-left view
 * switcher renders unavailable layouts as disabled rather than hiding them, so
 * the control's shape stays stable as milestones land.
 */

export interface LayoutDefinition {
  id: LayoutMode;
  label: string;
  /** Lucide icon name, resolved by the consuming component. */
  icon: string;
  available: boolean;
  /** Milestone that turns this layout on, for reference in review. */
  milestone: string;
}

export const LAYOUT_DEFINITIONS: readonly LayoutDefinition[] = [
  { id: "canvas", label: "Canvas", icon: "LayoutDashboard", available: true, milestone: "Milestone 4" },
  { id: "grid", label: "Grid", icon: "LayoutGrid", available: true, milestone: "Milestone 13" },
  { id: "list", label: "List", icon: "List", available: true, milestone: "Milestone 14" },
  { id: "calendar", label: "Calendar", icon: "Calendar", available: true, milestone: "Milestone 16" },
  { id: "timeline", label: "Timeline", icon: "GanttChart", available: true, milestone: "Milestone 17" },
  { id: "row", label: "Row", icon: "Rows3", available: false, milestone: "Milestone 13" },
  { id: "column", label: "Column", icon: "AlignVerticalJustifyStart", available: false, milestone: "Milestone 13" },
  { id: "masonry", label: "Masonry", icon: "LayoutPanelLeft", available: false, milestone: "Milestone 13" },
] as const;

/**
 * The default Board is the five open status lanes. It is deliberately *not* a
 * `LayoutMode`: PRODUCT_SPEC.md's layout list describes alternate views of a
 * board, while the lane Board is the board's home surface.
 */
export const BOARD_VIEW_ID = "board" as const;
export type BoardViewId = typeof BOARD_VIEW_ID | LayoutMode;

export const DEFAULT_BOARD_VIEW: BoardViewId = BOARD_VIEW_ID;

/** Layouts shown in the top toolbar, in display order. */
export const VIEW_SWITCHER_LAYOUTS: readonly LayoutMode[] = [
  "grid",
  "list",
] as const;

const LAYOUT_BY_ID = new Map<LayoutMode, LayoutDefinition>(
  LAYOUT_DEFINITIONS.map((definition) => [definition.id, definition]),
);

/** Returns the layout definition, or `undefined` for an unknown id. */
export function getLayout(id: LayoutMode): LayoutDefinition | undefined {
  return LAYOUT_BY_ID.get(id);
}

/** Zoom stops offered by the bottom-right controls (PRODUCT_SPEC.md → Zoom). */
export const ZOOM_STOPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
export const DEFAULT_ZOOM = 1;
