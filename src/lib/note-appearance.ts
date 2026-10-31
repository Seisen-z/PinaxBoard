import type { CSSProperties } from "react";

import {
  getNoteColor,
  getNoteStyle,
  type NoteColorDefinition,
  type NoteStyleDefinition,
} from "@/config/note-styles";
import type { NoteAppearance } from "@/types/note";

/**
 * Resolves a note's appearance into the CSS a paper card needs.
 *
 * Centralising this is what keeps every surface — Board lane, Canvas, Grid,
 * Focus Mode — rendering the same paper for the same note
 * (FRONTEND_SPEC.md §71).
 */

/** CSS custom properties are not in React's `CSSProperties` index signature. */
type PaperStyle = CSSProperties & Record<`--${string}`, string>;

export interface ResolvedNoteAppearance {
  color: NoteColorDefinition;
  style: NoteStyleDefinition;
  /** Inline style carrying the paper surface, ink and rule colors. */
  paperStyle: PaperStyle;
  /** Texture utility class from globals.css, possibly empty. */
  textureClass: string;
}

/**
 * @example
 * const { paperStyle, textureClass } = resolveNoteAppearance(note.appearance);
 * <SurfaceCard style={paperStyle} className={textureClass} />
 */
export function resolveNoteAppearance(
  appearance: NoteAppearance,
): ResolvedNoteAppearance {
  const style = getNoteStyle(appearance.style);

  // A style may pin its own paper (Dark Card, Kraft Paper) — that wins over a
  // stale color left on the note from a previous style.
  const color = getNoteColor(style.forcedColor ?? appearance.color);

  const surface = `var(${color.surfaceVar})`;
  const ink = `var(${color.inkVar})`;
  const edge = `var(${color.edgeVar})`;

  return {
    color,
    style,
    textureClass: style.textureClass,
    paperStyle: {
      backgroundColor: surface,
      color: ink,
      borderColor: edge,
      // Consumed by the decorated designs (src/styles/note-designs.css).
      "--paper-surface": surface,
      "--paper-ink": ink,
      "--paper-edge": edge,
      // Consumed by .tk-paper-lined / .tk-paper-grid.
      "--paper-rule": `color-mix(in srgb, ${edge} 70%, transparent)`,
    },
  };
}
