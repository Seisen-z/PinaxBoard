import type { AttachmentBucket } from "@/features/attachments/upload-policy";
import type { ISODateString, Priority, UUID } from "@/types/common";

/**
 * Visual paper families a note may wear (FRONTEND_SPEC.md §14, §24).
 * A note is one flexible notepad — these are appearance properties applied
 * *after* creation, never a creation-time "type" choice (PRODUCT_SPEC.md →
 * "Create First, Customize Afterward").
 */
export const NOTE_STYLES = [
  "sticky",
  "notebook",
  "lined",
  "grid",
  "minimal",
  "dark",
  "kraft",
  // Decorated designs (src/styles/note-designs.css).
  "spiral",
  "stitched",
  "wave",
  "tape",
  "clip",
  "pad",
  "cloud",
  "hand",
  "bunting",
  "floral",
] as const;
export type NoteStyleId = (typeof NOTE_STYLES)[number];

/** Paper color families (FRONTEND_SPEC.md §15). */
export const NOTE_COLORS = [
  "yellow",
  "pink",
  "blue",
  "mint",
  "lavender",
  "peach",
  "cream",
  "kraft",
  "slate",
] as const;
export type NoteColorId = (typeof NOTE_COLORS)[number];

/** Preset note footprints (FRONTEND_SPEC.md §14). */
export const NOTE_SIZES = ["small", "medium", "large", "wide", "tall"] as const;
export type NoteSizeId = (typeof NOTE_SIZES)[number];

/**
 * Free canvas placement for a note (PRODUCT_SPEC.md → "Coordinate Model").
 * Kept separate from the note record's semantic fields so canvas interactions
 * can update a transform without touching content.
 */
export interface NoteTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees. Positive values rotate clockwise. */
  rotation: number;
  zIndex: number;
}

/** A single checklist row inside a note (PRODUCT_SPEC.md → "Nested Tasks"). */
export interface Subtask {
  id: UUID;
  noteId: UUID;
  title: string;
  completed: boolean;
  /** Sort order within the note, ascending. */
  position: number;
}

/** A free-form label, scoped to a workspace (PRODUCT_SPEC.md → "Tags"). */
export interface Tag {
  id: UUID;
  workspaceId: UUID;
  name: string;
  /** CSS color, or `null` to fall back to the neutral pill styling. */
  color: string | null;
}

/** A user-defined grouping with an icon (PRODUCT_SPEC.md → "Categories"). */
export interface Category {
  id: UUID;
  workspaceId: UUID;
  name: string;
  color: string | null;
  icon: string | null;
  emoji: string | null;
}

/** File metadata; the binary itself lives in Supabase Storage. */
export interface Attachment {
  id: UUID;
  noteId: UUID;
  ownerId: UUID;
  /** Which Storage bucket holds the object. */
  bucket: AttachmentBucket;
  /** Path within the bucket. Always begins with the owner's user id. */
  storagePath: string;
  /** The name the user's file had, preserved for display and download. */
  fileName: string;
  mimeType: string;
  /** Bytes. */
  fileSize: number;
  /**
   * Set only for objects in a public bucket — which, for a note, is none of
   * them. A private object is read through a signed URL that expires, so it
   * must never be stored. See `attachmentUrl` in the attachments repository.
   */
  publicUrl: string | null;
  createdAt: ISODateString;
}

/**
 * Post-creation appearance properties (FRONTEND_SPEC.md §14–§16, §24).
 * Every field has a default so a freshly created blank note is valid.
 */
export interface NoteAppearance {
  color: NoteColorId;
  style: NoteStyleId;
  /** Optional cover image URL shown above the note content. */
  coverUrl: string | null;
}

/**
 * The central Tackly entity. One note is a flexible mini-document that may
 * also behave as a task.
 *
 * `content` holds Tiptap JSON once the rich editor lands (Milestone 9); it is
 * `unknown` until then so no component can accidentally depend on a shape that
 * has not been designed yet.
 */
export interface Note {
  /** Author differs from board owner on shared boards. */
  createdBy?: string | null;
  /** Quick capture waiting to be organized. */
  inbox?: boolean;
  id: UUID;
  boardId: UUID;
  ownerId: UUID;

  title: string;
  content: unknown;
  /** Plain-text projection of `content`, used for search and card previews. */
  excerpt: string;

  /** The board column this note sits in. See `src/types/lane.ts`. */
  laneId: UUID;

  transform: NoteTransform;
  appearance: NoteAppearance;

  priority: Priority;

  completed: boolean;
  /** Actual completion event; absent/null for legacy records with unknown history. */
  completedAt?: ISODateString | null;
  remindAt?: ISODateString | null;
  repeatRule?: import("@/features/reminders/schedule").RepeatRule | null;
  recurrenceSourceId?: UUID | null;
  pinned: boolean;
  locked: boolean;
  archived: boolean;

  /**
   * Whether this note is pinned up on the Canvas.
   *
   * The Board and the Canvas are different surfaces, not two renderings of the
   * same list. Every note belongs to a column and appears on the Board; only
   * the ones the user deliberately puts on the Canvas appear there. An
   * infinite desk covered with every note you have ever written is not a desk,
   * it is a landfill.
   *
   * This is a flag on the one note record, never a copy — moving a note to the
   * Canvas and editing it there changes the same note the Board shows.
   */
  onCanvas: boolean;

  subtasks: Subtask[];
  tagIds: UUID[];
  categoryId: UUID | null;

  startAt: ISODateString | null;
  dueAt: ISODateString | null;

  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

/**
 * Completion progress derived from a note's checklist.
 * Returns `null` when the note has no subtasks, so callers can distinguish
 * "no checklist" from "0% complete".
 */
export function getSubtaskProgress(
  note: Pick<Note, "subtasks">,
): { completed: number; total: number; ratio: number } | null {
  const total = note.subtasks.length;
  if (total === 0) return null;

  const completed = note.subtasks.filter((subtask) => subtask.completed).length;
  return { completed, total, ratio: completed / total };
}
