"use client";

import { useEffect, useState } from "react";

import { resolveCoverSource } from "@/features/attachments/cover";
import { cn } from "@/lib/utils";

export interface NoteCoverProps {
  /** `Note.appearance.coverUrl` — an external URL, or a `covers` object path. */
  coverUrl: string | null;
  /** Used as the image's accessible name. */
  noteTitle: string;
  /** Taller in the full-screen editor than on a card. */
  variant?: "card" | "focus";
  className?: string;
}

/**
 * A note's cover image, above its content (FRONTEND_SPEC.md §14).
 *
 * Renders nothing until there is a source. The `covers` bucket is private, so
 * an uploaded cover has to be signed first — and a card that reserved space
 * for an image that never arrives would leave a gap on every note.
 *
 * The image is decorative in the sense that matters here: the note's title and
 * body carry its meaning, so a failed load removes the element entirely rather
 * than leaving a broken-image icon in the card.
 */
export function NoteCover({
  coverUrl,
  noteTitle,
  variant = "card",
  className,
}: NoteCoverProps) {
  /**
   * The resolved source, tagged with the cover it was resolved *for*.
   *
   * Tagged rather than reset, because clearing it in the effect body would be
   * a synchronous setState during an effect — and it would also be a frame too
   * late: for one render the old image would still be on screen under a note
   * that now has a different cover. Comparing during render is both correct
   * and free.
   */
  const [resolved, setResolved] = useState<{
    coverUrl: string | null;
    src: string | null;
  }>({ coverUrl: null, src: null });

  useEffect(() => {
    if (!coverUrl) return;

    let cancelled = false;

    void resolveCoverSource(coverUrl).then((src) => {
      // The card can unmount while the URL is being signed — a note deleted,
      // or the board switched — and setting state then is a leak.
      if (!cancelled) setResolved({ coverUrl, src });
    });

    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  const source = resolved.coverUrl === coverUrl ? resolved.src : null;

  if (!source) return null;

  return (
    // Not `next/image`: a cover is either a signed URL on a per-project
    // Supabase host or an arbitrary URL the user pasted, and neither can be
    // expressed as a build-time remote pattern.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      loading={variant === "card" ? "lazy" : "eager"}
      decoding="async"
      alt={noteTitle ? `Cover image for ${noteTitle}` : "Note cover image"}
      data-testid="note-cover"
      onError={() => setResolved({ coverUrl, src: null })}
      className={cn(
        "w-full rounded-[calc(var(--radius-note)-4px)] object-cover",
        variant === "card" ? "h-24" : "h-44",
        className,
      )}
    />
  );
}
