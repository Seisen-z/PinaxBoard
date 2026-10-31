"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import {
  NOTE_STYLE_DEFINITIONS,
  getNoteColor,
  type NoteStyleDefinition,
} from "@/config/note-styles";
import { resolveNoteAppearance } from "@/lib/note-appearance";
import { cn } from "@/lib/utils";
import type { NoteColorId, NoteStyleId } from "@/types/note";

export interface NoteStylePickerProps {
  value: NoteStyleId;
  /** The note's current color, used to preview styles that do not force one. */
  color: NoteColorId;
  onChange: (style: NoteStyleId) => void;
  className?: string;
}

const GROUPS: readonly { id: NoteStyleDefinition["group"]; label: string }[] = [
  { id: "design", label: "Designs" },
  { id: "paper", label: "Plain paper" },
];

/**
 * Paper style picker with real previews (FRONTEND_SPEC.md §24).
 *
 * Designs render the actual design classes at thumbnail scale on the note's
 * own colour, so a tile is a miniature of what the card becomes. The selected
 * tile carries an outline and a check.
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
      className={cn("flex max-h-[min(60vh,440px)] flex-col gap-3 overflow-y-auto p-2", className)}
    >
      {GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {NOTE_STYLE_DEFINITIONS.filter((style) => style.group === group.id).map((style) => (
              <StyleTile
                key={style.id}
                style={style}
                color={color}
                selected={style.id === value}
                onSelect={() => onChange(style.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StyleTile({
  style,
  color,
  selected,
  onSelect,
}: {
  style: NoteStyleDefinition;
  color: NoteColorId;
  selected: boolean;
  onSelect: () => void;
}) {
  const resolved = resolveNoteAppearance({ color, style: style.id, coverUrl: null });
  const isDesign = style.group === "design";
  const preview = getNoteColor(style.forcedColor ?? color);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={style.label}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-transparent p-1.5 text-left text-xs",
        "hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-ring",
        selected && "border-ring bg-accent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative block h-14 w-full rounded-[3px] border",
          isDesign && cn("tk-design-thumb", resolved.textureClass),
        )}
        style={
          isDesign
            ? resolved.paperStyle
            : {
                backgroundColor: `var(${preview.surfaceVar})`,
                borderColor: `var(${preview.edgeVar})`,
                ...previewTexture(style.id, preview.edgeVar),
              }
        }
      >
        {isDesign ? (
          <>
            <i />
            <i />
          </>
        ) : null}
      </span>
      <span className="flex items-center gap-1">
        <span className="flex-1 truncate">{style.label}</span>
        {selected ? <Check size={13} aria-hidden="true" className="shrink-0" /> : null}
      </span>
    </button>
  );
}

/**
 * Texture for a plain-paper swatch.
 *
 * The shared `.tk-paper-lined` / `.tk-paper-grid` utilities rule at 28px and
 * 20px — spacing tuned for a real card. At swatch size those produce a blank
 * rectangle, so the swatch draws the same textures at a proportional scale.
 */
function previewTexture(style: NoteStyleId, edgeVar: string): CSSProperties {
  const rule = `var(${edgeVar})`;

  switch (style) {
    case "notebook":
    case "lined":
      return {
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 7px, ${rule} 7px 8px)`,
      };
    case "grid":
      return {
        backgroundImage: [
          `repeating-linear-gradient(to bottom, transparent 0 7px, ${rule} 7px 8px)`,
          `repeating-linear-gradient(to right, transparent 0 7px, ${rule} 7px 8px)`,
        ].join(", "),
      };
    case "sticky":
    case "kraft":
      return {
        backgroundImage: `radial-gradient(${rule} 0.5px, transparent 0.5px)`,
        backgroundSize: "3px 3px",
      };
    default:
      return {};
  }
}
