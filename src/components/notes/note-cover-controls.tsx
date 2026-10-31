"use client";

import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { ClayButton } from "@/components/ui/clay-button";
import {
  removeCoverObject,
  uploadCover,
} from "@/features/attachments/cover";
import { BUCKET_POLICIES } from "@/features/attachments/upload-policy";
import type { UUID } from "@/types/common";

export interface NoteCoverControlsProps {
  noteId: UUID;
  ownerId: UUID;
  /** The note's current cover: an external URL, or a `covers` object path. */
  coverUrl: string | null;
  onChange: (coverUrl: string | null) => void;
}

/**
 * Add, replace or remove a note's cover (IMPLEMENTATION_PLAN.md §16).
 *
 * Replace is a single action rather than remove-then-add: a note has exactly
 * one cover, and making the user clear it first leaves them looking at a note
 * with no cover if the second step fails.
 */
export function NoteCoverControls({
  noteId,
  ownerId,
  coverUrl,
  onChange,
}: NoteCoverControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      setBusy(true);
      setError(null);

      try {
        const path = await uploadCover({
          file,
          noteId,
          ownerId,
          previousCoverUrl: coverUrl,
        });
        onChange(path);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not set the cover image.",
        );
      } finally {
        setBusy(false);
      }
    },
    [coverUrl, noteId, onChange, ownerId],
  );

  const handleRemove = useCallback(async () => {
    setBusy(true);
    setError(null);

    // Cleared on the note first: the user asked for it gone, and a failed
    // object delete leaves an orphan rather than a cover that will not go away.
    onChange(null);

    try {
      await removeCoverObject(coverUrl);
    } finally {
      setBusy(false);
    }
  }, [coverUrl, onChange]);

  const accept = BUCKET_POLICIES.covers.mimeTypes?.join(",") ?? "image/*";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ClayButton
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 size={14} aria-hidden="true" className="animate-spin" />
        ) : coverUrl ? (
          <RefreshCw size={14} aria-hidden="true" />
        ) : (
          <ImagePlus size={14} aria-hidden="true" />
        )}
        {coverUrl ? "Replace cover" : "Add cover"}
      </ClayButton>

      {coverUrl ? (
        <ClayButton
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void handleRemove()}
        >
          <Trash2 size={14} aria-hidden="true" />
          Remove cover
        </ClayButton>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label="Choose a cover image"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          // Cleared so re-picking the same file fires `change` again.
          event.target.value = "";
        }}
      />

      {error ? (
        <p role="alert" className="w-full text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
