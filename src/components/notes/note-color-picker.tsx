"use client";

import { Check } from "lucide-react";

import { NOTE_COLOR_DEFINITIONS } from "@/config/note-styles";
import { cn } from "@/lib/utils";
import type { NoteColorId } from "@/types/note";

export interface NoteColorPickerProps {
  value: NoteColorId;
  onChange: (color: NoteColorId) => void;
  className?: string;
}

/**
 * Paper color swatches (FRONTEND_SPEC.md §15).
 *
 * Each swatch is painted with the real paper token, so the picker *is* the
 * preview — there is no separate legend to drift out of sync.
 *
 * Rendered as a radiogroup: arrow keys move between swatches and the selected
 * one is announced, rather than presenting nine unlabelled buttons.
 */
export function NoteColorPicker({
  value,
  onChange,
  className,
}: NoteColorPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Note color"
      className={cn("grid grid-cols-5 gap-1.5 p-1", className)}
    >
      {NOTE_COLOR_DEFINITIONS.map((color) => {
        const isSelected = color.id === value;

        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.id)}
            className={cn(
              "grid size-7 place-items-center rounded-md border transition-transform",
              "hover:scale-105",
              isSelected ? "ring-2 ring-ring ring-offset-1 ring-offset-popover" : "",
            )}
            style={{
              backgroundColor: `var(${color.surfaceVar})`,
              borderColor: `var(${color.edgeVar})`,
              color: `var(${color.inkVar})`,
            }}
          >
            {isSelected ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}
