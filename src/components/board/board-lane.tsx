"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { CSSProperties } from "react";

import { LaneHeader, type LaneHeaderActions } from "@/components/board/lane-header";
import { DraggableBoardNote } from "@/components/board/draggable-board-note";
import { VirtualList } from "@/components/ui/virtual-list";
import { ClayButton } from "@/components/ui/clay-button";
import { resolveTags } from "@/lib/resolve-tags";
import { cn } from "@/lib/utils";
import type { NoteActions } from "@/features/notes/use-note-actions";
import type { CardDensity } from "@/stores/settings-store";
import type { Lane } from "@/types/lane";
import type { Category, Note, Tag } from "@/types/note";

export interface BoardLaneProps {
  lane: Lane;
  notes: readonly Note[];
  /** Workspace tags, used to resolve each note's `tagIds`. */
  tagsById: ReadonlyMap<string, Tag>;
  /** Workspace categories, used to resolve each note's `categoryId`. */
  categoriesById: ReadonlyMap<string, Category>;
  actions: NoteActions;
  laneActions: LaneHeaderActions;
  renaming: boolean;
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  /** Id of the note that should take focus (newly created, or Edit). */
  focusedNoteId: string | null;
  /** Ids of the currently selected notes. */
  selectedIds: ReadonlySet<string>;
  /** How much breathing room cards get, from board settings. */
  density: CardDensity;
}

/**
 * One column, as an enclosed panel tinted by its own accent colour.
 *
 * This replaces the *open* lanes of FRONTEND_SPEC.md §9/§52 — see "Decisions
 * made" in docs/HANDOFF.md. A panel gives each column a visible drop target
 * and lets the eye group its cards without counting dividers; the tint is
 * weak enough (`--lane-tint-panel`) that the board still reads as one surface
 * rather than five boxes.
 *
 * The accent reaches the tint through `--lane-accent` rather than a hard-coded
 * colour, so a recoloured column re-tints with no extra wiring.
 *
 * Note creation lives in the header. An empty lane also shows a call to
 * action, since there is nothing else in the column to click.
 */
export function BoardLane({
  lane,
  notes,
  tagsById,
  categoriesById,
  actions,
  laneActions,
  renaming,
  canDelete,
  canMoveLeft,
  canMoveRight,
  focusedNoteId,
  selectedIds,
  density,
}: BoardLaneProps) {
  const canEdit=useCanEditBoard();
  const { setNodeRef, isOver } = useDroppable({ id: lane.id });
  const isEmpty = notes.length === 0;
  const compact = density === "compact";
  const renderNote = (note: Note) => (
            <DraggableBoardNote
              key={note.id}
              note={note}
              tags={resolveTags(note.tagIds, tagsById)}
              category={note.categoryId ? (categoriesById.get(note.categoryId) ?? null) : null}
              selected={selectedIds.has(note.id)}
              autoFocus={note.id === focusedNoteId}
              menuActions={actions}
              {...(compact ? { className: "gap-1.5 p-2.5" } : {})}
              onTitleChange={actions.setTitle}
              onContentChange={actions.setContent}
              onToggleSubtask={actions.toggleSubtask}
              onSelect={actions.selectNote}
            />
  );

  return (
    <section
      ref={setNodeRef}
      data-drop-target={isOver || undefined}
      aria-label={lane.name}
      data-testid={`board-lane-${lane.id}`}
      data-lane-id={lane.id}
      style={{ "--lane-accent": lane.color } as CSSProperties}
      className="tk-lane-panel flex min-w-[var(--lane-min-width)] max-w-[var(--lane-max-width)] flex-1 flex-col gap-2 p-2.5"
    >
      <LaneHeader
        lane={lane}
        noteCount={notes.length}
        renaming={renaming}
        canDelete={canDelete}
        canMoveLeft={canMoveLeft}
        canMoveRight={canMoveRight}
        actions={laneActions}
      />

      {/*
        px-1 -mx-1 gives the selection ring room inside the scroll container.
        The old pb-16 is gone with the floating clusters it used to clear.
      */}
      <div
        className={cn(
          "tk-scrollbar-thin -mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-2",
          compact ? "gap-1.5" : "gap-2",
        )}
      >
        {isEmpty ? (
          // The empty column's placeholder doubles as a target. Its label is
          // deliberately distinct from the header's "Add note to …" so the
          // column never presents two identically-named Add controls.
          <ClayButton
            variant="ghost"
            size="md"
            disabled={!canEdit} aria-label={`Add the first note to ${lane.name}`}
            onClick={() => actions.addNote(lane.id)}
            className="h-auto flex-col gap-1.5 rounded-md border border-dashed border-border py-5 text-muted-foreground"
          >
            <Plus size={16} aria-hidden="true" />
            <span className="text-xs">Empty column</span>
          </ClayButton>
        ) : (
          notes.length > 100 ? <VirtualList items={notes} getKey={noteKey} focusKey={focusedNoteId} renderItem={renderNote} /> : notes.map(renderNote)
        )}
      </div>
    </section>
  );
}


function noteKey(note: Note): string { return note.id; }
