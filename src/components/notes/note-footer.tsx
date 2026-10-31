import { CalendarDays, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/utils";

export interface NoteFooterProps {
  /** ISO due date, or `null` when the note is not dated. */
  dueAt: string | null;
  completed: boolean;
  /** Checklist progress, or `null` when the note has no checklist. */
  progress: { completed: number; total: number; ratio: number } | null;
  /** Initials shown in the assignee chip; omitted when unassigned. */
  assigneeInitials?: string;
}

/**
 * Note metadata row: due date, checklist progress and assignee
 * (FRONTEND_SPEC.md §17, §66).
 */
export function NoteFooter({
  dueAt,
  completed,
  progress,
  assigneeInitials,
}: NoteFooterProps) {
  const dueLabel = formatShortDate(dueAt);
  const hasContent = Boolean(dueLabel) || progress !== null || Boolean(assigneeInitials) || completed;

  if (!hasContent) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {progress ? (
        <div className="flex items-center gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.completed}
            aria-label={`${progress.completed} of ${progress.total} tasks completed`}
            className="h-1 flex-1 overflow-hidden rounded-full bg-current/15"
          >
            <div
              className="h-full rounded-full bg-current/55 transition-[width] duration-[var(--motion-normal)]"
              style={{ width: `${Math.round(progress.ratio * 100)}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums opacity-70">
            {progress.completed}/{progress.total}
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-[11px] opacity-75">
        {dueLabel ? (
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={12} aria-hidden="true" />
            <span className="sr-only">Due </span>
            {dueLabel}
          </span>
        ) : null}

        {completed ? (
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 size={12} aria-hidden="true" />
            Done
          </span>
        ) : null}

        {assigneeInitials ? (
          <span
            className={cn(
              "ml-auto grid size-5 place-items-center rounded-full",
              "bg-current/15 text-[9px] font-semibold",
            )}
            aria-label={`Assigned to ${assigneeInitials}`}
          >
            <span aria-hidden="true">{assigneeInitials}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
