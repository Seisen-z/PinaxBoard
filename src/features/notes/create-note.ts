import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_SIZE,
  DEFAULT_NOTE_STYLE,
  NOTE_SIZE_PRESETS,
} from "@/config/note-styles";
import { createId } from "@/lib/utils";
import type { Note } from "@/types/note";

export interface CreateBlankNoteInput {
  boardId: string;
  ownerId: string;
  /** The board column the note is created in. */
  laneId: string;
  /** Canvas position. Defaults to the origin; Canvas Mode assigns a real one. */
  x?: number;
  y?: number;
  /** Stacking order. Callers should pass `highestZIndex + 1`. */
  zIndex?: number;
  /** Place the note on the Canvas as well as the Board. */
  onCanvas?: boolean;
}

/**
 * Creates a blank, immediately editable note.
 *
 * This is the "create first, customize afterward" rule in code
 * (PRODUCT_SPEC.md → "Quick Add", FRONTEND_SPEC.md §23): one action yields an
 * Untitled note with empty content. No type, style, category or size is chosen
 * beforehand — every one of those is a post-creation property.
 *
 * The note is returned, not stored: the caller decides whether it goes into
 * local state (Milestone 3) or an optimistic Supabase mutation (Milestone 8).
 *
 * @example
 * const note = createBlankNote({ boardId, ownerId, laneId });
 * addNote(note);
 */
export function createBlankNote({
  boardId,
  ownerId,
  laneId,
  x = 0,
  y = 0,
  zIndex = 1,
  onCanvas = false,
}: CreateBlankNoteInput): Note {
  const now = new Date().toISOString();
  const size = NOTE_SIZE_PRESETS[DEFAULT_NOTE_SIZE];

  return {
    id: createId(),
    boardId,
    ownerId,

    title: "",
    content: null,
    excerpt: "",

    laneId,

    transform: {
      x,
      y,
      width: size.width,
      height: size.height,
      rotation: 0,
      zIndex,
    },

    appearance: {
      color: DEFAULT_NOTE_COLOR,
      style: DEFAULT_NOTE_STYLE,
      coverUrl: null,
    },

    priority: "none",

    completed: false,
    completedAt: null,
    pinned: false,
    locked: false,
    archived: false,
    onCanvas,

    subtasks: [],
    tagIds: [],
    categoryId: null,

    startAt: null,
    dueAt: null,

    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

/** Title shown for a note the user has not named yet. */
export const UNTITLED_NOTE_TITLE = "Untitled";
