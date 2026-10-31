"use client";

import { categoryFromRow, tagFromRow } from "@/lib/mappers/taxonomy";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, Tag } from "@/types/note";

/**
 * Supabase reads and writes for tags and categories
 * (IMPLEMENTATION_PLAN.md §17).
 *
 * Same shape as the other repositories: plain functions, and no owner
 * filtering — Row Level Security does that at the database, and a client-side
 * copy would only be a second place to get it wrong.
 */

export class TaxonomyError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "TaxonomyError";
  }
}

function fail(action: string, cause: unknown): never {
  console.error(`Supabase: ${action} failed`, cause);
  throw new TaxonomyError(
    `Could not ${action}. Check your connection and try again.`,
    cause,
  );
}

/* ------------------------------------------------------------------ *
 * Tags
 * ------------------------------------------------------------------ */

export async function fetchTags(workspaceId: string): Promise<Tag[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) fail("load your tags", error);
  return (data ?? []).map(tagFromRow);
}

export interface CreateTagInput {
  workspaceId: string;
  ownerId: string;
  name: string;
  color: string | null;
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({
      workspace_id: input.workspaceId,
      owner_id: input.ownerId,
      name: input.name,
      color: input.color,
    })
    .select()
    .single();

  if (error || !data) fail(`create the tag “${input.name}”`, error);
  return tagFromRow(data);
}

export async function renameTag(tagId: string, name: string): Promise<Tag> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("tags")
    .update({ name })
    .eq("id", tagId)
    .select()
    .single();

  if (error || !data) fail("rename that tag", error);
  return tagFromRow(data);
}

/**
 * Deletes a tag everywhere.
 *
 * `note_tags` cascades, so the tag also leaves every note that carried it —
 * which is what deleting a tag means. Nothing is done to the notes themselves.
 */
export async function deleteTag(tagId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) fail("delete that tag", error);
}

/* ------------------------------------------------------------------ *
 * Tag ↔ note links
 * ------------------------------------------------------------------ */

/**
 * Replaces a note's tag links with exactly this set.
 *
 * Delete-then-insert rather than a diff. The set is small — a note carries a
 * handful of tags — and computing a diff would mean first reading what the
 * server currently has, which is a round trip to save an insert of three rows.
 *
 * Both statements are issued even when `tagIds` is empty, because clearing
 * every tag from a note is a real edit.
 */
export async function setNoteTags(
  noteId: string,
  tagIds: readonly string[],
): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error: clearError } = await supabase
    .from("note_tags")
    .delete()
    .eq("note_id", noteId);

  if (clearError) fail("update this note's tags", clearError);

  if (tagIds.length === 0) return;

  const { error } = await supabase
    .from("note_tags")
    .insert(tagIds.map((tagId) => ({ note_id: noteId, tag_id: tagId })));

  if (error) fail("update this note's tags", error);
}

/** Every tag link for a board's notes, as `noteId -> tagIds`. */
export async function fetchNoteTags(
  noteIds: readonly string[],
): Promise<Map<string, string[]>> {
  const links = new Map<string, string[]>();
  if (noteIds.length === 0) return links;

  const supabase = getSupabaseBrowserClient();

  for (let start = 0; start < noteIds.length; start += 100) {
    const ids = noteIds.slice(start, start + 100); let offset = 0; let expected: number | null = null;
    do {
      const { data, error, count } = await supabase.from("note_tags").select("*", { count: "exact" }).in("note_id", [...ids]).order("note_id").order("tag_id").range(offset, offset + 499);
      if (error) fail("load note tags", error);
      if (count === null || expected !== null && expected !== count) fail("load stable note tags; retry", new Error("Tag count changed or was unavailable"));
      expected = count;
      if (!data?.length && offset < count) fail("load all note tags", new Error("An incomplete page was returned"));
      for (const row of data ?? []) { const existing = links.get(row.note_id); if (existing) existing.push(row.tag_id); else links.set(row.note_id, [row.tag_id]); }
      offset += data?.length ?? 0;
    } while (offset < expected);
  }

  return links;
}

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export async function fetchCategories(workspaceId: string): Promise<Category[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });

  if (error) fail("load your categories", error);
  return (data ?? []).map(categoryFromRow);
}

export interface CreateCategoryInput {
  workspaceId: string;
  ownerId: string;
  name: string;
  color: string | null;
  emoji: string | null;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      workspace_id: input.workspaceId,
      owner_id: input.ownerId,
      name: input.name,
      color: input.color,
      emoji: input.emoji,
      icon: null,
    })
    .select()
    .single();

  if (error || !data) fail(`create the category “${input.name}”`, error);
  return categoryFromRow(data);
}

export interface UpdateCategoryInput {
  categoryId: string;
  name?: string;
  color?: string | null;
  emoji?: string | null;
}

export async function updateCategory({
  categoryId,
  ...patch
}: UpdateCategoryInput): Promise<Category> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("categories")
    .update(patch)
    .eq("id", categoryId)
    .select()
    .single();

  if (error || !data) fail("update that category", error);
  return categoryFromRow(data);
}

/**
 * Deletes a category.
 *
 * `notes.category_id` has no foreign key to clean up after it, so the notes
 * are cleared explicitly — otherwise they would keep pointing at a category
 * that no longer exists and render as uncategorised anyway, but with a stale
 * id that the next filter would quietly never match.
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error: clearError } = await supabase
    .from("notes")
    .update({ category_id: null })
    .eq("category_id", categoryId);

  if (clearError) fail("delete that category", clearError);

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) fail("delete that category", error);
}

/** Bounded tag-link batches avoid two HTTP requests per note during bulk import/recovery. */
export async function setNoteTagsBatch(notes: readonly {id:string;tagIds:readonly string[]}[]):Promise<void> {
 const client=getSupabaseBrowserClient();
 for(let start=0;start<notes.length;start+=100){const batch=notes.slice(start,start+100);const {error:clearError}=await client.from("note_tags").delete().in("note_id",batch.map((note)=>note.id));if(clearError)fail("update note tags",clearError);
  const links=batch.flatMap((note)=>[...new Set(note.tagIds)].map((tagId)=>({note_id:note.id,tag_id:tagId})));
  if(links.length){const {error}=await client.from("note_tags").insert(links);if(error)fail("save note tags",error);}
 }
}
