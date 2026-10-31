"use client";

import { attachmentFromRow } from "@/lib/mappers/attachment";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createId } from "@/lib/utils";
import {
  storagePath,
  validateFile,
  type AttachmentBucket,
} from "@/features/attachments/upload-policy";
import type { UUID } from "@/types/common";
import type { Attachment } from "@/types/note";

/**
 * Supabase Storage reads and writes (IMPLEMENTATION_PLAN.md §16).
 *
 * Same shape as the other repositories: plain functions, no React, and no
 * owner filtering — Row Level Security does that at the database, and a
 * client-side copy would only create a second place to get it wrong, with the
 * copy silently masking a broken policy.
 *
 * An upload is two writes that must not diverge: the object, then the metadata
 * row. `uploadAttachment` removes the object if the row fails, so a failed
 * upload never leaves bytes nobody can see or delete.
 */

/** Thrown for any storage failure, with the message already user-facing. */
export class AttachmentError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "AttachmentError";
  }
}

function fail(action: string, cause: unknown): never {
  console.error(`Supabase: ${action} failed`, cause);
  throw new AttachmentError(
    `Could not ${action}. Check your connection and try again.`,
    cause,
  );
}

/** How long a signed URL lasts. Long enough to read a note, short enough to matter. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function fetchAttachments(noteId: UUID): Promise<Attachment[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (error) fail("load this note's files", error);
  return (data ?? []).map(attachmentFromRow);
}

export interface UploadAttachmentInput {
  file: File;
  noteId: UUID;
  ownerId: UUID;
  bucket: AttachmentBucket;
}

export async function uploadAttachment({
  file,
  noteId,
  ownerId,
  bucket,
}: UploadAttachmentInput): Promise<Attachment> {
  const validation = validateFile(file, bucket);
  if (!validation.ok) throw new AttachmentError(validation.message);

  const supabase = getSupabaseBrowserClient();
  const path = storagePath({ ownerId, noteId, fileName: file.name, id: createId() });

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      // The path already contains a fresh id, so a collision means something is
      // wrong — overwriting would hide it and could clobber another note's file.
      upsert: false,
    });

  if (uploadError) fail(`upload ${file.name}`, uploadError);

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      note_id: noteId,
      owner_id: ownerId,
      bucket,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      file_size: file.size,
      // Every bucket a note writes into is private (migration `0003`), so
      // there is no stable URL to store. `avatars` and `backgrounds` are the
      // public ones, and neither belongs to a note.
      public_url: null,
    })
    .select()
    .single();

  if (error || !data) {
    // The object is already up. Without this, a failed insert leaves bytes with
    // no row — invisible to the app, and billed for.
    await supabase.storage
      .from(bucket)
      .remove([path])
      .catch((cause: unknown) => {
        console.error("Supabase: orphaned object cleanup failed", cause);
      });

    fail(`save ${file.name}`, error);
  }

  return attachmentFromRow(data);
}

/**
 * Removes an attachment: the row, then the object.
 *
 * Row first, deliberately. If the object delete fails the user still sees the
 * attachment gone, and what is left behind is an orphaned file rather than a
 * row pointing at bytes that are no longer there — a broken image in the note
 * is worse than a file nobody can see.
 */
export async function removeAttachment(attachment: Attachment): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachment.id);

  if (error) fail(`remove ${attachment.fileName}`, error);

  const { error: objectError } = await supabase.storage
    .from(attachment.bucket)
    .remove([attachment.storagePath]);

  if (objectError) {
    console.error("Supabase: object delete failed", objectError);
  }
}

/**
 * A URL the browser can load for an attachment.
 *
 * Public objects carry theirs on the row. Private ones are signed on demand,
 * which is why this is async and why the result must not be cached beyond
 * {@link SIGNED_URL_TTL_SECONDS}.
 */
export async function attachmentUrl(attachment: Attachment): Promise<string> {
  if (attachment.publicUrl) return attachment.publicUrl;

  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.storage
    .from(attachment.bucket)
    .createSignedUrl(attachment.storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data) fail(`open ${attachment.fileName}`, error);

  return data.signedUrl;
}
