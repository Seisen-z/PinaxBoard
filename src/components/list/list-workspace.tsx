"use client";

import { VirtualList } from "@/components/ui/virtual-list";
import { useMemo } from "react";
import { BoardSettingsItems } from "@/components/board/board-controls";
import { ListNoteRow } from "@/components/list/list-note-row";
import { ClayButton } from "@/components/ui/clay-button";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CONTEXT_MENU_PRIMITIVES } from "@/components/ui/menu-primitives";
import { hasActiveFilters } from "@/features/board/filter-notes";
import { visibleNotes } from "@/features/board/visible-notes";
import { useNoteActions } from "@/features/notes/use-note-actions";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";
import { useSettingsStore } from "@/stores/settings-store";

export function ListWorkspace() {
  const notes = useNoteStore((state) => state.notes);
  const focused = useNoteStore((state) => state.focusedNoteId);
  const lanes = useLaneStore((state) => state.lanes);
  const selected = useSelectionStore((state) => state.selectedIds);
  const clear = useSelectionStore((state) => state.clear);
  const filters = useSettingsStore((state) => state.boardFilters);
  const showCompleted = useSettingsStore((state) => state.boardShowCompleted);
  const sort = useSettingsStore((state) => state.boardSort);
  const clearFilters = useSettingsStore((state) => state.clearBoardFilters);
  const actions = useNoteActions();
  const { tags, categories } = useTaxonomyContext();
  const visible = useMemo(() => visibleNotes(notes, filters, showCompleted, sort), [notes, filters, showCompleted, sort]);
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const lanesById = useMemo(() => new Map(lanes.map((lane) => [lane.id, lane])), [lanes]);
  const hasNotes = notes.some((note) => !note.archived && !note.deletedAt);
  const laneId = lanes[0]?.id;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <main id="main-content" tabIndex={-1} data-export-surface="true" aria-label="List" data-testid="list-workspace"
          className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 min-w-0 flex-1 overflow-y-auto p-2 sm:p-4"
          onPointerDown={(event) => { if (event.target === event.currentTarget) clear(); }}>
          {visible.length ? (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
              {visible.length > 200 ? <VirtualList items={visible} getKey={noteKey} focusKey={focused} renderItem={(note) => <ListNoteRow key={note.id} note={note}
                tags={note.tagIds.flatMap((id) => { const tag = tagsById.get(id); return tag ? [tag] : []; })}
                category={note.categoryId ? categoriesById.get(note.categoryId) ?? null : null}
                laneName={lanesById.get(note.laneId)?.name ?? "No column"}
                selected={selected.has(note.id)} autoFocus={focused === note.id} actions={actions} />} /> : visible.map((note) => <ListNoteRow key={note.id} note={note}
                tags={note.tagIds.flatMap((id) => { const tag = tagsById.get(id); return tag ? [tag] : []; })}
                category={note.categoryId ? categoriesById.get(note.categoryId) ?? null : null}
                laneName={lanesById.get(note.laneId)?.name ?? "No column"}
                selected={selected.has(note.id)} autoFocus={focused === note.id} actions={actions} />)}

            </div>
          ) : (
            <div role="status" className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <p>{hasNotes ? "No notes match your display settings." : "Your list is empty. Create your first note."}</p>
              {hasActiveFilters(filters) ? <ClayButton onClick={clearFilters}>Clear filters</ClayButton> : null}
              {hasNotes && !showCompleted ? <ClayButton onClick={() => useSettingsStore.getState().setBoardShowCompleted(true)}>Show completed</ClayButton> : null}
              {!hasNotes && laneId ? <ClayButton onClick={() => actions.addNote(laneId)}>New note</ClayButton> : null}
            </div>
          )}
        </main>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-auto min-w-52"><BoardSettingsItems ui={CONTEXT_MENU_PRIMITIVES} /></ContextMenuContent>
    </ContextMenu>
  );
}

function noteKey(note: { id: string }): string { return note.id; }
