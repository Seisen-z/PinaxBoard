import { getPriority } from "@/config/priorities";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/common";

export interface PriorityBadgeProps {
  priority: Priority;
  /**
   * `dot` is a small accent for note headers; `label` adds the text, for
   * menus and property panels (FRONTEND_SPEC.md §21 — priority must stay a
   * small accent, never a whole-card color).
   */
  variant?: "dot" | "label";
  className?: string;
}

/**
 * Priority indicator.
 *
 * The `dot` variant still carries an accessible name, so priority is never
 * communicated by color alone (FRONTEND_SPEC.md §62).
 *
 * @example
 * <PriorityBadge priority="urgent" />              // colored dot + a11y label
 * <PriorityBadge priority="high" variant="label" /> // dot + “High”
 */
export function PriorityBadge({
  priority,
  variant = "dot",
  className,
}: PriorityBadgeProps) {
  const definition = getPriority(priority);
  const color = `var(${definition.colorVar})`;

  if (variant === "dot") {
    return (
      <span
        role="img"
        aria-label={`Priority: ${definition.label}`}
        className={cn("inline-block size-2 shrink-0 rounded-full", className)}
        style={{ backgroundColor: color }}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="sr-only">Priority: </span>
      {definition.label}
    </span>
  );
}
