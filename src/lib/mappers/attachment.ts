import {
  ATTACHMENT_BUCKETS,
  type AttachmentBucket,
} from "@/features/attachments/upload-policy";
import type { AttachmentRow } from "@/types/database";
import type { Attachment } from "@/types/note";

/**
 * Row ↔ domain for attachments.
 *
 * Like the other mappers, this is the only place snake_case meets camelCase.
 */

/**
 * Narrows the row's `bucket` text to a known bucket.
 *
 * The column is `text` with a check constraint, so the database already
 * rejects anything else — but the generated row type cannot say so, and a
 * cast here would be a lie that surfaces later as a failed upload against a
 * bucket that does not exist. Falling back to `attachments` keeps a row from a
 * future migration readable instead of crashing the note it belongs to.
 */
function toBucket(value: string): AttachmentBucket {
  const known = ATTACHMENT_BUCKETS.find((bucket) => bucket === value);
  if (known) return known;

  console.error(`Supabase: unknown attachment bucket "${value}"`);
  return "attachments";
}

export function attachmentFromRow(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    noteId: row.note_id,
    ownerId: row.owner_id,
    bucket: toBucket(row.bucket),
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    publicUrl: row.public_url,
    createdAt: row.created_at,
  };
}
