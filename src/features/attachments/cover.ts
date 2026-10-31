"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createId } from "@/lib/utils";
import {
  BUCKET_POLICIES,
  storagePath,
  validateFile,
} from "@/features/attachments/upload-policy";
import { AttachmentError, SIGNED_URL_TTL_SECONDS } from "@/features/attachments/repository";
import type { UUID } from "@/types/common";

/**
 * A note's cover image (IMPLEMENTATION_PLAN.md §16).
 *
 * Covers are not attachments. An attachment is a file the note *has*; a cover
 * is part of how the note *looks*, which is why it lives on
 * `Note.appearance.coverUrl` rather than in the attachments list. It also means
 * a note has exactly one, so uploading a second replaces the first — the
 * "replace image" of §16.
 *
 * `coverUrl` holds one of two things:
 *
 *  - an absolute `https://` URL the user supplied, used as-is; or
 *  - a path in the `covers` bucket, which is private and must be signed.
 *
 * A signed URL is never stored. It expires, so a stored one would be a broken
 * image by the time anyone opened the note.
 */

/** True when the stored value is an external URL rather than an uploaded object. */
export function isExternalCover(coverUrl: string): boolean {
  return /^https?:\/\//i.test(coverUrl);
}

/**
 * The URL to put in `src` for a cover.
 *
 * Returns `null` when there is no cover, or when signing fails — the caller
 * renders nothing rather than a broken image.
 */
export async function resolveCoverSource(
  coverUrl: string | null,
): Promise<string | null> {
  if (!coverUrl) return null;
  if (isExternalCover(coverUrl)) return coverUrl;

  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.storage
    .from("covers")
    .createSignedUrl(coverUrl, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    console.error("Supabase: could not sign a cover URL", error);
    return null;
  }

  return data.signedUrl;
}

export interface UploadCoverInput {
  file: File;
  noteId: UUID;
  ownerId: UUID;
  /** The note's current cover, removed once the new one is up. */
  previousCoverUrl: string | null;
}

/**
 * Uploads a cover and returns the path to store.
 *
 * The previous object is deleted **after** the new one is in place: if the
 * upload fails, the note keeps the cover it had rather than losing both.
 */
export async function uploadCover({
  file,
  noteId,
  ownerId,
  previousCoverUrl,
}: UploadCoverInput): Promise<string> {
  const validation = validateFile(file, "covers");
  if (!validation.ok) throw new AttachmentError(validation.message);

  const supabase = getSupabaseBrowserClient();
  const path = storagePath({ ownerId, noteId, fileName: file.name, id: createId() });

  const { error } = await supabase.storage.from("covers").upload(path, file, {
    contentType: file.type || BUCKET_POLICIES.covers.mimeTypes?.[0] || "image/png",
    upsert: false,
  });

  if (error) {
    console.error("Supabase: cover upload failed", error);
    throw new AttachmentError(
      `Could not upload ${file.name}. Check your connection and try again.`,
      error,
    );
  }

  await removeCoverObject(previousCoverUrl);

  return path;
}

/**
 * Deletes an uploaded cover's object, if there is one.
 *
 * External URLs are not ours to delete, and a failure here is logged rather
 * than thrown: the user asked to change the cover, and they have.
 */
export async function removeCoverObject(coverUrl: string | null): Promise<void> {
  if (!coverUrl || isExternalCover(coverUrl)) return;

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from("covers").remove([coverUrl]);

  if (error) console.error("Supabase: cover delete failed", error);
}
