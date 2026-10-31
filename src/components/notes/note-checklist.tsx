"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Subtask } from "@/types/note";

export interface NoteChecklistProps {
  subtasks: readonly Subtask[];
  /**
   * Toggles a subtask. Omit to render the checklist read-only (Milestone 2);
   * Milestone 3 supplies a handler backed by the note store.
   */
  onToggle?: (subtaskId: string, completed: boolean) => void;
  /** Rows shown before the list is truncated with a "+N more" line. */
  maxVisible?: number;
}

/**
 * Checklist rows inside a note (FRONTEND_SPEC.md §17, PRODUCT_SPEC.md →
 * "Nested Tasks").
 *
 * Completed rows keep full contrast on their label — a struck-through item
 * must stay readable (§19).
 */
export function NoteChecklist({
  subtasks,
  onToggle,
  maxVisible = 4,
}: NoteChecklistProps) {
  if (subtasks.length === 0) return null;

  const ordered = [...subtasks].sort((a, b) => a.position - b.position);
  const visible = ordered.slice(0, maxVisible);
  const hiddenCount = ordered.length - visible.length;

  return (
    <ul className="tk-note-checklist flex flex-col gap-1.5">
      {visible.map((subtask) => (
        <li key={subtask.id}>
          <label
            className={cn(
              "flex items-start gap-2 text-[13px] leading-snug",
              onToggle ? "cursor-pointer" : "cursor-default",
            )}
          >
            <span className="relative mt-0.5 grid size-4 shrink-0 place-items-center">
              <input
                type="checkbox"
                checked={subtask.completed}
                disabled={!onToggle}
                onChange={(event) => onToggle?.(subtask.id, event.target.checked)}
                className="peer size-4 appearance-none rounded-[5px] border border-current/35 bg-current/5 checked:bg-current/15 disabled:cursor-default"
              />
              <Check
                size={11}
                strokeWidth={3}
                aria-hidden="true"
                className="pointer-events-none absolute opacity-0 peer-checked:opacity-90"
              />
            </span>
            <span className={cn("min-w-0", subtask.completed && "line-through opacity-75")}>
              {subtask.title}
            </span>
          </label>
        </li>
      ))}

      {hiddenCount > 0 ? (
        <li className="pl-6 text-[12px] opacity-65">+{hiddenCount} more</li>
      ) : null}
    </ul>
  );
}
