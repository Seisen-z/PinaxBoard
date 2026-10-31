"use client";

import { Check } from "lucide-react";

import { PRIORITY_DEFINITIONS } from "@/config/priorities";
import { cn } from "@/lib/utils";
import type { Priority } from "@/types/common";

export interface NotePriorityPickerProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  className?: string;
}

/**
 * Priority selector (FRONTEND_SPEC.md §21).
 *
 * Each row pairs its color with its name, so the level is never communicated
 * by color alone (§62).
 */
export function NotePriorityPicker({
  value,
  onChange,
  className,
}: NotePriorityPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Note priority"
      className={cn("flex flex-col gap-0.5 p-1", className)}
    >
      {PRIORITY_DEFINITIONS.map((priority) => {
        const isSelected = priority.id === value;

        return (
          <button
            key={priority.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(priority.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm",
              "hover:bg-accent focus-visible:bg-accent",
              isSelected && "bg-accent",
            )}
          >
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: `var(${priority.colorVar})` }}
            />
            <span className="flex-1 text-left">{priority.label}</span>
            {isSelected ? (
              <Check size={14} aria-hidden="true" className="shrink-0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
