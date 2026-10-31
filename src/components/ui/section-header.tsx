import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  /** Section name, e.g. a lane title. */
  title: string;
  /**
   * Accent color as a CSS value — pass `var(--status-todo)` and friends.
   * Rendered as a small dot beside the title.
   */
  accentColor?: string;
  /** Item count shown next to the title. Hidden when `undefined`. */
  count?: number;
  /** Controls placed at the trailing edge, e.g. Add and More. */
  actions?: ReactNode;
  /**
   * Heading level for the title. Defaults to `h2`. Set this so a page's
   * heading order stays sequential (FRONTEND_SPEC.md §62).
   */
  as?: "h2" | "h3" | "h4";
  /** Screen-reader-only description of what the section contains. */
  description?: string;
  /**
   * Makes the title respond to a double-click — used for in-place rename.
   * Keyboard users reach the same action through the section's menu.
   */
  onTitleDoubleClick?: () => void;
  className?: string;
  /**
   * Wraps the dot and the title in a tinted pill, as the board's columns do.
   * The tint comes from `--lane-accent` on an ancestor, not from `accentColor`,
   * so the pill and its column panel are mixed from the same value.
   */
  pill?: boolean;
}

/**
 * Shared heading row for lanes, panels and settings sections.
 *
 * The accent color is decorative: the title text carries the meaning, so
 * status is never communicated by color alone (FRONTEND_SPEC.md §62).
 *
 * @example
 * <SectionHeader
 *   title="In Progress"
 *   accentColor="var(--status-in-progress)"
 *   count={3}
 *   actions={<IconButton label="Add note to In Progress" icon={<Plus />} />}
 * />
 */
export function SectionHeader({
  title,
  accentColor,
  count,
  actions,
  as: Heading = "h2",
  description,
  onTitleDoubleClick,
  className,
  pill = false,
}: SectionHeaderProps) {
  const label = (
    <>
      {accentColor ? (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      ) : null}

      <Heading
        onDoubleClick={onTitleDoubleClick}
        className={cn(
          "truncate text-sm font-semibold tracking-tight text-foreground",
          onTitleDoubleClick && "cursor-text select-none",
        )}
      >
        {title}
      </Heading>
    </>
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {pill ? (
        <span className="tk-lane-pill flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1">
          {label}
        </span>
      ) : (
        label
      )}

      {typeof count === "number" ? (
        <span className="px-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {count}
          <span className="sr-only"> items</span>
        </span>
      ) : null}

      {description ? <span className="sr-only">{description}</span> : null}

      {actions ? (
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}
