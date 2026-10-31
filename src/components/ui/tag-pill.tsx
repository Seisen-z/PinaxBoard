import { cn } from "@/lib/utils";

export interface TagPillProps {
  /** Tag name without the leading `#`. */
  name: string;
  /**
   * Optional tag color as a CSS value. When set, the pill tints its
   * background and border with that color at low alpha so the label stays
   * readable on both paper and dark surfaces.
   */
  color?: string | null;
  /** Renders a smaller pill for dense surfaces such as list rows. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Compact rounded tag pill (FRONTEND_SPEC.md §20).
 *
 * @example
 * <TagPill name="planning" color="var(--info)" />  // renders “#planning”
 */
export function TagPill({ name, color, size = "md", className }: TagPillProps) {
  const tinted = color
    ? {
        // color-mix keeps the tint subtle regardless of the supplied hue, so a
        // saturated tag color cannot overpower the note content.
        backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 42%, transparent)`,
        color: `color-mix(in srgb, ${color} 82%, currentColor)`,
      }
    : undefined;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border font-medium",
        "border-current/20 bg-current/10",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        className,
      )}
      style={tinted}
    >
      <span className="truncate">
        <span aria-hidden="true">#</span>
        {name}
      </span>
    </span>
  );
}
