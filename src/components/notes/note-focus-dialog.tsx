"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";
import { dayKey, dueAtForDay, parseDate } from "@/features/calendar/month";
import { Check, Maximize2, MoreHorizontal, PanelRight, Share2, Square, X, type LucideIcon } from "lucide-react";
import { Dialog } from "radix-ui";
import { useCallback, useMemo } from "react";

import { NoteHistoryPanel } from "@/components/notes/note-history-panel";
import type { Note } from "@/types/note";
import { NoteScheduleControls } from "@/components/notes/note-schedule-controls";
import { AttachmentList } from "@/components/notes/attachment-list";
import { NoteMenu } from "@/components/notes/note-menu";
import { NoteChecklist } from "@/components/notes/note-checklist";
import { NoteCover } from "@/components/notes/note-cover";
import { NoteAppearanceControls } from "@/components/notes/note-appearance-controls";
import { NoteCoverControls } from "@/components/notes/note-cover-controls";
import { RichEditor } from "@/components/notes/rich-editor";
import { NoteTags } from "@/components/notes/note-tags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { attachmentUrl } from "@/features/attachments/repository";
import { resolveDocument } from "@/lib/tiptap/document";
import { resolveNoteAppearance } from "@/lib/note-appearance";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore, type NotePeekMode } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { useNoteActions } from "@/features/notes/use-note-actions";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import {
  useAttachmentUploads,
  useAttachments,
} from "@/features/attachments/queries";

/** The three ways the editor can open, as in Notion's "Open as" menu. */
const PEEK_OPTIONS: readonly { id: NotePeekMode; label: string; icon: LucideIcon }[] = [
  { id: "side", label: "Side peek", icon: PanelRight },
  { id: "center", label: "Center peek", icon: Square },
  { id: "full", label: "Full page", icon: Maximize2 },
];

export interface NoteFocusDialogProps {
  onShare?: () => void;
  /**
   * The signed-in user's id, or `null`.
   *
   * Attachments need a real user: the storage path is scoped by user id, and
   * the policies check it. Running on local state there is nowhere to put a
   * file, so the list is read-only rather than offering an upload that cannot
   * succeed.
   */
  ownerId?: string | null;
  beforeHistoryRestore?: () => Promise<boolean>;
  onHistoryRestored?: (note:Note) => void;
  onOpenHistory?: () => void;
}

/**
 * Full-screen note editing (IMPLEMENTATION_PLAN.md §15).
 *
 * Opened by Edit on a note's menu. The card's body is capped at
 * `--note-content-max-height` so one long note cannot fill its lane — this is
 * where that note is actually read and written, with the same document and the
 * same extensions, only without the cap.
 *
 * It wears the note's own paper, so expanding a card does not feel like moving
 * the note into a different application.
 *
 * Built on Radix's Dialog directly rather than through a shadcn wrapper: the
 * project has `radix-ui` already (see `src/components/ui/separator.tsx`), and
 * this needs no variants of its own.
 */
