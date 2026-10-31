"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { RichEditor } from "@/components/notes/rich-editor";
import { isEmptyDocument, resolveDocument, type RichDocument } from "@/lib/tiptap/document";
import { cn } from "@/lib/utils";

export interface NoteContentProps {
  /** Tiptap JSON from `Note.content`. `null` for a note written before §15. */
  content: unknown;
  /** Plain-text projection, and the migration source for a pre-§15 note. */
  text: string;
  completed: boolean;
  /** When provided the body becomes editable. */
  onContentChange?: (document: RichDocument, text: string) => void;
  /** Focuses the body on mount. */
  autoFocus?: boolean;
  /** Placeholder shown while the body is empty. */
  placeholder?: string;
}

/**
 * The note body.
 *
 * Milestone 9 replaced the plain `<textarea>` here with Tiptap. The card's
 * layout contract did not change: the body grows with its content
 * (FRONTEND_SPEC.md §23) but stops at `--note-content-max-height` and scrolls
 * from there. An uncapped card pushes every other note in its lane off screen,
 * and long-form reading belongs in Focus Mode rather than on a lane card.
 *
 * A read-only card renders the same document through the same extensions, so
 * what the reader sees is what the writer wrote — including blocks the card is
 * too small to invite, like a code block or an image.
 */
export function NoteContent({
  content,
  text,
  completed,
  onContentChange,
  autoFocus = false,
  placeholder = "Write, or press / for blocks",
}: NoteContentProps) {
  /*
   * Memoized on the stored values, not rebuilt per render: `RichEditor` pushes
   * a changed document into the editor, and a fresh object each render would
   * read as a change and reset the cursor on every keystroke.
   */
  const document = useMemo(() => resolveDocument(content, text), [content, text]);

  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const observerAbsent = useSyncExternalStore(noopSubscribe, () => typeof IntersectionObserver === "undefined", () => false);
  useEffect(() => {
    const node = host.current; if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => { if (node.contains(globalThis.document.activeElement)) return; setVisible(Boolean(entry?.isIntersecting)); }, { rootMargin: "300px" });
    observer.observe(node); return () => observer.disconnect();
  }, []);

  // A read-only note with nothing in it contributes nothing but a gap.
  if (!onContentChange && isEmptyDocument(document)) return null;

  return (
    <div ref={host}>{visible || observerAbsent || autoFocus ? <RichEditor
      document={document}
      editable={Boolean(onContentChange)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      variant="card"
      className={cn("text-[13px] leading-relaxed", completed && "line-through opacity-90")}
      {...(onContentChange ? { onChange: onContentChange } : {})}
    /> : <p className="max-h-[var(--note-content-max-height)] overflow-hidden whitespace-pre-wrap text-[13px] leading-relaxed">{text || placeholder}</p>}</div>
  );
}

function noopSubscribe() { return () => {}; }
