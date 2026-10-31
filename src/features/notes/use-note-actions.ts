"use client";

import { useMemo } from "react";

import type { NoteMenuActions } from "@/components/notes/note-menu";
import type { RichDocument } from "@/lib/tiptap/document";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";

export interface NoteActions extends NoteMenuActions {
  addNote: (laneId: string) => void;
  setTitle: (noteId: string, title: string) => void;
  setText: (noteId: string, text: string) => void;
  /** Writes the rich document and its plain-text projection together. */
  setContent: (noteId: string, document: RichDocument, text: string) => void;
  /** Sets or clears the note's cover image. */
  setCover: (noteId: string, coverUrl: string | null) => void;
  toggleSubtask: (noteId: string, subtaskId: string, completed: boolean) => void;
  selectNote: (noteId: string, event: React.MouseEvent) => void;
}

/**
 * Binds the note store to the card and menu components.
 *
 * Every callback is pulled from the store individually rather than through
 * `useNoteStore()`, because selecting the whole store re-renders this hook —
 * and therefore every card below it — on any note change. Zustand actions are
 * created once and keep a stable identity, so the memoized object below only
 * changes when the store itself is replaced. That is what lets `PaperNoteCard`
 * stay memoized.
 *
 * @example
 * const actions = useNoteActions();
 * <PaperNoteCard note={note} menuActions={actions} onTitleChange={actions.setTitle} />
 */
export function useNoteActions(): NoteActions {
  const addNote = useNoteStore((state) => state.addNote);
  const deleteNote = useNoteStore((state) => state.deleteNote);
  const duplicateNote = useNoteStore((state) => state.duplicateNote);
  const setTitle = useNoteStore((state) => state.setTitle);
  const setText = useNoteStore((state) => state.setText);
  const setContent = useNoteStore((state) => state.setContent);
  const expandNote = useNoteStore((state) => state.expandNote);
  const toggleSubtask = useNoteStore((state) => state.toggleSubtask);
  const toggleComplete = useNoteStore((state) => state.toggleComplete);
  const togglePin = useNoteStore((state) => state.togglePin);
  const toggleLock = useNoteStore((state) => state.toggleLock);
  const setArchived = useNoteStore((state) => state.setArchived);
  const setColor = useNoteStore((state) => state.setColor);
  const setStyle = useNoteStore((state) => state.setStyle);
  const setCover = useNoteStore((state) => state.setCover);
  const toggleTag = useNoteStore((state) => state.toggleTag);
  const setCategory = useNoteStore((state) => state.setCategory);

  const taxonomy = useTaxonomyContext();
  const setPriority = useNoteStore((state) => state.setPriority);
  const setLane = useNoteStore((state) => state.setLane);
  const setOnCanvas = useNoteStore((state) => state.setOnCanvas);
  const focusNote = useNoteStore((state) => state.focusNote);

  const select = useSelectionStore((state) => state.select);

  return useMemo<NoteActions>(
    () => ({
      addNote: (laneId) => {
        addNote(laneId);
      },
      setTitle,
      setText,
      setContent,
      setCover,
      toggleSubtask,

      // Edit opens the full-screen editor (IMPLEMENTATION_PLAN.md §15). It
      // used to move focus to the card's title, which was the best available
      // "open for editing" before there was anywhere to open it to.
      onEdit: expandNote,

      onDuplicate: (noteId) => {
        const copyId = duplicateNote(noteId);
        if (copyId) focusNote(copyId);
      },

      onToggleComplete: toggleComplete,
      onTogglePin: togglePin,
      onToggleLock: toggleLock,
      onChangeColor: setColor,
      onChangeStyle: setStyle,
      onChangePriority: setPriority,
      onToggleTag: toggleTag,
      onChangeCategory: setCategory,

      /*
       * Create-and-assign, in that order and deliberately not optimistic.
       *
       * The note can only reference a tag by id, and the id does not exist
       * until the server has made it. Inventing one locally would mean the
       * note points at a tag nobody else can resolve if the insert then fails.
       */
      onCreateTag: (noteId, name) => {
        taxonomy.createTag(name, null, (tag) => toggleTag(noteId, tag.id));
      },
      onCreateCategory: (noteId, name) => {
        taxonomy.createCategory(name, null, null, (category) =>
          setCategory(noteId, category.id),
        );
      },
      onChangeLane: setLane,
      onArchive: (noteId) => setArchived(noteId, true),
      onSetOnCanvas: setOnCanvas,
      onDelete: deleteNote,

      selectNote: (noteId, event) => {
        // Ctrl/Cmd adds or removes one note; Shift extends; a plain click
        // replaces the selection (PRODUCT_SPEC.md → "Multi-Select").
        const mode = event.ctrlKey || event.metaKey
          ? "toggle"
          : event.shiftKey
            ? "add"
            : "replace";

        select(noteId, mode);
      },
    }),
    [
      addNote,
      deleteNote,
      duplicateNote,
      expandNote,
      focusNote,
      select,
      setContent,
      setCover,
      setArchived,
      setColor,
      setPriority,
      setLane,
      setCategory,
      setOnCanvas,
      setStyle,
      taxonomy,
      toggleTag,
      setText,
      setTitle,
      toggleComplete,
      toggleLock,
      togglePin,
      toggleSubtask,
    ],
  );
}
