"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import {
  NOTE_STYLE_DEFINITIONS,
  getNoteColor,
} from "@/config/note-styles";
import { cn } from "@/lib/utils";
import type { NoteColorId, NoteStyleId } from "@/types/note";

export interface NoteStylePickerProps {
  value: NoteStyleId;
  /** The note's current color, used to preview styles that do not force one. */
  color: NoteColorId;
  onChange: (style: NoteStyleId) => void;
  className?: string;
}

/**
 * Paper style picker with real visual previews (FRONTEND_SPEC.md §24).
 *
 * Each row renders a miniature of the actual paper — same tokens, same texture
 * utility — so what the user sees is what the card becomes. The selected row
 * carries an accent outline and a check (§24).
 */
export function NoteStylePicker({
  value,
  color,
  onChange,
  className,
}: NoteStylePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Note style"
      className={cn("flex flex-col gap-0.5 p-1", className)}
    >
      {NOTE_STYLE_DEFINITIONS.map((style) => {
        const isSelected = style.id === value;
        const preview = getNoteColor(style.forcedColor ?? color);

        return (
          <button
            key={style.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(style.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-1.5 py-1 text-sm",
              "hover:bg-accent focus-visible:bg-accent",
              isSelected && "bg-accent",
            )}
          >
            <span
              aria-hidden="true"
              className="h-6 w-8 shrink-0 rounded border bg-center"
              style={{
                backgroundColor: `var(${preview.surfaceVar})`,
                borderColor: `var(${preview.edgeVar})`,
                ...previewTexture(style.id, preview.edgeVar),
              }}
            />
            <span className="flex-1 text-left">{style.label}</span>
            {isSelected ? (
              <Check size={14} aria-hidden="true" className="shrink-0" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Texture for a 24px-tall swatch.
 *
 * The shared `.tk-paper-lined` / `.tk-paper-grid` utilities rule at 28px and
 * 20px — spacing tuned for a real card. At preview size those produce a blank
 * rectangle, which would make Notebook, Lined and Grid indistinguishable. So
 * the swatch draws the same textures at a proportional scale.
 */
function previewTexture(style: NoteStyleId, edgeVar: string): CSSProperties {
  const rule = `var(${edgeVar})`;

  switch (style) {
    case "notebook":
    case "lined":
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 5px, ${rule} 5px 6px)`,
      };
    case "grid":
      return {
        backgroundImage: [
          `repeating-linear-gradient(to bottom, transparent 0 5px, ${rule} 5px 6px)`,
          `repeating-linear-gradient(to right, transparent 0 5px, ${rule} 5px 6px)`,
        ].join(", "),
      };
    case "sticky":
    case "kraft":
      return {
        backgroundImage: `radial-gradient(${rule} 0.5px, transparent 0.5px)`,
        backgroundSize: "3px 3px",
      };
    case "minimal":
    case "dark":
      return {};
  }
}
