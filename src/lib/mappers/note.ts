import { parseRepeatRule } from "@/features/reminders/schedule";
import { z } from "zod";

import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_STYLE,
} from "@/config/note-styles";
import { PRIORITIES, isMemberOf } from "@/types/common";
import type { Json, NoteRow } from "@/types/database";
import {
  NOTE_COLORS,
  NOTE_STYLES,
  type Note,
  type NoteColorId,
  type NoteStyleId,
  type Subtask,
} from "@/types/note";

/**
 * Translation between `notes` rows and the `Note` domain object.
 *
 * This module is the **only** place the two shapes meet. Everywhere else works
 * in camelCase domain objects, so a column rename is a change here rather than
 * a grep across the codebase.
 *
 * Reads are defensive. A row can be older than this code, newer than this
 * code, or hand-edited in the Supabase dashboard; none of those should render
 * a blank board. Unrecognised enum values fall back to defaults, and malformed
 * `jsonb` degrades to empty rather than throwing.
 */

const subtaskSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  title: z.string(),
  completed: z.boolean(),
  position: z.number(),
});

const subtasksSchema = z.array(subtaskSchema);

/**
 * Parses the `subtasks` jsonb column.
 *
 * Returns `[]` for anything unparseable. A checklist that cannot be read is a
 * bug worth logging, but it must not stop the note itself from rendering.
 */
export function parseSubtasks(value: Json): Subtask[] {
  const parsed = subtasksSchema.safeParse(value);
  if (parsed.success) return parsed.data;

  if (process.env.NODE_ENV !== "production") {
    console.warn("Discarding malformed subtasks payload", parsed.error.issues);
  }

  return [];
}

/** Narrows a stored colour id, falling back to the default. */
function toNoteColor(value: string): NoteColorId {
  return isMemberOf(NOTE_COLORS, value) ? value : DEFAULT_NOTE_COLOR;
}

/** Narrows a stored style id, falling back to the default. */
function toNoteStyle(value: string): NoteStyleId {
  return isMemberOf(NOTE_STYLES, value) ? value : DEFAULT_NOTE_STYLE;
}

export interface NoteFromRowOptions {
  /**
   * Lane to use when `lane_id` is null — which happens for a short window
   * after a lane is deleted, since the column is `on delete set null`.
   */
  fallbackLaneId: string;
  /** Tag ids for this note, from the `note_tags` join. */
  tagIds?: readonly string[];
}

