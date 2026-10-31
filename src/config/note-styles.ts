import type {
  NoteColorId,
  NoteSizeId,
  NoteStyleId,
} from "@/types/note";

/**
 * Note appearance catalogue (FRONTEND_SPEC.md §14, §15, §24).
 *
 * Every entry points at design tokens from `src/styles/tokens.css` — no
 * component may invent its own paper color or texture.
 */

export interface NoteColorDefinition {
  id: NoteColorId;
  label: string;
  /** CSS custom property holding the paper surface color. */
  surfaceVar: string;
  /** CSS custom property holding a readable ink color for that surface. */
  inkVar: string;
  /** CSS custom property for the slightly darker paper edge. */
  edgeVar: string;
}

export const NOTE_COLOR_DEFINITIONS: readonly NoteColorDefinition[] = [
  { id: "yellow", label: "Warm Yellow", surfaceVar: "--paper-yellow", inkVar: "--paper-yellow-ink", edgeVar: "--paper-yellow-edge" },
  { id: "pink", label: "Soft Pink", surfaceVar: "--paper-pink", inkVar: "--paper-pink-ink", edgeVar: "--paper-pink-edge" },
  { id: "blue", label: "Ice Blue", surfaceVar: "--paper-blue", inkVar: "--paper-blue-ink", edgeVar: "--paper-blue-edge" },
  { id: "mint", label: "Mint", surfaceVar: "--paper-mint", inkVar: "--paper-mint-ink", edgeVar: "--paper-mint-edge" },
  { id: "lavender", label: "Lavender", surfaceVar: "--paper-lavender", inkVar: "--paper-lavender-ink", edgeVar: "--paper-lavender-edge" },
  { id: "peach", label: "Peach", surfaceVar: "--paper-peach", inkVar: "--paper-peach-ink", edgeVar: "--paper-peach-edge" },
  { id: "cream", label: "Neutral Cream", surfaceVar: "--paper-cream", inkVar: "--paper-cream-ink", edgeVar: "--paper-cream-edge" },
  { id: "kraft", label: "Kraft", surfaceVar: "--paper-kraft", inkVar: "--paper-kraft-ink", edgeVar: "--paper-kraft-edge" },
  { id: "slate", label: "Dark Slate", surfaceVar: "--paper-slate", inkVar: "--paper-slate-ink", edgeVar: "--paper-slate-edge" },
] as const;

const COLOR_BY_ID = new Map<NoteColorId, NoteColorDefinition>(
  NOTE_COLOR_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const DEFAULT_NOTE_COLOR: NoteColorId = "cream";

/**
 * Resolves a paper color, falling back to the default rather than throwing —
 * an unknown color persisted by an older client must never blank a board.
 */
export function getNoteColor(id: NoteColorId): NoteColorDefinition {
  const definition = COLOR_BY_ID.get(id);
  if (definition) return definition;

  // `DEFAULT_NOTE_COLOR` is always present in the catalogue above.
  return COLOR_BY_ID.get(DEFAULT_NOTE_COLOR) as NoteColorDefinition;
}

export interface NoteStyleDefinition {
  id: NoteStyleId;
  label: string;
  /** Utility classes from globals.css that paint the paper texture. */
  textureClass: string;
  /** Style-specific color override, used when the style implies its paper. */
  forcedColor?: NoteColorId;
}

export const NOTE_STYLE_DEFINITIONS: readonly NoteStyleDefinition[] = [
  { id: "sticky", label: "Sticky Note", textureClass: "tk-paper-texture" },
  { id: "notebook", label: "Notebook", textureClass: "tk-paper-lined" },
  { id: "lined", label: "Lined Paper", textureClass: "tk-paper-lined" },
  { id: "grid", label: "Grid Paper", textureClass: "tk-paper-grid" },
  { id: "minimal", label: "Minimal", textureClass: "" },
  { id: "dark", label: "Dark Card", textureClass: "", forcedColor: "slate" },
  { id: "kraft", label: "Kraft Paper", textureClass: "tk-paper-texture", forcedColor: "kraft" },
] as const;

const STYLE_BY_ID = new Map<NoteStyleId, NoteStyleDefinition>(
  NOTE_STYLE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const DEFAULT_NOTE_STYLE: NoteStyleId = "sticky";

/** Resolves a paper style, falling back to the default for unknown ids. */
export function getNoteStyle(id: NoteStyleId): NoteStyleDefinition {
  const definition = STYLE_BY_ID.get(id);
  if (definition) return definition;

  return STYLE_BY_ID.get(DEFAULT_NOTE_STYLE) as NoteStyleDefinition;
}

/** Preset footprints in canvas units (FRONTEND_SPEC.md §14). */
export const NOTE_SIZE_PRESETS: Readonly<
  Record<NoteSizeId, { width: number; height: number }>
> = {
  small: { width: 220, height: 180 },
  medium: { width: 280, height: 240 },
  large: { width: 340, height: 320 },
  wide: { width: 420, height: 260 },
  tall: { width: 280, height: 420 },
};

export const DEFAULT_NOTE_SIZE: NoteSizeId = "medium";
