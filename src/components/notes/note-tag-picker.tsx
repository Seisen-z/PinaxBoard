"use client";

import { Check, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tag } from "@/types/note";

export interface NoteTagPickerProps {
  /** The workspace's tags. */
  tags: readonly Tag[];
  /** Tag ids currently on the note. */
  selectedIds: readonly string[];
  onToggle: (tagId: string) => void;
  /** Creates a tag and puts it on the note. Absent when signed out. */
  onCreate?: (name: string) => void;
  className?: string;
}

/**
 * Assign and unassign a note's tags (IMPLEMENTATION_PLAN.md §17).
 *
 * Plain checkboxes rather than menu items, which is what keeps the submenu
 * open while several are picked — a Radix menu item closes the whole menu on
 * select. Tagging is almost never a single choice, and reopening the menu per
 * tag is the kind of friction that stops people tagging at all.
 *
 * Creation lives here rather than in a management screen: a tag is made at the
 * moment it is needed, on the note that needs it, which is also why the new
 * tag is applied immediately.
 */
export function NoteTagPicker({
  tags,
  selectedIds,
  onToggle,
  onCreate,
  className,
}: NoteTagPickerProps) {
  return (
    <div className={cn("flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1", className)}>
      <div role="group" aria-label="Note tags" className="flex flex-col gap-0.5">
        {tags.length === 0 ? (
          <p className="px-1.5 py-1 text-xs text-muted-foreground">No tags yet</p>
        ) : (
          tags.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);

            return (
              <button
                key={tag.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => onToggle(tag.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm",
                  "hover:bg-accent focus-visible:bg-accent",
                  isSelected && "bg-accent",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tag.color ?? "var(--muted)" }}
                />
                <span className="flex-1 truncate text-left">{tag.name}</span>
                {isSelected ? (
                  <Check size={14} aria-hidden="true" className="shrink-0" />
                ) : null}
              </button>
            );
          })
        )}
      </div>

      {onCreate ? (
        <button
          type="button"
          onClick={() => {
            // `window.prompt`, for the same reason the workspace picker uses
            // it: one step, and obviously temporary rather than a half-built
            // dialog that looks finished.
            const name = window.prompt("New tag")?.trim();
            if (name) onCreate(name);
          }}
          className={cn(
            "mt-0.5 flex items-center gap-2 rounded-md border-t border-border px-1.5 pb-1 pt-1.5",
            "text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          <Plus size={14} aria-hidden="true" className="shrink-0" />
          New tag…
        </button>
      ) : null}
    </div>
  );
}
