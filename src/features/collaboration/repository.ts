"use client";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { noteToInsert } from "@/lib/mappers/note";
import { laneToInsert } from "@/lib/mappers/lane";
import type { Json } from "@/types/database";
import type { BoardDiff } from "@/features/notes/sync-engine";
import type { BoardContents } from "@/features/notes/repository";

export const roleSchema = z.enum(["owner", "editor", "viewer"]);
export const peopleSchema = z.array(z.object({ id: z.string().uuid(), name: z.string(), role: roleSchema }));
export const invitesSchema = z.array(z.object({ id: z.string().uuid(), role: z.enum(["editor", "viewer"]), expiresAt: z.string(), accepted: z.boolean(), revoked: z.boolean() }));
export const invitationSchema = z.object({ id: z.string().uuid(), token: z.string().regex(/^[0-9a-f]{64}$/), role: z.enum(["editor", "viewer"]), expiresAt: z.string() });
export async function fetchBoardRole(boardId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc("board_role", { p_board_id: boardId });
  if (error) throw Error("Could not check sharing permissions. Apply migration 0007 if this project has not been upgraded, then retry.");
  return data === null ? null : roleSchema.parse(data);
}
export async function fetchPeople(boardId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc("board_people", { p_board_id: boardId });
  if (error) throw Error("Could not load collaborators. Retry."); return peopleSchema.parse(data);
}
export async function fetchInvitations(boardId: string) {
  const { data, error } = await getSupabaseBrowserClient().rpc("board_invitation_list", { p_board_id: boardId });
  if (error) throw Error("Could not load invitations. Retry."); return invitesSchema.parse(data);
}
export async function createInvitation(boardId: string, role: "viewer" | "editor") {
  const { data, error } = await getSupabaseBrowserClient().rpc("create_board_invitation", { p_board_id: boardId, p_role: role });
  if (error) throw Error("Could not create an invitation. Only the board owner can invite."); return invitationSchema.parse(data);
}
export async function acceptInvitation(token: string): Promise<string> {
  if (!/^[0-9a-f]{64}$/.test(token)) throw Error("This invitation link is invalid.");
  const { data, error } = await getSupabaseBrowserClient().rpc("accept_board_invitation", { p_token: token });
  if (error || !data) throw Error("This invitation expired, was revoked, or has already been used. Ask the owner for a new link."); return data;
}
export async function manageMember(boardId: string, userId: string, role: "viewer" | "editor" | "remove") {
  const { error } = await getSupabaseBrowserClient().rpc("manage_board_member", { p_board_id: boardId, p_user_id: userId, p_role: role });
  if (error) throw Error("Could not change access. Retry.");
}
export async function revokeInvitation(id: string) {
  const { error } = await getSupabaseBrowserClient().rpc("revoke_board_invitation", { p_invite_id: id });
  if (error) throw Error("Could not revoke this invitation. Retry.");
}

/** Compare-and-save only changed records. Conflicts roll back the entire transaction. */
export function sharedChanges(diff: BoardDiff, baseline: BoardContents, ownerId: string) {
  const noteBase = new Map(baseline.notes.map(note => [note.id, note]));
  const laneBase = new Map(baseline.lanes.map(lane => [lane.id, lane]));
  const notes = [...diff.notes.upserts.filter(note => !note.recurrenceSourceId || noteBase.has(note.id)), ...diff.notes.upserts.filter(note => note.recurrenceSourceId && !noteBase.has(note.id))];
  return {
    notes: [...notes.map(note => ({ id: note.id, before: noteBase.has(note.id) ? noteToInsert(noteBase.get(note.id)!) : null, after: noteToInsert(note), tagsBefore: noteBase.get(note.id)?.tagIds ?? [], tagsAfter: note.tagIds })),
      ...diff.notes.deletions.map(id => ({ id, before: noteBase.has(id) ? noteToInsert(noteBase.get(id)!) : null, after: null, tagsBefore: noteBase.get(id)?.tagIds ?? [], tagsAfter: [] }))] as unknown as Json,
    lanes: [...diff.lanes.upserts.map(lane => ({ id: lane.id, before: laneBase.has(lane.id) ? laneToInsert(laneBase.get(lane.id)!, ownerId) : null, after: laneToInsert(lane, ownerId) })),
      ...diff.lanes.deletions.map(id => ({ id, before: laneBase.has(id) ? laneToInsert(laneBase.get(id)!, ownerId) : null, after: null }))] as unknown as Json,
  };
}
export async function saveSharedBoard(boardId: string, diff: BoardDiff, baseline: BoardContents, ownerId: string) {
  const changes = sharedChanges(diff, baseline, ownerId);
  const { error } = await getSupabaseBrowserClient().rpc("save_shared_board", { p_board_id: boardId, p_notes: changes.notes, p_lanes: changes.lanes });
  if (error) throw Error(error.code === "40001" ? "Someone changed this note. Reconnecting will keep both versions." : "Shared changes could not be saved. Your edits remain on this device; retry sync.");
}
