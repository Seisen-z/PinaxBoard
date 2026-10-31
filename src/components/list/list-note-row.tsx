"use client";

import { Check, FileText, Lock, Pin } from "lucide-react";
import { useEffect, useRef } from "react";
import { NoteContextMenu, NoteMenu } from "@/components/notes/note-menu";
import { NoteMoreButton } from "@/components/notes/note-header";
import { NoteTags } from "@/components/notes/note-tags";
import { PriorityBadge } from "@/components/ui/priority-badge";
import type { NoteActions } from "@/features/notes/use-note-actions";
import { cn, formatShortDate } from "@/lib/utils";
import type { Category, Note, Tag } from "@/types/note";

interface ListNoteRowProps {
  note: Note;
  tags: readonly Tag[];
  category: Category | null;
  laneName: string;
  selected: boolean;
  autoFocus: boolean;
  actions: NoteActions;
}

export function ListNoteRow({ note, tags, category, laneName, selected, autoFocus, actions }: ListNoteRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);
  const name = note.title || "Untitled note";
  return (
    <NoteContextMenu note={note} actions={actions}>
      <article aria-label={name} data-testid="list-note-row" data-note-id={note.id}
        data-selected={selected || undefined} data-completed={note.completed || undefined}
        className="tk-list-note-row group"
        onClick={(event) => actions.selectNote(note.id, event)}
        onDoubleClick={() => actions.onEdit(note.id)}>
        <button type="button" aria-label={`Open ${name}`} onClick={() => actions.onEdit(note.id)}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground">
          <FileText size={18} aria-hidden="true" />
        </button>
        <button type="button" role="checkbox" aria-checked={note.completed}
          aria-label={`Mark ${name} as ${note.completed ? "incomplete" : "done"}`}
          onClick={() => actions.onToggleComplete(note.id)}
          className="grid size-4 shrink-0 place-items-center rounded border border-border">
          {note.completed ? <Check size={12} aria-hidden="true" /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <input ref={inputRef} value={note.title} readOnly={note.locked} aria-label="Note title"
              placeholder="Untitled" onChange={(event) => actions.setTitle(note.id, event.target.value)}
              className={cn("min-w-0 flex-1 rounded bg-transparent text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", note.completed && "line-through")} />
            {note.pinned ? <Pin size={12} aria-label="Pinned" role="img" /> : null}
            {note.locked ? <Lock size={12} aria-label="Locked" role="img" /> : null}
          </div>
          <button type="button" aria-label={`Edit content of ${name}`} onClick={() => actions.onEdit(note.id)}
            className="block w-full truncate text-left text-xs text-muted-foreground">
            {note.excerpt || "Write a note..."}
          </button>
          <div className="mt-1 sm:hidden"><NoteTags tags={tags} category={category} maxVisible={2} /></div>
        </div>
        <div className="hidden min-w-0 max-w-48 overflow-hidden sm:block"><NoteTags tags={tags} category={category} maxVisible={2} /></div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
          <span className="max-w-24 truncate text-muted-foreground">{note.completed ? "Done" : laneName}</span>
          <time dateTime={note.dueAt ?? note.updatedAt} className="text-muted-foreground"
            title={note.dueAt ? "Due date" : "Last edited"}>
            {note.dueAt ? "Due " : "Edited "}{formatShortDate(note.dueAt ?? note.updatedAt)}
          </time>
        </div>
        <PriorityBadge priority={note.priority} />
        <NoteMenu note={note} actions={actions}><NoteMoreButton noteTitle={note.title} /></NoteMenu>
      </article>
    </NoteContextMenu>
  );
}
