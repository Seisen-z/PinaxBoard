"use client";

import {
  AlignVerticalJustifyStart,
  Calendar,
  Columns3,
  LayoutDashboard,
  LayoutGrid,
  LayoutPanelLeft,
  List,
  Rows3,
  GanttChart,
  type LucideIcon,
} from "lucide-react";

import { ClayButton } from "@/components/ui/clay-button";
import {
  BOARD_VIEW_ID,
  VIEW_SWITCHER_LAYOUTS,
  getLayout,
  type BoardViewId,
} from "@/config/layouts";
import type { LayoutMode } from "@/types/common";

/** Icon names in `src/config/layouts.ts` resolved to components. */
const LAYOUT_ICONS: Record<LayoutMode, LucideIcon> = {
  canvas: LayoutDashboard,
  grid: LayoutGrid,
  list: List,
  // Legacy stored ids still parse, but Kanban has no separate catalogue/control.
  kanban: Columns3,
  calendar: Calendar,
  timeline: GanttChart,
  row: Rows3,
  column: AlignVerticalJustifyStart,
  masonry: LayoutPanelLeft,
};

export interface ViewSwitcherProps {
  activeView: BoardViewId;
  onSelectView: (view: BoardViewId) => void;
}

/**
 * The view switcher, at the left of the board toolbar.
 *
 * It used to be a floating cluster in the bottom-left corner (FRONTEND_SPEC.md
 * §43). Now that it lives inside a toolbar it carries no surface of its own —
 * a panel inside a panel reads as a stray control, and the toolbar already
 * provides the separation from the board.
 *
 * Layouts that have not shipped yet render disabled rather than hidden, so the
 * control's shape does not shift as later milestones land.
 */
export function ViewSwitcher({ activeView, onSelectView }: ViewSwitcherProps) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Board view"
    >
      <ClayButton
        variant="ghost"
        size="sm"
        selected={activeView === BOARD_VIEW_ID}
        onClick={() => onSelectView(BOARD_VIEW_ID)}
      >
        <Columns3 size={15} aria-hidden="true" />
        Board
      </ClayButton>

      {VIEW_SWITCHER_LAYOUTS.map((layoutId) => {
        const layout = getLayout(layoutId);
        if (!layout) return null;

        const Icon = LAYOUT_ICONS[layoutId];

        return (
          <ClayButton
            key={layoutId}
            variant="ghost"
            size="sm"
            selected={activeView === layoutId}
            disabled={!layout.available}
            title={
              layout.available
                ? layout.label
                : `${layout.label} — available in ${layout.milestone}`
            }
            onClick={() => onSelectView(layoutId)}
          >
            <Icon size={15} aria-hidden="true" />
            {/*
              One text node, not a visible/screen-reader pair: two copies of
              the label would both land in the accessible name on any viewport
              where the CSS has not applied.
            */}
            <span className="sr-only sm:not-sr-only">{layout.label}</span>
          </ClayButton>
        );
      })}
    </div>
  );
}
