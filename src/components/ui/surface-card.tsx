import { cva, type VariantProps } from "class-variance-authority";
import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
  Ref,
} from "react";

import { cn } from "@/lib/utils";

/**
 * A paper card: the physical object layer of the interface
 * (FRONTEND_SPEC.md §5.3, §14, §16).
 *
 * Paper carries a soft outer shadow and **never** a clay inner shadow (§16).
 * The paper color itself is supplied by the caller through the `--paper-*`
 * tokens, so this component stays color-agnostic.
 */
const surfaceCardVariants = cva(
  "relative rounded-[var(--radius-note)] transition-[box-shadow,transform] duration-[var(--motion-normal)] ease-[var(--motion-ease)]",
  {
    variants: {
      elevation: {
        flat: "shadow-none",
        rest: "shadow-note",
        /** Applied while a pointer drag is in progress (§47). */
        drag: "shadow-note-drag",
      },
      /** Lifts by 1px on hover — no scale jump (§46). */
      interactive: {
        true: "hover:-translate-y-px hover:shadow-note-hover",
        false: "",
      },
      /** Completed notes dim slightly but stay readable (§19). */
      completed: {
        true: "opacity-[var(--note-completed-opacity)]",
        false: "",
      },
      /**
       * Selection ring.
       *
       * Drawn *inside* the card. An outset ring (`ring-offset-*`) is clipped
       * by any scrolling ancestor — which is every lane — so the highlight
       * appeared sliced off at the column edges.
       */
      selected: {
        true: "ring-2 ring-inset ring-ring",
        false: "",
      },
    },
    defaultVariants: {
      elevation: "rest",
      interactive: false,
      completed: false,
      selected: false,
    },
  },
);

export type SurfaceCardVariants = VariantProps<typeof surfaceCardVariants>;

export interface SurfaceCardProps
  extends ComponentPropsWithoutRef<"div">,
    SurfaceCardVariants {
  as?: ElementType;
  children?: ReactNode;
  /**
   * Forwarded to the rendered element.
   *
   * Declared as a prop rather than through `forwardRef` because React 19
   * passes `ref` as an ordinary prop, and a polymorphic `as` makes the
   * `forwardRef` generic signature considerably worse to read.
   */
  ref?: Ref<HTMLElement>;
}

/**
 * @example
 * <SurfaceCard
 *   as="article"
 *   interactive
 *   style={{ background: "var(--paper-yellow)", color: "var(--paper-yellow-ink)" }}
 * >
 *   …
 * </SurfaceCard>
 */
export function SurfaceCard({
  as,
  elevation,
  interactive,
  completed,
  selected,
  className,
  children,
  ref,
  ...props
}: SurfaceCardProps) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component
      ref={ref}
      data-completed={completed ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      className={cn(
        surfaceCardVariants({ elevation, interactive, completed, selected }),
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export { surfaceCardVariants };
