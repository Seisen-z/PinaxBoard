"use client";

import { Check, ListFilter, X } from "lucide-react";

import { ClayButton } from "@/components/ui/clay-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DROPDOWN_MENU_PRIMITIVES } from "@/components/ui/menu-primitives";
import { NOTE_STYLE_DEFINITIONS } from "@/config/note-styles";
import { PRIORITY_DEFINITIONS } from "@/config/priorities";
import {
  activeFilterCount,
  hasActiveFilters,
  toggleInList,
  type BoardFilters,
  type CompletionFilter,
  type DueFilter,
} from "@/features/board/filter-notes";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

const COMPLETION_LABELS: Record<CompletionFilter, string> = {
  all: "All notes",
  incomplete: "Not done",
  complete: "Done",
};

const DUE_LABELS: Record<DueFilter, string> = {
  any: "Any time",
  overdue: "Overdue",
  today: "Due today",
  week: "Next 7 days",
  scheduled: "Has a due date",
  none: "No due date",
};

/**
 * The board's Filter control (IMPLEMENTATION_PLAN.md §17).
 *
 * Multi-select throughout: within a facet the choices are OR-ed, across facets
 * they are AND-ed (see `filter-notes.ts`). Each row is a checkable item rather
 * than a radio, which is what makes that readable without explaining it.
 *
 * The trigger carries the active count because filters persist. A board that
 * opens with three tags selected and a plain "Filter" label looks like a board
 * that has lost half its notes.
 */
