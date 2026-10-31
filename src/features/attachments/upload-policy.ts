import type { UUID } from "@/types/common";

/**
 * What may be uploaded, and where it goes (IMPLEMENTATION_PLAN.md §16).
 *
 * Pure functions, no Supabase import: the rules are worth testing on their own,
 * and a validation bug that only shows up against a live project is a bug that
 * ships. The same limits are declared on the buckets themselves in migration
 * `0003`, which is the one that actually enforces them — these exist so the
 * user gets a sentence they can act on instead of a 413.
 */

export const ATTACHMENT_BUCKETS = [
  "note-images",
  "note-videos",
  "attachments",
  "covers",
] as const;

export type AttachmentBucket = (typeof ATTACHMENT_BUCKETS)[number];

export interface BucketPolicy {
  bucket: AttachmentBucket;
  /** Bytes. Mirrors `file_size_limit` on the bucket. */
  maxBytes: number;
  /**
   * Accepted MIME types, or `null` for "anything".
   *
   * `attachments` is the deliberate `null`: it is the bucket for the file a
   * user actually has, and an allowlist there would reject the `.sketch` or
   * `.ai` the note is about.
   */
  mimeTypes: readonly string[] | null;
  /** For a file input's `accept`, and for the error message. */
  label: string;
}

const MB = 1024 * 1024;

export const BUCKET_POLICIES: Readonly<Record<AttachmentBucket, BucketPolicy>> = {
  "note-images": {
    bucket: "note-images",
    maxBytes: 10 * MB,
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif",
      "image/gif",
      "image/svg+xml",
    ],
    label: "image",
  },
  "note-videos": {
    bucket: "note-videos",
    maxBytes: 50 * MB,
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    label: "video",
  },
  covers: {
    bucket: "covers",
    maxBytes: 10 * MB,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/avif"],
    label: "cover image",
  },
  attachments: {
    bucket: "attachments",
    maxBytes: 25 * MB,
    mimeTypes: null,
    label: "file",
  },
};

/** The bucket a file belongs in, from its type. */
export function bucketForFile(file: { type: string }): AttachmentBucket {
  if (BUCKET_POLICIES["note-images"].mimeTypes?.includes(file.type)) {
    return "note-images";
  }
  if (BUCKET_POLICIES["note-videos"].mimeTypes?.includes(file.type)) {
    return "note-videos";
  }
  return "attachments";
}

export interface ValidationFailure {
  ok: false;
  /** Already user-facing — shown as-is (PRODUCT_SPEC.md → "Error Handling"). */
  message: string;
}

export type ValidationResult = { ok: true } | ValidationFailure;

/** Human-readable size, for error messages. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;

  const mb = bytes / MB;
  // One decimal below 10MB, where the difference between 9.4 and 9.9 matters.
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export interface ValidatableFile {
  name: string;
  size: number;
  type: string;
}

/**
 * Checks a file against its bucket's policy.
 *
 * Size and type both, in that order: a 60MB `.mov` is over the limit *and* the
 * wrong type for the images bucket, and "too large" is the more useful of the
 * two things to say.
 */
export function validateFile(
  file: ValidatableFile,
  bucket: AttachmentBucket,
): ValidationResult {
  const policy = BUCKET_POLICIES[bucket];

  if (file.size <= 0) {
    return { ok: false, message: `${file.name} is empty.` };
  }

  if (file.size > policy.maxBytes) {
    return {
      ok: false,
      message: `${file.name} is ${formatBytes(file.size)}. The limit for a ${policy.label} is ${formatBytes(policy.maxBytes)}.`,
    };
  }

  if (policy.mimeTypes && !policy.mimeTypes.includes(file.type)) {
    return {
      ok: false,
      message: `${file.name} is not a supported ${policy.label} type.`,
    };
  }

  return { ok: true };
}

/**
 * Reduces a filename to something safe to put in a URL path.
 *
 * Not used as the stored name — that is a generated id — but kept as the
 * extension and for the download filename. The original is preserved in
 * `attachments.file_name`, so nothing the user typed is lost.
 */
export function fileExtension(fileName: string): string {
  const match = /\.([a-zA-Z0-9]{1,12})$/.exec(fileName);
  return match?.[1]?.toLowerCase() ?? "bin";
}

export interface StoragePathInput {
  ownerId: UUID;
  noteId: UUID;
  fileName: string;
  /** Injected so tests are not at the mercy of `crypto.randomUUID`. */
  id: string;
}

/**
 * Where an object lives: `<owner id>/<note id>/<id>.<ext>`.
 *
 * The owner id **must** come first. Every storage policy in migration `0003`
 * checks `(storage.foldername(name))[1]` against `auth.uid()`, so a path built
 * any other way is rejected by the database — which is the intended failure
 * mode, but only if this function is the one place paths are built.
 *
 * The filename is a generated id rather than the user's: two files called
 * `screenshot.png` on one note would otherwise collide, and a user-supplied
 * name in a path is a traversal waiting to happen.
 */
export function storagePath({
  ownerId,
  noteId,
  fileName,
  id,
}: StoragePathInput): string {
  return `${ownerId}/${noteId}/${id}.${fileExtension(fileName)}`;
}
