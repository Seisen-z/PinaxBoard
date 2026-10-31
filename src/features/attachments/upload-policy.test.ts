import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_BUCKETS,
  BUCKET_POLICIES,
  bucketForFile,
  fileExtension,
  formatBytes,
  storagePath,
  validateFile,
} from "@/features/attachments/upload-policy";

/**
 * Upload rules (IMPLEMENTATION_PLAN.md §16).
 *
 * These are the half of Milestone 10 that can be proven without a live
 * project. The storage policies themselves are enforced in migration `0003`
 * and have to be verified against the real database — see `supabase/README.md`.
 */

describe("SVG uploads", () => {
  it.each(["note-images", "attachments", "covers"] as const)("are refused in %s", (bucket) => {
    const result = validateFile({ name: "logo.svg", size: 1000, type: "image/svg+xml" }, bucket);
    expect(result.ok).toBe(false);
  });

  it("are refused even when the type is missing", () => {
    expect(validateFile({ name: "logo.SVG", size: 1000, type: "" }, "attachments").ok).toBe(false);
  });
});

describe("choosing a bucket", () => {
  it.each([
    ["image/png", "note-images"],
    ["video/mp4", "note-videos"],
    ["video/quicktime", "note-videos"],
    ["application/pdf", "attachments"],
    ["application/vnd.ms-excel", "attachments"],
    ["", "attachments"],
  ])("puts %s in %s", (type, expected) => {
    expect(bucketForFile({ type })).toBe(expected);
  });

  it("gives every bucket a policy", () => {
    for (const bucket of ATTACHMENT_BUCKETS) {
      expect(BUCKET_POLICIES[bucket]?.bucket, `${bucket} policy`).toBe(bucket);
    }
  });

  it("leaves the attachments bucket open to any type", () => {
    // It is the bucket for the file the user actually has; an allowlist there
    // would reject the .sketch or .ai the note is about.
    expect(BUCKET_POLICIES.attachments.mimeTypes).toBeNull();
  });
});

describe("validation", () => {
  const png = { name: "shot.png", size: 1024, type: "image/png" };

  it("accepts a file within its bucket's limits", () => {
    expect(validateFile(png, "note-images")).toEqual({ ok: true });
  });

  it("rejects an empty file", () => {
    const result = validateFile({ ...png, size: 0 }, "note-images");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("empty");
  });

  it("rejects an oversized file and says what the limit is", () => {
    const result = validateFile({ ...png, size: 11 * 1024 * 1024 }, "note-images");

    expect(result.ok).toBe(false);
    // The message has to be actionable, not just "invalid".
    expect(result.ok === false && result.message).toContain("shot.png");
    expect(result.ok === false && result.message).toContain("10 MB");
  });

  it("rejects the wrong type for the bucket", () => {
    const result = validateFile(
      { name: "clip.mp4", size: 1024, type: "video/mp4" },
      "note-images",
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("not a supported");
  });

  it("reports size before type when a file fails both", () => {
    // "Too large" is the more useful of the two things to say.
    const result = validateFile(
      { name: "huge.mp4", size: 60 * 1024 * 1024, type: "video/mp4" },
      "note-images",
    );

    expect(result.ok === false && result.message).toContain("limit");
  });

  it("accepts any type in the attachments bucket, within the size limit", () => {
    const odd = { name: "design.sketch", size: 2048, type: "application/x-sketch" };

    expect(validateFile(odd, "attachments")).toEqual({ ok: true });
    expect(validateFile({ ...odd, size: 26 * 1024 * 1024 }, "attachments").ok).toBe(
      false,
    );
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [2048, "2 KB"],
    [1024 * 1024 * 1.5, "1.5 MB"],
    [1024 * 1024 * 25, "25 MB"],
  ])("formats %i as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("storage paths", () => {
  const input = {
    ownerId: "11111111-1111-1111-1111-111111111111",
    noteId: "22222222-2222-2222-2222-222222222222",
    id: "abc123",
  };

  it("puts the owner id first, which is what the storage policies check", () => {
    const path = storagePath({ ...input, fileName: "shot.png" });

    // Migration 0003 checks `(storage.foldername(name))[1] = auth.uid()`, so a
    // path built any other way is rejected by the database.
    expect(path.split("/")[0]).toBe(input.ownerId);
    expect(path).toBe(`${input.ownerId}/${input.noteId}/abc123.png`);
  });

  it("never puts the user's filename in the path", () => {
    // A user-supplied name in a path is a traversal waiting to happen, and two
    // files called screenshot.png on one note would collide.
    const path = storagePath({ ...input, fileName: "../../etc/passwd.png" });

    expect(path).not.toContain("..");
    expect(path).not.toContain("passwd");
    expect(path).toBe(`${input.ownerId}/${input.noteId}/abc123.png`);
  });

  it("falls back to a generic extension when there is none to read", () => {
    expect(fileExtension("README")).toBe("bin");
    expect(fileExtension("archive.tar.gz")).toBe("gz");
    expect(fileExtension("SHOT.PNG")).toBe("png");
  });
});
