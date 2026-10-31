"use client";

import { createDefaultLanes } from "@/stores/lane-store";
import { boardFromRow, workspaceFromRow } from "@/lib/mappers/workspace";
import { laneToInsert } from "@/lib/mappers/lane";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Board } from "@/types/board";
import type { Workspace } from "@/types/workspace";

/**
 * Supabase reads and writes for workspaces and boards
 * (IMPLEMENTATION_PLAN.md §13).
 *
 * Kept separate from the TanStack Query hooks so the data access is plain,
 * testable functions rather than something only reachable from a React tree.
 *
 * None of these filter by owner. Row Level Security does that at the database,
 * and duplicating it here would create two places to get it wrong — with the
 * client-side copy silently masking a broken policy
 * (PRODUCT_SPEC.md → "Supabase Security").
 */

/** Thrown for any PostgREST failure, with the message already user-facing. */
export class RepositoryError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "RepositoryError";
  }
}

function fail(action: string, cause: unknown): never {
  // The raw PostgREST message goes to the console for debugging; the user sees
  // something they can act on (PRODUCT_SPEC.md → "Error Handling").
  console.error(`Supabase: ${action} failed`, cause);
  throw new RepositoryError(`Could not ${action}. Check your connection and try again.`, cause);
}

/* ------------------------------------------------------------------ *
 * Workspaces
 * ------------------------------------------------------------------ */

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .is("archived_at", null)
    .order("position", { ascending: true });

  if (error) fail("load your workspaces", error);
  return (data ?? []).map(workspaceFromRow);
}

export interface CreateWorkspaceInput {
  name: string;
  ownerId: string;
  /** Appended after the existing workspaces. */
  position: number;
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      icon: null,
      color: null,
      position: input.position,
      archived_at: null,
    })
    .select("*")
    .single();

  if (error || !data) fail("create the workspace", error);
  return workspaceFromRow(data);
}

export async function renameWorkspace(
  workspaceId: string,
  name: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ name })
    .eq("id", workspaceId);

  if (error) fail("rename the workspace", error);
}

/**
 * Archives rather than deletes.
 *
 * A workspace holds every board and note under it; a stray menu click must not
 * be able to destroy that (FRONTEND_SPEC.md §75). Permanent deletion is a
 * separate, confirmed action in a later milestone.
 */
export async function archiveWorkspace(workspaceId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("workspaces")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", workspaceId);

  if (error) fail("archive the workspace", error);
}

/* ------------------------------------------------------------------ *
 * Boards
 * ------------------------------------------------------------------ */

export async function fetchBoards(workspaceId: string): Promise<Board[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("position", { ascending: true });

  if (error) fail("load your boards", error);
  return (data ?? []).map(boardFromRow);
}

export interface CreateBoardInput {
  workspaceId: string;
  ownerId: string;
  name: string;
  position: number;
}

/**
 * Creates a board together with its starting columns.
 *
 * The lanes are inserted in the same call path because a board with no columns
 * has nowhere to put a note — landing on one would be a dead end.
 */
export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("boards")
    .insert({
      workspace_id: input.workspaceId,
      owner_id: input.ownerId,
      name: input.name,
      icon: null,
      color: null,
      layout_mode: "board",
      background: {},
      settings: {},
      position: input.position,
      archived_at: null,
    })
    .select("*")
    .single();

  if (error || !data) fail("create the board", error);

  const board = boardFromRow(data);

  const { error: laneError } = await supabase
    .from("lanes")
    .insert(
      createDefaultLanes(board.id).map((lane) =>
        // Seeded lane ids are fixed strings, not UUIDs, so the database
        // generates real ones.
        withoutId(laneToInsert(lane, input.ownerId)),
      ),
    );

  // The board exists either way; report the failure rather than pretending the
  // whole creation failed and leaving an orphan behind.
  if (laneError) {
    console.error("Supabase: seeding board columns failed", laneError);
    throw new RepositoryError(
      "The board was created but its columns could not be added. Open it and add a column.",
      laneError,
    );
  }

  return board;
}

export async function renameBoard(boardId: string, name: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("boards").update({ name }).eq("id", boardId);

  if (error) fail("rename the board", error);
}

export async function archiveBoard(boardId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("boards")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", boardId);

  if (error) fail("archive the board", error);
}

/** Drops a client-side id so the database generates one. */
function withoutId<T extends { id: string }>(row: T): Omit<T, "id"> {
  const copy: Partial<T> = { ...row };
  delete copy.id;
  return copy as Omit<T, "id">;
}