export function NoteFocusDialog({ ownerId = null, beforeHistoryRestore, onHistoryRestored, onOpenHistory, onShare }: NoteFocusDialogProps) {
  const canEdit = useCanEditBoard();
  const focusReturn = useDialogFocusReturn(() => {
    const id = useNoteStore.getState().focusedNoteId ?? expandedNoteId;
    const candidate = id ? globalThis.document.querySelector<HTMLElement>(`[data-note-id="${id}"]`) : null;
    return candidate?.tabIndex !== undefined && candidate.tabIndex >= 0 ? candidate : candidate?.querySelector<HTMLElement>("button, textarea, input") ?? null;
  });
  const { tags } = useTaxonomyContext();
  const expandedNoteId = useNoteStore((state) => state.expandedNoteId);
  const note = useNoteStore((state) =>
    state.notes.find((candidate) => candidate.id === state.expandedNoteId) ?? null,
  );
  const setStartAt = useNoteStore((state) => state.setStartAt);
  const setDueAt = useNoteStore((state) => state.setDueAt);
  const collapseNote = useNoteStore((state) => state.collapseNote);
  const peekMode = useSettingsStore((state) => state.notePeekMode);
  const setPeekMode = useSettingsStore((state) => state.setNotePeekMode);

  const actions = useNoteActions();
  const restoringId = useNoteStore((state)=>state.restoringNoteId);

  const cloudEnabled = Boolean(ownerId);
  const attachments = useAttachments(expandedNoteId, cloudEnabled);
  const uploads = useAttachmentUploads(expandedNoteId, ownerId);

  const document = useMemo(
    () => resolveDocument(note?.content ?? null, note?.excerpt ?? ""),
    [note?.content, note?.excerpt],
  );

  /**
   * Uploads pasted or dropped images and hands the editor signed URLs.
   *
   * The image goes through the same attachment pipeline as a file picked from
   * the list, so it is one note's file either way — removable, counted, and
   * deleted with the note rather than a URL the document happens to mention.
   */
  const handleUploadImages = useCallback(
    async (files: readonly File[]) => {
      const saved = await uploads.upload(files, "note-images");
      return Promise.all(saved.map(attachmentUrl));
    },
    [uploads],
  );

  const noteTags = useMemo(() => {
    if (!note) return [];
    const byId = new Map(tags.map((tag) => [tag.id, tag]));
    return note.tagIds.flatMap((id) => {
      const tag = byId.get(id);
      return tag ? [tag] : [];
    });
  }, [note, tags]);

  // Driven by the store rather than local state, so Edit from any surface —
  // the card menu, the right-click menu, the canvas — opens the same editor.
  const open = Boolean(expandedNoteId && note);

  if (!note || !document) {
    // Still rendered when closed so the dialog can animate out, but with
    // nothing to show there is no point mounting it at all.
    return null;
  }

  const { paperStyle, textureClass } = resolveNoteAppearance(note.appearance);
  const isSide = peekMode === "side";
  const isFull = peekMode === "full";
  const ModeIcon = PEEK_OPTIONS.find((option) => option.id === peekMode)?.icon ?? PanelRight;
  const editable = canEdit && !note.locked && restoringId !== note.id;

  return (
    // A side peek leaves the board usable beside it, so it is not modal.
    <Dialog.Root open={open} modal={!isSide} onOpenChange={(next) => !next && collapseNote()}>
      <Dialog.Portal>
        {isSide ? null : <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-surface-sunken/70" />}

        <Dialog.Content
          data-testid="note-focus-dialog"
          aria-describedby={undefined}
          // The menu that opened this hands focus back to its button. For a
          // non-modal peek that reads as "focus left", which would close the
          // panel as it opens; only a click outside should dismiss it.
          onFocusOutside={(event) => event.preventDefault()}
          className={cn(
            "fixed z-[var(--z-overlay)] flex flex-col",
            isSide && "inset-y-0 right-0 w-full duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right motion-reduce:animate-none sm:w-[min(760px,58vw)]",
            peekMode === "center" && "inset-0 p-4 sm:p-8",
            isFull && "inset-0",
          )}
          // Radix would otherwise pull focus to the first focusable element,
          // which is Close. The caret belongs in the note.
          onCloseAutoFocus={focusReturn.onCloseAutoFocus}
          onOpenAutoFocus={(event) => { focusReturn.onOpenAutoFocus(); event.preventDefault(); }}
        >
          <div
            // Own the complete editor subtree: switching notes (or replacing a
            // legacy duplicate-key tree during Fast Refresh) must not retain
            // another note's editor DOM or version selection.
            //
            // The paper itself does not scroll: decorated designs hang rings,
            // tape and stickers over its edge, and a scrolling element would
            // clip them. The content scrolls inside it instead.
            key={`focus-paper-${note.id}`}
            style={paperStyle}
            className={cn(
              "tk-paper flex min-h-0 flex-1 flex-col border p-6",
              textureClass,
              peekMode === "center" && "mx-auto w-full max-w-3xl rounded-[var(--radius-lg)]",
              isSide && "w-full rounded-none border-y-0 border-r-0 shadow-[-14px_0_36px_rgb(10_8_4/0.18)] sm:rounded-l-[var(--radius-lg)] sm:px-8",
              isFull && "w-full rounded-none border-0 sm:px-[max(2rem,calc((100%-48rem)/2))]",
            )}
          >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <NoteCover
              coverUrl={note.appearance.coverUrl}
              noteTitle={note.title}
              variant="focus"
            />

            <header className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 basis-full flex-1 sm:basis-auto">
                <Dialog.Title asChild>
                  {editable ? (
                    <input
                      // The shared title field also reflects external updates.
                      key={`title-${note.id}`}
                      value={note.title}
                      autoFocus
                      aria-label="Note title"
                      placeholder="Untitled note"
                      onChange={(event) =>
                        actions.setTitle(note.id, event.target.value)
                      }
                      className="w-full bg-transparent text-xl font-semibold tracking-tight placeholder:text-current/40 focus:outline-none"
                    />
                  ) : (
                    <h2 className="truncate text-xl font-semibold tracking-tight">
                      {note.title || "Untitled note"}
                    </h2>
                  )}
                </Dialog.Title>
              </div>

              <PriorityBadge priority={note.priority} />

              <IconButton label="Share board and its notes" icon={<Share2 size={16} />} variant="ghost" size="sm" disabled={!onShare} onClick={onShare} />
              <NoteMenu note={note} actions={{ ...actions,
                onArchive: (id) => { actions.onArchive(id); collapseNote(); },
              }}>
                <IconButton label="More note actions" disabled={!canEdit || restoringId===note.id} icon={<MoreHorizontal size={16} />} variant="ghost" size="sm" />
              </NoteMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <IconButton label="Change how notes open" icon={<ModeIcon size={16} />} variant="ghost" size="sm" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Open notes as</DropdownMenuLabel>
                  {PEEK_OPTIONS.map((option) => (
                    <DropdownMenuItem key={option.id} onSelect={() => setPeekMode(option.id)}>
                      <option.icon size={16} aria-hidden="true" />
                      {option.label}
                      {peekMode === option.id ? <Check size={14} aria-hidden="true" className="ml-auto" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog.Close asChild>
                <IconButton
                  label="Close editor"
                  icon={<X size={16} />}
                  variant="ghost"
                  size="sm"
                />
              </Dialog.Close>
            </header>

            {note.locked ? (
              <p className="text-xs text-current/60">
                This note is locked. Unlock it from Note appearance or the note menu to edit.
              </p>
            ) : null}

            <RichEditor
              key={`editor-${note.id}`}
              document={document}
              editable={editable}
              variant="focus"
              ariaLabel="Note content"
              placeholder="Write, or press / for blocks"
              className="text-sm leading-relaxed"
              {...(editable
                ? {
                    onChange: (next, text) =>
                      actions.setContent(note.id, next, text),
                  }
                : {})}
              {...(editable && cloudEnabled
                ? { onUploadImages: handleUploadImages }
                : {})}
            />

            <NoteChecklist
              subtasks={note.subtasks}
              {...(editable
                ? {
                    onToggle: (subtaskId: string, completed: boolean) =>
                      actions.toggleSubtask(note.id, subtaskId, completed),
                  }
                : {})}
            />

              <label className="flex items-center gap-2 text-sm">
              Start date
              <input type="date" aria-label="Start date" disabled={!editable}
                value={parseDate(note.startAt) ? dayKey(parseDate(note.startAt)!) : ""}
                onChange={(event) => {
                  const date = parseDate(event.target.value);
                  if (date) setStartAt(note.id, new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0).toISOString());
                  else if (!event.target.value) setStartAt(note.id, null);
                }}
                className="rounded-[var(--radius-sm)] border border-current/20 bg-transparent px-2 py-1" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Due date
              <input type="date" aria-label="Due date" disabled={!editable}
                value={parseDate(note.dueAt) ? dayKey(parseDate(note.dueAt)!) : ""}
                onChange={(event) => {
                  const date = parseDate(event.target.value);
                  if (date) setDueAt(note.id, dueAtForDay(date));
                  else if (!event.target.value) setDueAt(note.id, null);
                }}
                className="rounded-[var(--radius-sm)] border border-current/20 bg-transparent px-2 py-1" />
            </label>

            <NoteScheduleControls note={!canEdit||restoringId===note.id?{...note,locked:true}:note} ownerId={ownerId} />
            <NoteHistoryPanel key={`history-${note.id}`} note={note} ownerId={ownerId} {...(beforeHistoryRestore?{beforeRestore:beforeHistoryRestore}:{})} {...(onHistoryRestored?{onRestored:onHistoryRestored}:{})} {...(onOpenHistory?{onOpen:onOpenHistory}:{})}/>
            <NoteTags tags={noteTags} />

            <fieldset disabled={!canEdit}><NoteAppearanceControls note={note}>
              {cloudEnabled && editable && ownerId ? (
                <NoteCoverControls
                  noteId={note.id}
                  ownerId={ownerId}
                  coverUrl={note.appearance.coverUrl}
                  onChange={(coverUrl) => actions.setCover(note.id, coverUrl)}
                />
              ) : null}
            </NoteAppearanceControls></fieldset>

            {cloudEnabled ? (
              <AttachmentList
                attachments={attachments.data ?? []}
                uploads={uploads}
                editable={editable}
                loading={attachments.isLoading}
                error={attachments.error}
                onRetry={() => void attachments.refetch()}
              />
            ) : null}
          </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
