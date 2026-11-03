"use client";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { noteToInsert } from "@/lib/mappers/note";
import { laneToInsert } from "@/lib/mappers/lane";
import type { Json } from "@/types/database";
import type { BoardDiff } from "@/features/notes/sync-engine";
import type { BoardContents } from "@/features/notes/repository";

export const shareScopeSchema = z.enum(["board", "canvas", "notes"]);
export const roleSchema = z.enum(["owner", "editor", "viewer"]);
export const peopleSchema = z.array(z.object({ id: z.string().uuid(), name: z.string(), role: roleSchema }));
export const invitesSchema = z.array(z.object({ id: z.string().uuid(), role: z.enum(["editor", "viewer"]), expiresAt: z.string(), accepted: z.boolean(), revoked: z.boolean(), email: z.string().nullish(), scope: shareScopeSchema.optional(), noteCount: z.number().optional() }));
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
export type ShareScope = z.infer<typeof shareScopeSchema>;
/** Plain-language description of what a share covers. */
export function describeScope(scope: ShareScope, noteCount: number): string {
  return scope === "board" ? "Whole board" : scope === "canvas" ? "Canvas only" : `${noteCount} selected ${noteCount === 1 ? "note" : "notes"}`;
}
export interface InvitationOptions { /** Days until the link expires (1-365). */ days?: number; /** Restricts acceptance to this email address. */ email?: string | null; /** What the invitee can see. Defaults to the whole board. */ scope?: ShareScope; /** Required when `scope` is "notes". */ noteIds?: readonly string[] }
export async function createInvitation(boardId: string, role: "viewer" | "editor", options: InvitationOptions = {}) {
  const { data, error } = await getSupabaseBrowserClient().rpc("create_board_invitation", { p_board_id: boardId, p_role: role, p_days: options.days ?? 7, ...(options.email ? { p_email: options.email } : {}), ...(options.scope && options.scope !== "board" ? { p_scope: options.scope } : {}), ...(options.scope === "notes" ? { p_note_ids: [...(options.noteIds ?? [])] } : {}) });
  if (error) throw Error(/valid email|between 1 and 365|Choose between|scope/i.test(error.message) ? error.message : "Could not create an invitation. Only the board owner can invite. If this project predates migration 0012, apply it first."); return invitationSchema.parse(data);
}

export const sharedOverviewSchema = z.object({
  incoming: z.array(z.object({ boardId: z.string().uuid(), boardName: z.string(), workspaceId: z.string().uuid(), ownerName: z.string(), role: roleSchema, scope: shareScopeSchema, noteCount: z.number(), joinedAt: z.string() })),
  pending: z.array(z.object({ id: z.string().uuid(), boardName: z.string(), ownerName: z.string(), role: z.enum(["editor", "viewer"]), scope: shareScopeSchema, noteCount: z.number(), expiresAt: z.string() })),
  sent: z.array(z.object({ id: z.string().uuid(), boardId: z.string().uuid(), boardName: z.string(), role: z.enum(["editor", "viewer"]), scope: shareScopeSchema, noteCount: z.number(), email: z.string().nullable(), expiresAt: z.string(), createdAt: z.string(), accepted: z.boolean(), revoked: z.boolean(), acceptedByName: z.string().nullable() })),
});
export type SharedOverview = z.infer<typeof sharedOverviewSchema>;
export async function fetchSharedOverview(): Promise<SharedOverview> {
  const { data, error } = await getSupabaseBrowserClient().rpc("shared_overview");
  if (error) throw Error("Could not load shared boards. Apply migration 0012 if this project has not been upgraded, then retry.");
  return sharedOverviewSchema.parse(data);
}
export async function acceptInvitationById(id: string): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc("accept_invitation_by_id", { p_invite_id: id });
  if (error || !data) throw Error("This invitation expired, was revoked, or has already been used."); return data;
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
