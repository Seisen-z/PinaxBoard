"use client";

import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { attachmentUrl } from "@/features/attachments/repository";
import type { Attachment } from "@/types/note";

export interface AttachmentPreviewProps {
  attachment: Attachment;
  /** `large` shows the actual image, filling the row; the default is a thumbnail. */
  size?: "thumb" | "large";
  /** Extra classes for the large image, e.g. a smaller height cap on a card. */
  className?: string;
}

/**
 * A thumbnail for an image attachment.
 *
 * Note buckets are private, so there is no URL to put in `src` — one has to be
 * signed first, which is why this is async and why the thumbnail starts as a
 * placeholder rather than a broken image.
 *
 * Signed on mount rather than with the list: a note with thirty images would
 * otherwise sign thirty URLs before showing anything, and most of them scroll
 * past unseen.
 */
export function AttachmentPreview({ attachment, size = "thumb", className }: AttachmentPreviewProps) {
  const [url, setUrl] = useState<string | null>(attachment.publicUrl);

  useEffect(() => {
    if (attachment.publicUrl) return;

    let cancelled = false;

    attachmentUrl(attachment)
      .then((signed) => {
        // The row can unmount while the request is in flight — a note closed,
        // or the attachment removed — and setting state then is a leak.
        if (!cancelled) setUrl(signed);
      })
      .catch((cause: unknown) => {
        console.error("Supabase: could not sign a preview URL", cause);
      });

    return () => {
      cancelled = true;
    };
  }, [attachment]);

  if (!url && size === "large") {
    return (
      <div data-testid="attachment-preview-pending" className="flex h-24 w-full items-center justify-center rounded-md bg-current/5">
        <ImageIcon size={18} aria-hidden="true" className="opacity-50" />
      </div>
    );
  }

  if (!url) {
    return (
      <ImageIcon
        size={14}
        aria-hidden="true"
        data-testid="attachment-preview-pending"
        className="shrink-0 opacity-70"
      />
    );
  }

  return (
    // Not `next/image`: the source is a signed URL on a Supabase host that
    // changes per project, so the optimizer would need a remote pattern the
    // build cannot know. These are 28px thumbnails either way.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url ?? undefined}
      alt={attachment.fileName}
      data-testid="attachment-preview"
      className={size === "large" ? `max-h-72 w-full rounded-md object-contain ${className ?? ""}` : "size-7 shrink-0 rounded object-cover"}
      loading="lazy"
    />
  );
}