export function BoardFilterMenu() {
  const { tags, categories } = useTaxonomyContext();
  const filters = useSettingsStore((state) => state.boardFilters);
  const setFilters = useSettingsStore((state) => state.setBoardFilters);
  const clearFilters = useSettingsStore((state) => state.clearBoardFilters);

  const ui = DROPDOWN_MENU_PRIMITIVES;
  const count = activeFilterCount(filters);
  const active = hasActiveFilters(filters);

  const patch = (next: Partial<BoardFilters>) => setFilters({ ...filters, ...next });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ClayButton
          variant="ghost"
          size="sm"
          selected={active}
          aria-label={
            active ? `Filter, ${count} active` : "Filter"
          }
        >
          <ListFilter size={15} aria-hidden="true" />
          Filter
          {active ? (
            <span className="rounded-full bg-surface-sunken px-1.5 text-[10px] font-semibold tabular-nums">
              {count}
            </span>
          ) : null}
        </ClayButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-auto min-w-56">
        <ui.Label>Filter</ui.Label>

        <ui.Sub>
          <ui.SubTrigger>
            Status
            <span className="ml-auto pl-3 text-xs text-muted-foreground">
              {COMPLETION_LABELS[filters.completion]}
            </span>
          </ui.SubTrigger>
          <ui.SubContent className="w-auto min-w-40">
            {(Object.keys(COMPLETION_LABELS) as CompletionFilter[]).map((option) => (
              <ui.Item key={option} onSelect={() => patch({ completion: option })}>
                <span className="flex-1">{COMPLETION_LABELS[option]}</span>
                {option === filters.completion ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span className="sr-only">(selected)</span>
                  </>
                ) : null}
              </ui.Item>
            ))}
          </ui.SubContent>
        </ui.Sub>

        <ui.Sub>
          <ui.SubTrigger>
            Priority
            {filters.priorities.length > 0 ? (
              <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">
                {filters.priorities.length}
              </span>
            ) : null}
          </ui.SubTrigger>
          <ui.SubContent className="w-auto min-w-40">
            {PRIORITY_DEFINITIONS.map((priority) => {
              const selected = filters.priorities.includes(priority.id);

              return (
                <ui.Item
                  key={priority.id}
                  onSelect={(event) => {
                    // Kept open: picking one priority is rarely the whole
                    // filter, and reopening the menu per choice is tedious.
                    event.preventDefault();
                    patch({
                      priorities: toggleInList(filters.priorities, priority.id),
                    });
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(${priority.colorVar})` }}
                  />
                  <span className="flex-1">{priority.label}</span>
                  {selected ? (
                    <>
                      <Check size={14} aria-hidden="true" />
                      <span className="sr-only">(selected)</span>
                    </>
                  ) : null}
                </ui.Item>
              );
            })}
          </ui.SubContent>
        </ui.Sub>

        <ui.Sub>
          <ui.SubTrigger>
            Due
            <span className="ml-auto pl-3 text-xs text-muted-foreground">
              {DUE_LABELS[filters.due]}
            </span>
          </ui.SubTrigger>
          <ui.SubContent className="w-auto min-w-44">
            {(Object.keys(DUE_LABELS) as DueFilter[]).map((option) => (
              <ui.Item key={option} onSelect={() => patch({ due: option })}>
                <span className="flex-1">{DUE_LABELS[option]}</span>
                {option === filters.due ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span className="sr-only">(selected)</span>
                  </>
                ) : null}
              </ui.Item>
            ))}
          </ui.SubContent>
        </ui.Sub>

        <ui.Sub>
          <ui.SubTrigger>
            Note style
            {filters.styles.length > 0 ? (
              <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">
                {filters.styles.length}
              </span>
            ) : null}
          </ui.SubTrigger>
          <ui.SubContent className="w-auto min-w-44">
            {NOTE_STYLE_DEFINITIONS.map((style) => {
              const selected = filters.styles.includes(style.id);

              return (
                <ui.Item
                  key={style.id}
                  onSelect={(event) => {
                    event.preventDefault();
                    patch({ styles: toggleInList(filters.styles, style.id) });
                  }}
                >
                  <span className="flex-1 truncate">{style.label}</span>
                  {selected ? (
                    <>
                      <Check size={14} aria-hidden="true" />
                      <span className="sr-only">(selected)</span>
                    </>
                  ) : null}
                </ui.Item>
              );
            })}
          </ui.SubContent>
        </ui.Sub>

        <ui.Sub>
          <ui.SubTrigger>
            Tags
            {filters.tagIds.length > 0 ? (
              <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">
                {filters.tagIds.length}
              </span>
            ) : null}
          </ui.SubTrigger>
          <ui.SubContent className="w-auto min-w-44">
            {tags.length === 0 ? (
              <ui.Label>No tags yet</ui.Label>
            ) : (
              tags.map((tag) => {
                const selected = filters.tagIds.includes(tag.id);

                return (
                  <ui.Item
                    key={tag.id}
                    onSelect={(event) => {
                      event.preventDefault();
                      patch({ tagIds: toggleInList(filters.tagIds, tag.id) });
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color ?? "var(--muted)" }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {selected ? (
                      <>
                        <Check size={14} aria-hidden="true" />
                        <span className="sr-only">(selected)</span>
                      </>
                    ) : null}
                  </ui.Item>
                );
              })
            )}
          </ui.SubContent>
        </ui.Sub>

        <ui.Sub>
          <ui.SubTrigger>
            Category
            {filters.categoryIds.length > 0 ? (
              <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">
                {filters.categoryIds.length}
              </span>
            ) : null}
          </ui.SubTrigger>
          <ui.SubContent className="w-auto min-w-44">
            {/*
              `null` is a real choice, not an absence: "show me what I have not
              filed yet" is the most useful category filter there is.
            */}
            <CategoryFilterItem
              ui={ui}
              label="Uncategorised"
              value={null}
              filters={filters}
              onToggle={patch}
            />

            {categories.map((category) => (
              <CategoryFilterItem
                key={category.id}
                ui={ui}
                label={category.name}
                emoji={category.emoji}
                color={category.color}
                value={category.id}
                filters={filters}
                onToggle={patch}
              />
            ))}
          </ui.SubContent>
        </ui.Sub>

        {active ? (
          <>
            <ui.Separator />
            <ui.Item onSelect={clearFilters}>
              <X aria-hidden="true" />
              Clear filters
            </ui.Item>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CategoryFilterItemProps {
  ui: typeof DROPDOWN_MENU_PRIMITIVES;
  label: string;
  emoji?: string | null;
  color?: string | null;
  value: string | null;
  filters: BoardFilters;
  onToggle: (next: Partial<BoardFilters>) => void;
}

function CategoryFilterItem({
  ui,
  label,
  emoji,
  color,
  value,
  filters,
  onToggle,
}: CategoryFilterItemProps) {
  const selected = filters.categoryIds.includes(value);

  return (
    <ui.Item
      onSelect={(event) => {
        event.preventDefault();
        onToggle({ categoryIds: toggleInList(filters.categoryIds, value) });
      }}
    >
      {emoji ? (
        <span aria-hidden="true">{emoji}</span>
      ) : (
        <span
          aria-hidden="true"
          className={cn("size-2 shrink-0 rounded-full", !color && "opacity-50")}
          style={{ backgroundColor: color ?? "var(--muted)" }}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {selected ? (
        <>
          <Check size={14} aria-hidden="true" />
          <span className="sr-only">(selected)</span>
        </>
      ) : null}
    </ui.Item>
  );
}
