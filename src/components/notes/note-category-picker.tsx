"use client";

import { Check, CircleSlash, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Category } from "@/types/note";

export interface NoteCategoryPickerProps {
  categories: readonly Category[];
  /** The note's category, or `null`. */
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  /** Creates a category and assigns it. Absent when signed out. */
  onCreate?: (name: string) => void;
  className?: string;
}

/**
 * Assign a note's category (IMPLEMENTATION_PLAN.md §17).
 *
 * A radio group, unlike {@link NoteTagPicker}'s checkboxes — that is the whole
 * distinction between the two concepts. A note has many tags and one category,
 * so "None" is a listed option rather than something reached by unpicking.
 */
export function NoteCategoryPicker({
  categories,
  selectedId,
  onSelect,
  onCreate,
  className,
}: NoteCategoryPickerProps) {
  return (
    <div className={cn("flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1", className)}>
      <div
        role="radiogroup"
        aria-label="Note category"
        className="flex flex-col gap-0.5"
      >
        <button
          type="button"
          role="radio"
          aria-checked={selectedId === null}
          onClick={() => onSelect(null)}
          className={cn(
            "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm",
            "hover:bg-accent focus-visible:bg-accent",
            selectedId === null && "bg-accent",
          )}
        >
          <CircleSlash size={14} aria-hidden="true" className="shrink-0 opacity-60" />
          <span className="flex-1 text-left">None</span>
          {selectedId === null ? (
            <Check size={14} aria-hidden="true" className="shrink-0" />
          ) : null}
        </button>

        {categories.map((category) => {
          const isSelected = category.id === selectedId;

          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(category.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm",
                "hover:bg-accent focus-visible:bg-accent",
                isSelected && "bg-accent",
              )}
            >
              {category.emoji ? (
                <span aria-hidden="true" className="shrink-0 text-xs">
                  {category.emoji}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color ?? "var(--muted)" }}
                />
              )}
              <span className="flex-1 truncate text-left">{category.name}</span>
              {isSelected ? (
                <Check size={14} aria-hidden="true" className="shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>

      {onCreate ? (
        <button
          type="button"
          onClick={() => {
            const name = window.prompt("New category")?.trim();
            if (name) onCreate(name);
          }}
          className={cn(
            "mt-0.5 flex items-center gap-2 rounded-md border-t border-border px-1.5 pb-1 pt-1.5",
            "text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Plus size={14} aria-hidden="true" className="shrink-0" />
          New category…
        </button>
      ) : null}
    </div>
  );
}
