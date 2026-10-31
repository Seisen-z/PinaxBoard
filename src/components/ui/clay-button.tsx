"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The button system from FRONTEND_SPEC.md §44–§45.
 *
 * Claymorphism is applied sparingly (§7): `primary` and `secondary` are raised,
 * `ghost` is flat. Every variant presses in on `:active` — translateY(1px) plus
 * an inset shadow — which is what makes the control feel tactile (§45).
 */
const clayButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 select-none",
    "font-medium whitespace-nowrap",
    "transition-[background-color,box-shadow,transform,color] duration-[var(--motion-fast)]",
    "disabled:pointer-events-none disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        /** Strongest control on screen: Add Note, confirm actions. */
        primary: [
          "tk-clay text-primary-foreground",
          "bg-[image:var(--clay-primary-gradient)]",
          "hover:brightness-110",
          "active:tk-clay-pressed",
        ].join(" "),
        /** Dark solid with lower depth: view switchers, filters, sort. */
        secondary: [
          "tk-clay text-foreground",
          "bg-[image:var(--clay-neutral-gradient)]",
          "hover:brightness-115",
          "active:tk-clay-pressed",
        ].join(" "),
        /** Mostly flat: toolbar icons and inline actions. */
        ghost: [
          "border border-transparent text-muted-foreground",
          "hover:bg-surface-raised hover:text-foreground",
          "active:translate-y-px",
        ].join(" "),
        /** Destructive confirmation; visually separated from safe actions. */
        danger: [
          "tk-clay text-primary-foreground",
          "bg-[image:linear-gradient(180deg,hsl(0_82%_66%),hsl(0_74%_54%))]",
          "hover:brightness-110",
          "active:tk-clay-pressed",
        ].join(" "),
      },
      size: {
        /** 44px tall — the mobile touch-target minimum (§56). */
        lg: "h-11 px-5 text-sm rounded-lg",
        md: "h-9 px-3.5 text-sm rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
      },
      /**
       * Marks the control as the current selection. Selected navigation and
       * view controls get extra depth and full-contrast text (§10, §45).
       */
      selected: {
        true: "text-foreground",
        false: "",
      },
    },
    compoundVariants: [
      {
        /*
         * A selected ghost control — the active nav item, the current view —
         * reads as *filled*, not raised. FRONTEND_SPEC.md §10 asks for clay
         * depth here, but a drop shadow on a chip inside an already-solid
         * header looks like a rendering artefact rather than a material.
         * Contrast and a border carry the state instead; clay stays on the
         * controls that are genuinely tactile.
         */
        variant: "ghost",
        selected: true,
        class: "border-border-strong bg-surface-raised text-foreground",
      },
    ],
    defaultVariants: {
      variant: "secondary",
      size: "md",
      selected: false,
    },
  },
);

export type ClayButtonVariants = VariantProps<typeof clayButtonVariants>;

export interface ClayButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    ClayButtonVariants {
  children?: ReactNode;
}

/**
 * @example
 * <ClayButton variant="primary" size="lg" onClick={addNote}>
 *   <Plus size={18} aria-hidden /> Add Note
 * </ClayButton>
 *
 * Accessibility: an icon-only button must pass `aria-label`. Prefer
 * {@link IconButton}, which requires one.
 */
export const ClayButton = forwardRef<HTMLButtonElement, ClayButtonProps>(
  function ClayButton(
    { variant, size, selected, className, type = "button", children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        data-selected={selected ? "true" : undefined}
        aria-pressed={selected === true ? true : undefined}
        className={cn(clayButtonVariants({ variant, size, selected }), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export { clayButtonVariants };
