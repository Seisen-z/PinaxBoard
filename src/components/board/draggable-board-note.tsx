"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { PaperNoteCard, type PaperNoteCardProps } from "@/components/notes/paper-note-card";

export function DraggableBoardNote(props: PaperNoteCardProps) {
  const { note } = props;
  const canEdit=useCanEditBoard();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: note.id, disabled: !canEdit || note.locked,
  });
  return (
    <div ref={setNodeRef} data-dragging={isDragging || undefined} className="tk-board-draggable">
      <PaperNoteCard {...props} headerLeading={
        <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners}
          disabled={!canEdit || note.locked} aria-label={`Move ${note.title || "Untitled note"} to another column`}
          title={note.locked ? "Unlock to drag" : "Drag to another column; Space then arrow keys also works"}
          className="tk-note-drag-handle mt-0.5 shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-25">
          <GripVertical size={14} aria-hidden="true" />
        </button>
      } />
    </div>
  );
}