/** Builds a domain `Note` from a database row. */
export function noteFromRow(
  row: NoteRow,
  { fallbackLaneId, tagIds = [] }: NoteFromRowOptions,
): Note {
  return {
    id: row.id,
    boardId: row.board_id,
    ownerId: row.owner_id,
    ...(row.created_by !== undefined ? {createdBy:row.created_by} : {}),
    ...(row.inbox !== undefined ? {inbox:row.inbox} : {}),

    title: row.title,
    content: row.content,
    excerpt: row.excerpt,

    laneId: row.lane_id ?? fallbackLaneId,

    transform: {
      x: row.x,
      y: row.y,
      width: row.width,
      height: row.height,
      rotation: row.rotation,
      zIndex: row.z_index,
    },

    appearance: {
      color: toNoteColor(row.note_color),
      style: toNoteStyle(row.note_style),
      coverUrl: row.cover_url,
    },

    priority: isMemberOf(PRIORITIES, row.priority) ? row.priority : "none",

    completed: row.completed,
    completedAt: row.completed ? row.completed_at : null,
    ...(row.remind_at !== undefined ? { remindAt: row.remind_at } : {}),
    ...(row.repeat_rule !== undefined ? { repeatRule: parseRepeatRule(row.repeat_rule) } : {}),
    ...(row.recurrence_source_id !== undefined ? { recurrenceSourceId: row.recurrence_source_id } : {}),
    pinned: row.pinned,
    locked: row.locked,
    archived: row.archived,
    onCanvas: row.on_canvas,

    subtasks: parseSubtasks(row.subtasks),
    tagIds: [...tagIds],
    categoryId: row.category_id,

    startAt: row.start_at,
    dueAt: row.due_at,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Builds the row for inserting a note.
 *
 * `created_at` and `updated_at` are omitted on purpose: the database defaults
 * and the `set_updated_at` trigger own those, and a client clock that is
 * minutes off would otherwise write a timestamp nothing else agrees with.
 */
export function noteToInsert(note: Note): NoteRow {
  return {
    id: note.id,
    board_id: note.boardId,
    lane_id: note.laneId,
    owner_id: note.ownerId,
    ...(note.createdBy !== undefined ? {created_by:note.createdBy} : {}),
    ...(note.inbox !== undefined ? {inbox:note.inbox} : {}),

    title: note.title,
    content: note.content as Json | null,
    excerpt: note.excerpt,

    x: note.transform.x,
    y: note.transform.y,
    width: note.transform.width,
    height: note.transform.height,
    rotation: note.transform.rotation,
    z_index: note.transform.zIndex,

    note_color: note.appearance.color,
    note_style: note.appearance.style,
    cover_url: note.appearance.coverUrl,

    priority: note.priority,
    subtasks: note.subtasks as unknown as Json,

    completed: note.completed,
    completed_at: note.completed ? note.completedAt ?? null : null,
    ...(note.remindAt !== undefined ? { remind_at: note.remindAt } : {}),
    ...(note.repeatRule !== undefined ? { repeat_rule: note.repeatRule as unknown as Json } : {}),
    ...(note.recurrenceSourceId !== undefined ? { recurrence_source_id: note.recurrenceSourceId } : {}),
    pinned: note.pinned,
    locked: note.locked,
    collapsed: false,
    archived: note.archived,
    on_canvas: note.onCanvas,

    category_id: note.categoryId,
    start_at: note.startAt,
    due_at: note.dueAt,

    created_at: note.createdAt,
    updated_at: note.updatedAt,
    deleted_at: note.deletedAt,
  };
}

/**
 * Builds a partial row for an update.
 *
 * Only the fields that changed are sent. A full-row update would clobber
 * concurrent edits from another device with stale values for fields this
 * client never touched.
 */
export function noteToUpdate(patch: Partial<Note>): Partial<NoteRow> {
  const row: Partial<NoteRow> = {};

  if (patch.remindAt !== undefined) row.remind_at = patch.remindAt;
  if (patch.repeatRule !== undefined) row.repeat_rule = patch.repeatRule as unknown as Json;
  if (patch.recurrenceSourceId !== undefined) row.recurrence_source_id = patch.recurrenceSourceId;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.excerpt !== undefined) row.excerpt = patch.excerpt;
  if (patch.content !== undefined) row.content = patch.content as Json | null;
  if (patch.laneId !== undefined) row.lane_id = patch.laneId;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  if (patch.locked !== undefined) row.locked = patch.locked;
  if (patch.archived !== undefined) row.archived = patch.archived;
  if (patch.onCanvas !== undefined) row.on_canvas = patch.onCanvas;
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
  if (patch.startAt !== undefined) row.start_at = patch.startAt;
  if (patch.dueAt !== undefined) row.due_at = patch.dueAt;
  if (patch.deletedAt !== undefined) row.deleted_at = patch.deletedAt;

  if (patch.completed !== undefined) {
    row.completed = patch.completed;
    // Kept in step with `completed` so "completed today" cannot count a note
    // that was reopened and closed again weeks later.
    row.completed_at = patch.completed ? patch.completedAt ?? new Date().toISOString() : null;
  }

  if (patch.subtasks !== undefined) {
    row.subtasks = patch.subtasks as unknown as Json;
  }

  if (patch.appearance !== undefined) {
    row.note_color = patch.appearance.color;
    row.note_style = patch.appearance.style;
    row.cover_url = patch.appearance.coverUrl;
  }

  if (patch.transform !== undefined) {
    row.x = patch.transform.x;
    row.y = patch.transform.y;
    row.width = patch.transform.width;
    row.height = patch.transform.height;
    row.rotation = patch.transform.rotation;
    row.z_index = patch.transform.zIndex;
  }

  return row;
}
