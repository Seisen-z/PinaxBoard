"use client";

import { ArrowDownWideNarrow, Check, Eye, EyeOff, Rows2, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { ClayButton } from "@/components/ui/clay-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DROPDOWN_MENU_PRIMITIVES,
  type MenuPrimitives,
} from "@/components/ui/menu-primitives";
import {
  useSettingsStore,
  type BoardSort,
  type CardDensity,
} from "@/stores/settings-store";

const SORT_LABELS: Record<BoardSort, string> = {
  manual: "Manual",
  created: "Date created",
  updated: "Last edited",
  due: "Due date",
  priority: "Priority",
  title: "Title",
};

const DENSITY_LABELS: Record<CardDensity, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
};

/**
 * Board-view settings.
 *
 * Deliberately a different set from {@link CanvasControls}: a column list
 * answers "in what order, and how much of it do I want to see", while an
 * infinite canvas answers "where am I, and does it snap". Merging the two
 * would put grid settings on a surface with no grid.
 *
 * Reachable from the board toolbar and by right-clicking the board
 * background, via {@link BoardSettingsMenu}.
 */
export function BoardControls() {
  return (
    <div className="flex items-center" role="group" aria-label="Board settings">
      <BoardSettingsMenu>
        {/*
          Labelled "Display" to the eye, "Board settings" to a screen reader:
          the word on the button says what it changes, while the accessible
          name says which surface it changes it for — the canvas has its own.
        */}
        <ClayButton variant="ghost" size="sm" aria-label="Board settings">
          <SlidersHorizontal size={15} aria-hidden="true" />
          Display
        </ClayButton>
      </BoardSettingsMenu>
    </div>
  );
}

export interface BoardSettingsMenuProps {
  /** The element that opens the menu. */
  children: ReactNode;
}

/** The board settings menu, without its surrounding cluster. */
export function BoardSettingsMenu({ children }: BoardSettingsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-52">
        <BoardSettingsItems ui={DROPDOWN_MENU_PRIMITIVES} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface BoardSettingsItemsProps {
  /** The menu family to render with — dropdown or context. */
  ui: MenuPrimitives;
}

/**
 * The settings rows themselves.
 *
 * Rendered with whichever menu family the caller supplies, so the button menu
 * and the right-click menu are the same list rather than two copies.
 */
export function BoardSettingsItems({ ui }: BoardSettingsItemsProps) {
  const sort = useSettingsStore((state) => state.boardSort);
  const setSort = useSettingsStore((state) => state.setBoardSort);
  const showCompleted = useSettingsStore((state) => state.boardShowCompleted);
  const setShowCompleted = useSettingsStore(
    (state) => state.setBoardShowCompleted,
  );
  const density = useSettingsStore((state) => state.boardDensity);
  const setDensity = useSettingsStore((state) => state.setBoardDensity);

  return (
    <>
      <ui.Label>Board</ui.Label>

      <ui.Sub>
        <ui.SubTrigger>
          <ArrowDownWideNarrow aria-hidden="true" />
          Sort by
          <span className="ml-auto pl-3 text-xs text-muted-foreground">
            {SORT_LABELS[sort]}
          </span>
        </ui.SubTrigger>
        <ui.SubContent className="w-auto min-w-40">
          {(Object.keys(SORT_LABELS) as BoardSort[]).map((option) => (
            <ui.Item key={option} onSelect={() => setSort(option)}>
              <span className="flex-1">{SORT_LABELS[option]}</span>
              {option === sort ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span className="sr-only">(current)</span>
                </>
              ) : null}
            </ui.Item>
          ))}
        </ui.SubContent>
      </ui.Sub>

      <ui.Sub>
        <ui.SubTrigger>
          <Rows2 aria-hidden="true" />
          Card size
          <span className="ml-auto pl-3 text-xs text-muted-foreground">
            {DENSITY_LABELS[density]}
          </span>
        </ui.SubTrigger>
        <ui.SubContent className="w-auto min-w-40">
          {(Object.keys(DENSITY_LABELS) as CardDensity[]).map((option) => (
            <ui.Item key={option} onSelect={() => setDensity(option)}>
              <span className="flex-1">{DENSITY_LABELS[option]}</span>
              {option === density ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span className="sr-only">(current)</span>
                </>
              ) : null}
            </ui.Item>
          ))}
        </ui.SubContent>
      </ui.Sub>

      <ui.Separator />

      <ui.Item onSelect={() => setShowCompleted(!showCompleted)}>
        {showCompleted ? (
          <Eye aria-hidden="true" />
        ) : (
          <EyeOff aria-hidden="true" />
        )}
        {showCompleted ? "Hide completed notes" : "Show completed notes"}
      </ui.Item>
    </>
  );
}
