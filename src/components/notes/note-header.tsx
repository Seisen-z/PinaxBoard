"use client";

import { Check, Lock, MoreHorizontal, Pin } from "lucide-react";
import { forwardRef, useEffect, useRef, type ReactNode } from "react";

import { PriorityBadge } from "@/components/ui/priority-badge";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/common";

export interface NoteHeaderProps {
  title: string;
  priority: Priority;
  pinned: boolean;
  locked: boolean;
  completed: boolean;
  /**
   * When provided the title becomes an editable field. Omit it to render a
   * read-only heading.
   */
  onTitleChange?: (title: string) => void;
  /** Focuses the title on mount — used for a freshly created blank note. */
  autoFocusTitle?: boolean;
  /** Toggles completion straight from the card (FRONTEND_SPEC.md §73–§74). */
  onToggleComplete?: () => void;
  /** The More menu. Pass a `NoteMenu` wrapping {@link NoteMoreButton}. */
  menuSlot?: ReactNode;
}

const PLACEHOLDER_TITLE = "Untitled";

/**
 * Note title row: completion toggle, priority accent, title, lock and pin
 * markers, and the More menu (FRONTEND_SPEC.md §18).
 *
 * Secondary controls stay hidden until the card is hovered or focused, so the
 * default board stays calm (§18, §72). They remain reachable by keyboard:
 * `group-focus-within` reveals them, and they are never `display: none`.
 */
export function NoteHeader({
  title,
  priority,
  pinned,
  locked,
  completed,
  onTitleChange,
  autoFocusTitle = false,
  onToggleComplete,
  menuSlot,
}: NoteHeaderProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocusTitle) inputRef.current?.focus();
  }, [autoFocusTitle]);

  // Grow the title to at most two lines, then clip. A title long enough to
  // need a third line is a body, and letting it push the card taller breaks
  // the lane's scannability.
  useEffect(() => {
    const element = inputRef.current;
    if (!element) return;

    element.style.height = "auto";

    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
    const maxHeight = Number.isFinite(lineHeight) ? lineHeight * 2 : 44;

    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
  }, [title]);

  return (
    <div className="tk-note-header flex items-start gap-2">
      {onToggleComplete ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={completed}
          aria-label={`Mark ${title || PLACEHOLDER_TITLE} as ${completed ? "incomplete" : "done"}`}
          onClick={onToggleComplete}
          className={cn(
            "mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px] border",
            "border-current/35 bg-current/5 transition-colors",
            completed && "bg-current/20",
          )}
        >
          {completed ? (
            <Check size={11} strokeWidth={3} aria-hidden="true" />
          ) : null}
        </button>
      ) : null}

      {priority !== "none" ? (
        <PriorityBadge priority={priority} className="mt-1.5" />
      ) : null}

      {onTitleChange ? (
        <textarea
          ref={inputRef}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          onKeyDown={(event) => {
            // A title is one field, not a paragraph. Enter commits it rather
            // than growing the card by a blank line.
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          placeholder={PLACEHOLDER_TITLE}
          aria-label="Note title"
          readOnly={locked}
          rows={1}
          className={cn(
            "tk-note-title min-w-0 flex-1 resize-none overflow-hidden break-words bg-transparent",
            "text-[15px] font-semibold leading-snug",
            "placeholder:text-current/45 focus:outline-none",
            completed && "line-through",
          )}
        />
      ) : (
        <h3
          className={cn(
            "tk-note-title min-w-0 flex-1 break-words text-[15px] font-semibold leading-snug",
            "line-clamp-2",
            completed && "line-through",
          )}
        >
          {title || PLACEHOLDER_TITLE}
        </h3>
      )}

      {locked ? (
        <Lock
          size={13}
          className="mt-1 shrink-0 opacity-60"
          role="img"
          aria-label="Locked"
        />
      ) : null}

      {pinned ? (
        <Pin
          size={14}
          className="mt-0.5 shrink-0 rotate-45 opacity-70"
          role="img"
          aria-label="Pinned"
        />
      ) : null}

      {menuSlot}
    </div>
  );
}

export interface NoteMoreButtonProps {
  /** Used to build the accessible name, e.g. "More actions for Roadmap". */
  noteTitle: string;
  onClick?: () => void;
}

/**
 * The card's More trigger. Split out so `NoteMenu` can wrap it with
 * `asChild` — Radix needs a single element that forwards its ref and props.
 */
export const NoteMoreButton = forwardRef<HTMLButtonElement, NoteMoreButtonProps>(
  function NoteMoreButton({ noteTitle, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={`More actions for ${noteTitle || PLACEHOLDER_TITLE}`}
        className={cn(
          "-mr-1 shrink-0 rounded p-1 opacity-0 transition-opacity",
          "group-hover:opacity-70 group-focus-within:opacity-70 hover:!opacity-100",
          "focus-visible:opacity-100 aria-expanded:opacity-100",
        )}
        {...props}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
    );
  },
);
