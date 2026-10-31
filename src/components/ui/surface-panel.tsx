import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A solid application surface: header bars, menus, dialogs, toolbars and the
 * floating control clusters.
 *
 * Surfaces are deliberately opaque. FRONTEND_SPEC.md §53 reserves blur and
 * other filters for the background layer, so nothing here may use
 * `backdrop-filter`.
 */
const surfacePanelVariants = cva("text-foreground", {
  variants: {
    /** Visual weight. `sunken` reads as a well, `raised` as a floating cluster. */
    tone: {
      base: "bg-surface",
      soft: "bg-surface-panel-soft",
      raised: "bg-surface-raised",
      sunken: "bg-surface-sunken",
    },
    /** Border strength (FRONTEND_SPEC.md §52). */
    border: {
      none: "",
      soft: "border border-border",
      strong: "border border-border-strong",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
    },
    /** Elevation. `clay` is reserved for compact floating clusters (§7). */
    elevation: {
      none: "",
      sm: "shadow-panel-sm",
      md: "shadow-panel-md",
      clay: "tk-clay",
    },
  },
  defaultVariants: {
    tone: "base",
    border: "soft",
    radius: "lg",
    elevation: "none",
  },
});

export type SurfacePanelVariants = VariantProps<typeof surfacePanelVariants>;

export interface SurfacePanelProps
  extends ComponentPropsWithoutRef<"div">,
    SurfacePanelVariants {
  /** Render as a different element, e.g. `as="header"` or `as="aside"`. */
  as?: ElementType;
  children?: ReactNode;
}

/**
 * @example
 * <SurfacePanel as="header" tone="base" radius="none" border="soft">
 *   …
 * </SurfacePanel>
 */
export function SurfacePanel({
  as,
  tone,
  border,
  radius,
  elevation,
  className,
  children,
  ...props
}: SurfacePanelProps) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component
      className={cn(
        surfacePanelVariants({ tone, border, radius, elevation }),
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export { surfacePanelVariants };
