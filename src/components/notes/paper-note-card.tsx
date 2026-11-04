"use client";

import { NoteAttachments } from "@/components/notes/note-attachments";
import { useNoteAttachments } from "@/features/attachments/board-attachments";
import { useCanEditBoard } from "@/features/collaboration/access";
import { memo, type ReactNode } from "react";

import { NoteChecklist } from "@/components/notes/note-checklist";
import { NoteContent } from "@/components/notes/note-content";
import { NoteCover } from "@/components/notes/note-cover";
import { NoteFooter } from "@/components/notes/note-footer";
import { NoteHeader, NoteMoreButton } from "@/components/notes/note-header";
import {
  NoteContextMenu,
  NoteMenu,
  type NoteMenuActions,
} from "@/components/notes/note-menu";
import { NoteTags } from "@/components/notes/note-tags";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { RichDocument } from "@/lib/tiptap/document";
import { resolveNoteAppearance } from "@/lib/note-appearance";
import { cn } from "@/lib/utils";
import {
  getSubtaskProgress,
  type Category,
  type Note,
  type Tag,
} from "@/types/note";

export interface PaperNoteCardProps {
  note: Note;
  /** Tags resolved from `note.tagIds` by the caller. */
  tags?: readonly Tag[];
  /** The note's category, resolved by the caller. */
  category?: Category | null;
  /** Marks the card as part of the current selection. */
  selected?: boolean;
  /**
   * Editing handlers. Supplying `onTitleChange` / `onContentChange` turns the
   * corresponding field into an input — that is how a freshly created blank
   * note is immediately writable with no dialog (FRONTEND_SPEC.md §23).
   *
   * Each handler receives the note id so callers can pass one stable callback
   * for every card rather than a fresh closure per note, which is what keeps
   * the `memo` below effective on a large board.
   */
  onTitleChange?: (noteId: string, title: string) => void;
  onContentChange?: (
    noteId: string,
    document: RichDocument,
    text: string,
  ) => void;
  onToggleSubtask?: (noteId: string, subtaskId: string, completed: boolean) => void;
  onSelect?: (noteId: string, event: React.MouseEvent) => void;
  /** Supplying this renders the More menu. */
  menuActions?: NoteMenuActions;
  /** Focuses the title on mount. Set for a note the user just created. */
  autoFocus?: boolean;
  className?: string;
  metadata?: ReactNode;
  headerLeading?: ReactNode;
}

/**
 * A note rendered as a piece of paper (FRONTEND_SPEC.md §14–§19, §66).
 *
 * Memoized: on a board of hundreds of notes, moving or editing one card must
 * not re-render the rest (FRONTEND_SPEC.md §76).
 *
 * @example
 * <PaperNoteCard
 *   note={note}
 *   tags={tagsForNote}
 *   menuActions={noteActions}
 *   onTitleChange={setTitle}
 * />
 */
export const PaperNoteCard = memo(function PaperNoteCard({
  note,
  tags = [],
  category = null,
  selected = false,
  onTitleChange,
  onContentChange,
  onToggleSubtask,
  onSelect,
  menuActions,
  autoFocus = false,
  className,
  metadata,
  headerLeading,
}: PaperNoteCardProps) {
  const canEdit = useCanEditBoard();
  if (!canEdit) { onTitleChange=undefined; onContentChange=undefined; onToggleSubtask=undefined; }
  const { paperStyle, textureClass } = resolveNoteAppearance(note.appearance);
  const progress = getSubtaskProgress(note);
  const attachments = useNoteAttachments(note.id);

  const card = (
    <SurfaceCard
      as="article"
      interactive
      completed={note.completed}
      selected={selected}
      style={paperStyle}
      data-testid="paper-note-card"
      data-note-id={note.id}
      data-locked={note.locked ? "true" : undefined}
      aria-label={note.title || "Untitled note"}
      onClick={onSelect ? (event: React.MouseEvent) => onSelect(note.id, event) : undefined}
      tabIndex={menuActions ? 0 : undefined}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (menuActions && event.key === "Enter" && event.target === event.currentTarget) {
          event.preventDefault(); menuActions.onEdit(note.id);
        }
      }}
      onDoubleClick={(event: React.MouseEvent) => {
        if (!menuActions || !(event.target instanceof Element) || !event.currentTarget.contains(event.target)) return;
        // Text selection and nested controls keep their ordinary double-click.
        if (event.target.closest("input, textarea, button, a, select, [contenteditable=true], [role=checkbox]")) return;
        menuActions.onEdit(note.id);
      }}
      className={cn(
        "group flex flex-col gap-2.5 border p-3.5",
        textureClass,
        className,
      )}
    >
      <NoteCover coverUrl={note.appearance.coverUrl} noteTitle={note.title} />

      <div className="tk-paper-heading flex items-start gap-1">
        {headerLeading}
        <div className="min-w-0 flex-1">
          <NoteHeader
            title={note.title}
            priority={note.priority}
            pinned={note.pinned}
            locked={note.locked}
            completed={note.completed}
            {...(onTitleChange
              ? { onTitleChange: (title: string) => onTitleChange(note.id, title) }
              : {})}
            autoFocusTitle={autoFocus}
            {...(menuActions && canEdit
              ? {
                  onToggleComplete: () => menuActions.onToggleComplete(note.id),
                  menuSlot: (
                    <NoteMenu note={note} actions={menuActions}>
                      <NoteMoreButton noteTitle={note.title} />
                    </NoteMenu>
                  ),
                }
              : {})}
          />
        </div>
      </div>

      <NoteContent
        content={note.content}
        text={note.excerpt}
        completed={note.completed}
        {...(onContentChange && !note.locked
          ? {
              onContentChange: (document: RichDocument, text: string) =>
                onContentChange(note.id, document, text),
            }
          : {})}
      />

      <NoteChecklist
        subtasks={note.subtasks}
        {...(onToggleSubtask
          ? {
              onToggle: (subtaskId: string, completed: boolean) =>
                onToggleSubtask(note.id, subtaskId, completed),
            }
          : {})}
      />

      <NoteAttachments attachments={attachments} />

      <NoteTags tags={tags} category={category} />

      {metadata}

      <NoteFooter
        dueAt={note.dueAt}
        completed={note.completed}
        progress={progress}
      />
    </SurfaceCard>
  );

  // Right-click opens the same menu as the ⋯ button. Wrapping only when there
  // are actions keeps a read-only card free of a menu it cannot serve, and
  // leaves the browser's own menu available there.
  if (!menuActions) return card;

  return (
    <NoteContextMenu note={note} actions={menuActions}>
      {card}
    </NoteContextMenu>
  );
});
