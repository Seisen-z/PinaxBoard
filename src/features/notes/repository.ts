"use client";

import { laneFromRow, laneToInsert } from "@/lib/mappers/lane";
import { noteFromRow, noteToInsert } from "@/lib/mappers/note";
import { fetchNoteTags, setNoteTagsBatch } from "@/features/taxonomy/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Lane } from "@/types/lane";
import type { NoteRow } from "@/types/database";
import type { Note } from "@/types/note";

/**
 * Supabase reads and writes for notes and lanes (IMPLEMENTATION_PLAN.md §14).
 *
 * As with the workspace repository, nothing here filters by owner — Row Level
 * Security does that at the database, and a client-side copy would be a second
 * place to get it wrong while masking a broken policy.
 */

export class NoteRepositoryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "NoteRepositoryError";
  }
}

function fail(action: string, cause: unknown): never {
  console.error(`Supabase: ${action} failed`, cause);
  throw new NoteRepositoryError(
    `Could not ${action}. Your changes are safe on this device and will retry.`,
    cause,
  );
}

export interface BoardContents {
  lanes: Lane[];
  notes: Note[];
}

/**
 * Loads everything one board needs in two queries.
 *
 * Lanes come first because a note's `lane_id` can be null for a moment after a
 * column is deleted, and `noteFromRow` needs a fallback column to put it in —
 * otherwise a rehomed note would vanish from the board instead of appearing in
 * the first column.
 */
export async function fetchBoardContents(boardId: string): Promise<BoardContents> {
  const supabase = getSupabaseBrowserClient();

  const { data: laneRows, error: laneError } = await supabase
    .from("lanes")
    .select("*")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  if (laneError) fail("load this board's columns", laneError);

  const lanes = (laneRows ?? []).map(laneFromRow);
  const fallbackLaneId = lanes[0]?.id ?? "";

  const noteRows: NoteRow[] = []; let expected: number | null = null;
  do {
    const { data, error, count } = await supabase.from("notes").select("*", { count: "exact" }).eq("board_id", boardId).order("id", { ascending: true }).range(noteRows.length, noteRows.length + 499);
    if (error) fail("load this board's notes", error);
    if (count === null || expected !== null && expected !== count) fail("load a stable board snapshot; retry because the board changed", new Error("Note count changed or was unavailable"));
    expected = count;
    if (!data?.length && noteRows.length < count) fail("load all board notes", new Error("An incomplete page was returned"));
    noteRows.push(...(data ?? []));
  } while (noteRows.length < expected);
  if (new Set(noteRows.map((row) => row.id)).size !== noteRows.length) fail("load a stable board snapshot", new Error("Duplicate page boundary"));

  /*
   * Tag links are a separate table, so they need their own read. Fetched for
   * the whole board in one query rather than per note: `noteFromRow` takes
   * them as an option precisely so the join does not have to happen row by row.
   */
  const rows = noteRows ?? [];
  const tagLinks = await fetchNoteTags(rows.map((row) => row.id));

  const notes = rows.map((row) =>
    noteFromRow(row, { fallbackLaneId, tagIds: tagLinks.get(row.id) ?? [] }),
  );

  return { lanes, notes };
}

/**
 * Writes notes, inserting or updating as needed.
 *
 * A single `upsert` rather than a diff of inserts and updates: the sync engine
 * knows a note changed but not whether the server has seen it yet, and
 * `on conflict do update` answers that question at the database instead of
 * costing a round trip to ask.
 */
export async function upsertNotes(notes: readonly Note[], newRecurringIds: readonly string[] = [], tagChangedIds: readonly string[] = notes.map((note) => note.id)): Promise<void> {
  if (notes.length === 0) return;

  const supabase = getSupabaseBrowserClient();
  if (newRecurringIds.length) {
    const fresh = new Set(newRecurringIds);
    const ordered = [...notes.filter((note) => !fresh.has(note.id)), ...notes.filter((note) => fresh.has(note.id))];
    const values = ordered.map((note) => ({ ...noteToInsert(note), tag_ids: note.tagIds }));
    // One database transaction: parent completion, successor insert and tag links.
    const { error } = await supabase.rpc("save_recurring_note_batch", { note_values: values as unknown as import("@/types/database").Json, generated_ids: [...newRecurringIds] });
    if (error) fail("save recurring occurrences", error);
    return;
  }
  const { error } = await supabase.from("notes").upsert(notes.map(noteToInsert), { onConflict: "id" });
  if (error) fail("save your notes", error);
  const changedTags = new Set(tagChangedIds);
  await setNoteTagsBatch(notes.filter((note) => changedTags.has(note.id)));

}

/**
 * Soft-deletes notes.
 *
 * `deleted_at` rather than a real delete, so Trash and Restore (Milestone 24)
 * have something to restore — and so a sync bug cannot destroy work.
 */
export async function deleteNotes(noteIds: readonly string[]): Promise<void> {
  if (noteIds.length === 0) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", [...noteIds]);

  if (error) fail("delete those notes", error);
}

export async function upsertLanes(
  lanes: readonly Lane[],
  ownerId: string,
): Promise<void> {
  if (lanes.length === 0) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("lanes")
    .upsert(
      lanes.map((lane) => laneToInsert(lane, ownerId)),
      { onConflict: "id" },
    );

  if (error) fail("save your columns", error);
}

/**
 * Deletes columns outright.
 *
 * Unlike notes these are hard deletes: a column holds no content of its own,
 * and its notes have already been rehomed by the time this runs.
 */
export async function deleteLanes(laneIds: readonly string[]): Promise<void> {
  if (laneIds.length === 0) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("lanes").delete().in("id", [...laneIds]);

  if (error) fail("delete those columns", error);
}
