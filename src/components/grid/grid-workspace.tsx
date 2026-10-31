"use client";

import { useMemo } from "react";
import { BoardSettingsItems } from "@/components/board/board-controls";
import { PaperNoteCard } from "@/components/notes/paper-note-card";
import { ClayButton } from "@/components/ui/clay-button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CONTEXT_MENU_PRIMITIVES } from "@/components/ui/menu-primitives";
import { hasActiveFilters } from "@/features/board/filter-notes";
import { visibleNotes } from "@/features/board/visible-notes";
import { useNoteActions } from "@/features/notes/use-note-actions";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { formatShortDate } from "@/lib/utils";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useSettingsStore } from "@/stores/settings-store";

export function GridWorkspace() {
  const notes = useNoteStore((state) => state.notes);
  const focused = useNoteStore((state) => state.focusedNoteId);
  const lanes = useLaneStore((state) => state.lanes);
  const selected = useSelectionStore((state) => state.selectedIds);
  const clear = useSelectionStore((state) => state.clear);
  const filters = useSettingsStore((state) => state.boardFilters);
  const showCompleted = useSettingsStore((state) => state.boardShowCompleted);
  const sort = useSettingsStore((state) => state.boardSort);
  const density = useSettingsStore((state) => state.boardDensity);
  const clearFilters = useSettingsStore((state) => state.clearBoardFilters);
  const actions = useNoteActions();
  const { tags, categories } = useTaxonomyContext();
  const visible = useMemo(() => visibleNotes(notes, filters, showCompleted, sort),
    [notes, filters, showCompleted, sort]);
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const lanesById = useMemo(() => new Map(lanes.map((lane) => [lane.id, lane])), [lanes]);
  const hasNotes = notes.some((note) => !note.archived && !note.deletedAt);
  const laneId = lanes[0]?.id ?? null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <main id="main-content" tabIndex={-1} data-export-surface="true" aria-label="Grid" data-testid="grid-workspace"
          className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 flex-1 overflow-y-auto p-4"
          onPointerDown={(event) => { if (event.target === event.currentTarget) clear(); }}>
          {visible.length ? (
            <div className="tk-note-grid" data-testid="note-grid"
              onPointerDown={(event) => { if (event.target === event.currentTarget) clear(); }}>
              {visible.map((note) => (
                <PaperNoteCard key={note.id} note={note}
                  tags={note.tagIds.flatMap((id) => { const tag = tagsById.get(id); return tag ? [tag] : []; })}
                  category={note.categoryId ? categoriesById.get(note.categoryId) ?? null : null}
                  selected={selected.has(note.id)} autoFocus={focused === note.id}
                  menuActions={actions} onTitleChange={actions.setTitle}
                  onContentChange={actions.setContent} onToggleSubtask={actions.toggleSubtask}
                  onSelect={actions.selectNote}
                  className={density === "compact" ? "min-w-0 gap-1.5 p-2.5" : "min-w-0"}
                  metadata={<div className="flex flex-wrap items-center justify-between gap-1 text-[11px] opacity-75">
                    <span>{lanesById.get(note.laneId)?.name ?? "No column"}</span>
                    <time dateTime={note.updatedAt} title={note.updatedAt}>Edited {formatShortDate(note.updatedAt)}</time>
                  </div>}
                />
              ))}
            </div>
          ) : (
            <div role="status" className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <p>{hasNotes ? "No notes match your display settings." : "Your grid is empty. Create your first note."}</p>
              {hasActiveFilters(filters) ? <ClayButton onClick={clearFilters}>Clear filters</ClayButton> : null}
              {hasNotes && !showCompleted ? <ClayButton onClick={() => useSettingsStore.getState().setBoardShowCompleted(true)}>Show completed</ClayButton> : null}
              {!hasNotes && laneId ? <ClayButton onClick={() => actions.addNote(laneId)}>New note</ClayButton> : null}
            </div>
          )}
        </main>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-auto min-w-52">
        <BoardSettingsItems ui={CONTEXT_MENU_PRIMITIVES} />
      </ContextMenuContent>
    </ContextMenu>
  );
}
