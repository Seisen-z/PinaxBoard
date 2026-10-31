"use client";

import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { ClayButton, type ClayButtonProps } from "@/components/ui/clay-button";

export interface IconButtonProps
  extends Omit<ClayButtonProps, "children" | "aria-label"> {
  /**
   * Required. An icon alone communicates nothing to a screen reader
   * (FRONTEND_SPEC.md §62), so the type system insists on a text label.
   */
  label: string;
  /** The icon element. It is hidden from assistive tech automatically. */
  icon: ReactNode;
}

const SQUARE_BY_SIZE = {
  lg: "h-11 w-11 p-0",
  md: "h-9 w-9 p-0",
  sm: "h-8 w-8 p-0",
} as const;

/**
 * A square icon-only button.
 *
 * @example
 * <IconButton label="Notifications" icon={<Bell size={18} />} variant="ghost" />
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, icon, size = "md", className, ...props }, ref) {
    return (
      <ClayButton
        ref={ref}
        size={size}
        aria-label={label}
        title={label}
        className={cn(SQUARE_BY_SIZE[size ?? "md"], className)}
        {...props}
      >
        <span aria-hidden="true" className="inline-flex">
          {icon}
        </span>
      </ClayButton>
    );
  },
);
