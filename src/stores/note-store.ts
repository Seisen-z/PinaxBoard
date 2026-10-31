"use client";

import { recurringSuccessor, repeatRule, type RepeatFrequency } from "@/features/reminders/schedule";
import { parseDate } from "@/features/calendar/month";
import { create } from "zustand";
import { useBoardAccess, guardBoardActions } from "@/features/collaboration/access";
import { createJSONStorage, persist } from "zustand/middleware";

import { getNoteStyle } from "@/config/note-styles";
import { MOCK_BOARD_ID, MOCK_OWNER_ID } from "@/features/board/board-identity";
import { migrateLocalNotes } from "@/features/notes/legacy-samples";
import { createBlankNote } from "@/features/notes/create-note";
import type { Point } from "@/lib/canvas";
import { fromPlainText, type RichDocument } from "@/lib/tiptap/document";
import { createId } from "@/lib/utils";
import type { Priority } from "@/types/common";
import type {
  Note,
  NoteColorId,
  NoteStyleId,
  NoteTransform,
} from "@/types/note";

/**
 * Client-side note state for Milestone 3 (IMPLEMENTATION_PLAN.md Â§9).
 *
 * This store is the temporary source of truth. Milestone 8 moves durable note
 * data to Supabase behind TanStack Query and leaves this store holding only
 * interaction state â€” so every action here is deliberately shaped like a
 * mutation payload (`id` plus a patch) rather than a React state setter.
 *
 * Persistence is `localStorage`, which IMPLEMENTATION_PLAN.md Â§9 permits for
 * "prototype continuity". It is not a substitute for the real backend.
 */

export interface AddNoteOptions {
  startAt?: string | null;
  dueAt?: string | null;
  /** Also place the note on the Canvas. */
  onCanvas?: boolean;
  inbox?: boolean;
  /** Canvas position. Supplied when creating from the Canvas itself. */
  x?: number;
  y?: number;
}

/** Spacing used when laying notes onto the Canvas automatically. */
const CANVAS_DROP_ORIGIN = { x: 80, y: 80 };
const CANVAS_DROP_STEP = { x: 300, y: 280 };
const CANVAS_DROP_COLUMNS = 4;

/**
 * Picks a spot for a note arriving on the Canvas.
 *
 * A note created from the Board has no meaningful position â€” it sits at the
 * origin â€” so sending several to the Canvas would pile them all on one another.
 * Notes that already carry a position keep it, because the user put them there.
 */
function placeOnCanvas(
  note: Note,
  alreadyPlaced: readonly Note[],
): { x: number; y: number } {
  const atOrigin = note.transform.x === 0 && note.transform.y === 0;
  if (!atOrigin) return { x: note.transform.x, y: note.transform.y };

  const index = alreadyPlaced.length;
  const column = index % CANVAS_DROP_COLUMNS;
  const row = Math.floor(index / CANVAS_DROP_COLUMNS);

  return {
    x: CANVAS_DROP_ORIGIN.x + column * CANVAS_DROP_STEP.x,
    y: CANVAS_DROP_ORIGIN.y + row * CANVAS_DROP_STEP.y,
  };
}

/** The board a new note is stamped with. See `NoteStoreState.boardContext`. */
export interface BoardContext {
  boardId: string;
  ownerId: string;
}

/** Local, signed-out mode: the single mock board. */
export const LOCAL_BOARD_CONTEXT: BoardContext = {
  boardId: MOCK_BOARD_ID,
  ownerId: MOCK_OWNER_ID,
};

/** The action set from IMPLEMENTATION_PLAN.md Â§9. */
export interface NoteStoreState {
  notes: Note[];
  legacySamplesPending: boolean;
  restoringNoteId: string | null;
  lastRestoration: { noteId: string; at: string } | null;
  setRestoring: (id: string | null) => void;
  applyRestoredNote: (note: Note) => void;
  /**
   * The note whose card should take focus â€” set on create, and by Edit from
   * the context menu. Interaction state, so it is never persisted.
   */
  focusedNoteId: string | null;
  /**
   * The note open in the full-screen editor, or `null`.
   *
   * Deliberately separate from `focusedNoteId`: "put the caret in this card"
   * and "open this note full screen" are different intentions, and collapsing
   * them would mean every newly created note opened a modal over the board.
   * Interaction state, so it is never persisted.
   */
  expandedNoteId: string | null;
  /**
   * Which board the notes in this store belong to, and who owns them.
   *
   * A new note has to be stamped with these, and before Milestone 8 they were
   * hard-coded to the local mock pair â€” which meant a signed-in user's notes
   * were written with `board_id: "mock-board"` and rejected by Postgres as a
   * malformed uuid, so nothing they created ever saved. It is set by whoever
   * fills `notes`, which is why `reset` takes it: the context and the records
   * describe the same board, and a context that can be set separately is a
   * context that can be forgotten.
   *
   * Session state, never persisted â€” a signed-out reload must not inherit the
   * previous session's cloud board.
   */
  boardContext: BoardContext;

  addNote: (laneId: string, options?: AddNoteOptions) => string;
  deleteNote: (noteId: string) => void;
  restoreFromTrash: (noteId:string, fallbackLaneId?:string)=>void;
  removePurgedNotes: (ids:readonly string[], serverConfirmed?:boolean)=>void;
  duplicateNote: (noteId: string) => string | null;

  setInbox: (noteId: string, inbox: boolean) => void;
  setTitle: (noteId: string, title: string) => void;
  setStartAt: (noteId: string, startAt: string | null) => void;
  setDueAt: (noteId: string, dueAt: string | null) => void;
  setReminder: (noteId: string, remindAt: string | null) => void;
  setRepeat: (noteId: string, frequency: RepeatFrequency | null) => void;
  setText: (noteId: string, text: string) => void;
  /**
   * Writes a note's rich document and its plain-text projection together.
   *
   * `setText` remains for callers that only have a string â€” it builds the
   * matching document â€” but the editor uses this, since it already holds both.
   */
  setContent: (noteId: string, content: RichDocument, text: string) => void;
  toggleSubtask: (noteId: string, subtaskId: string, completed: boolean) => void;

  toggleComplete: (noteId: string) => void;
  togglePin: (noteId: string) => void;
  toggleLock: (noteId: string) => void;
  setArchived: (noteId: string, archived: boolean) => void;
  /**
   * Puts a note on the Canvas, or takes it off.
   *
   * Taking it off never deletes anything â€” the note stays on its column.
   */
  setOnCanvas: (noteId: string, onCanvas: boolean) => void;
  /** Sends every note of one column to the Canvas. */
  sendLaneToCanvas: (laneId: string) => void;

  /**
   * Commits a canvas transform. Called once on `pointerup`, never per
   * pointer move (FRONTEND_SPEC.md Â§77).
   */
  setTransform: (noteId: string, patch: Partial<NoteTransform>) => void;
  /** Commits a move for several notes at once, after a multi-select drag. */
  moveNotes: (moves: ReadonlyMap<string, Point>) => void;
  /** Layer controls (PRODUCT_SPEC.md â†’ "Layer Controls"). */
  bringForward: (noteId: string) => void;
  sendBackward: (noteId: string) => void;
  bringToFront: (noteId: string) => void;
  sendToBack: (noteId: string) => void;

  setColor: (noteId: string, color: NoteColorId) => void;
  setStyle: (noteId: string, style: NoteStyleId) => void;
  /**
   * Sets or clears a note's cover image.
   *
   * The value is either an absolute `https://` URL the user supplied, or the
   * storage path of an object in the `covers` bucket. See `resolveCoverSource`
   * â€” a signed URL must never be stored, because it expires.
   */
  setCover: (noteId: string, coverUrl: string | null) => void;
  setPriority: (noteId: string, priority: Priority) => void;
  /** Adds a tag to a note, or removes it if already there. */
  toggleTag: (noteId: string, tagId: string) => void;
  /** Removes a tag from every note. Used when the tag itself is deleted. */
  removeTagEverywhere: (tagId: string) => void;
  /** Assigns a note to a category, or clears it with `null`. */
  setCategory: (noteId: string, categoryId: string | null) => void;
  /** Clears a category from every note that carried it. */
  clearCategoryEverywhere: (categoryId: string) => void;
  /** Moves a note into another board column. */
  setLane: (noteId: string, laneId: string) => void;

  /** Moves focus to a note's card. */
  focusNote: (noteId: string) => void;
  /** Opens a note in the full-screen editor. */
  expandNote: (noteId: string) => void;
  /** Closes the full-screen editor. */
  collapseNote: () => void;
  /** Moves every note out of one lane and into another. */
  moveNotesToLane: (fromLaneId: string, toLaneId: string) => void;
  /** Deletes a lane's notes, except locked ones. */
  deleteNotesInLane: (laneId: string) => void;

  /** Clears focus once the card has taken it. */
  clearFocus: () => void;
  /** Replaces all notes. Used by tests and by the Supabase swap later. */
  /**
   * Replaces the store's contents with one board's notes.
   *
   * `context` is the board those notes came from; it defaults to the local mock
   * board so signed-out callers and tests read naturally.
   */
  reset: (notes: readonly Note[], context?: BoardContext) => void;
}

/**
 * Locking protects a note from change: its content and position are frozen,
 * and it cannot be deleted (PRODUCT_SPEC.md â†’ "Locking").
 *
 * Delete is guarded because losing a note the user explicitly protected is the
 * one outcome a lock exists to prevent. Unlock stays available, so an
 * accidentally locked note is never stranded â€” the user unlocks, then deletes.
 *
 * Appearance and priority changes are still allowed: they are reversible, do
 * not touch content, and are the adjustments people make while a reference
 * note sits pinned and locked on the board.
 */
const EDIT_GUARDED_BY_LOCK = true;

/** Applies a patch to one note and refreshes its `updatedAt` stamp. */
function patchNote(
  notes: Note[],
  noteId: string,
  patch: (note: Note) => Partial<Note> | null,
): Note[] {
  let changed = false;

  const next = notes.map((note) => {
    if (note.id !== noteId || useNoteStore.getState().restoringNoteId === noteId) return note;

    const partial = patch(note);
    if (!partial) return note;

    changed = true;
    return { ...note, ...partial, updatedAt: new Date().toISOString() };
  });

  // Returning the original array keeps referential equality, so subscribers
  // selecting `notes` do not re-render on a no-op action.
  return changed ? next : notes;
}

/**
 * Swaps a note's z-index with its nearest neighbour in that direction.
 *
 * Incrementing the z-index instead would be wrong: with two notes at 1 and 5,
 * "bring forward" must put the lower one above 5, not at 2 where it still sits
 * underneath. Swapping with the neighbour keeps the stack an ordered sequence.
 */
function shiftLayer(noteId: string, direction: "forward" | "backward") {
  return (state: { notes: Note[] }): { notes: Note[] } => {
    const target = state.notes.find((note) => note.id === noteId);
    if (!target) return state;

    const z = target.transform.zIndex;

    const neighbours = state.notes.filter((note) =>
      direction === "forward"
        ? note.transform.zIndex > z
        : note.transform.zIndex < z,
    );

    if (neighbours.length === 0) return state;

    const neighbour = neighbours.reduce((best, note) =>
      direction === "forward"
        ? note.transform.zIndex < best.transform.zIndex
          ? note
          : best
        : note.transform.zIndex > best.transform.zIndex
          ? note
          : best,
    );

    const stamp = new Date().toISOString();

    return {
      notes: state.notes.map((note) => {
        if (note.id === target.id) {
          return {
            ...note,
            transform: { ...note.transform, zIndex: neighbour.transform.zIndex },
            updatedAt: stamp,
          };
        }

        if (note.id === neighbour.id) {
          return {
            ...note,
            transform: { ...note.transform, zIndex: z },
            updatedAt: stamp,
          };
        }

        return note;
      }),
    };
  };
}

const initialState = {
  notes: [] as Note[],
  legacySamplesPending: false,
  restoringNoteId: null as string | null,
  lastRestoration: null as { noteId: string; at: string } | null,
  focusedNoteId: null as string | null,
  expandedNoteId: null as string | null,
  boardContext: LOCAL_BOARD_CONTEXT,
};

export const useNoteStore = create<NoteStoreState>()(
  persist(
    (set, get) => guardBoardActions<NoteStoreState>({
      ...initialState,
      setRestoring: (id) => set((state) => ({ restoringNoteId: id !== null && state.restoringNoteId ? state.restoringNoteId : id })),
      applyRestoredNote: (note) => set((state) => {
        if(state.restoringNoteId !== note.id || state.boardContext.boardId !== note.boardId || state.boardContext.ownerId !== note.ownerId) return state;
        return {notes:state.notes.map((current)=>current.id===note.id?note:current),restoringNoteId:null,lastRestoration:{noteId:note.id,at:note.updatedAt}};
      }),

      addNote: (laneId, options = {}) => {
        // A blank note appears immediately â€” no dialog, no chooser
        // (FRONTEND_SPEC.md Â§23).
        const highestZ = get().notes.reduce(
          (max, note) => Math.max(max, note.transform.zIndex),
          0,
        );

        const { boardId, ownerId } = get().boardContext;

        const note = { ...createBlankNote({
          boardId,
          ownerId,
          laneId,
          zIndex: highestZ + 1,
          onCanvas: options.onCanvas ?? false,
          ...(options.x === undefined ? {} : { x: options.x }),
          ...(options.y === undefined ? {} : { y: options.y }),
        }), inbox: options.inbox ?? false, createdBy: useBoardAccess.getState().actorId ?? ownerId };

        note.dueAt = options.dueAt ?? null;
        note.startAt = options.startAt ?? null;

        set((state) => ({
          notes: [note, ...state.notes],
          focusedNoteId: note.id,
        }));

        return note.id;
      },

      deleteNote: (noteId) => {
        set((state) => {
          const target = state.notes.find((note) => note.id === noteId);

          // A locked note cannot be deleted. Returning the untouched state
          // keeps the array identity stable, so nothing re-renders.
          if (!target || target.deletedAt || state.restoringNoteId===noteId || (EDIT_GUARDED_BY_LOCK && target.locked)) return state;

          return {
            notes: state.notes.map((note) => note.id===noteId?{...note,deletedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:note),
            focusedNoteId:
              state.focusedNoteId === noteId ? null : state.focusedNoteId,
            // Otherwise the full-screen editor stays open over a note that no
            // longer exists.
            expandedNoteId:
              state.expandedNoteId === noteId ? null : state.expandedNoteId,
          };
        });
      },

      restoreFromTrash: (noteId,fallbackLaneId) => set((state)=>({
        notes:state.notes.map((note)=>note.id===noteId&&note.deletedAt?{...note,deletedAt:null,laneId:fallbackLaneId??note.laneId,updatedAt:new Date().toISOString()}:note),
      })),
      removePurgedNotes: (ids,serverConfirmed=false) => set((state)=>({
        notes:state.notes.filter((note)=>!ids.includes(note.id)||(!serverConfirmed&&(!note.deletedAt||note.locked))||note.boardId!==state.boardContext.boardId||note.ownerId!==state.boardContext.ownerId),
        expandedNoteId:ids.includes(state.expandedNoteId??"")?null:state.expandedNoteId,
        focusedNoteId:ids.includes(state.focusedNoteId??"")?null:state.focusedNoteId,
      })),

      duplicateNote: (noteId) => {
        const source = get().notes.find((note) => note.id === noteId);
        if (!source) return null;

        const now = new Date().toISOString();
        const copy: Note = {
          ...source,
          createdBy: useBoardAccess.getState().actorId ?? source.ownerId,
          id: createId(),
          // A duplicate is a fresh, unpinned note offset from its source, so it
          // does not land exactly beneath the original on the canvas.
          pinned: false,
          completedAt: null,
          ...(source.remindAt !== undefined ? { remindAt: null } : {}),
          ...(source.repeatRule !== undefined ? { repeatRule: null } : {}),
          ...(source.recurrenceSourceId !== undefined ? { recurrenceSourceId: null } : {}),
          transform: {
            ...source.transform,
            x: source.transform.x + 24,
            y: source.transform.y + 24,
            zIndex: source.transform.zIndex + 1,
          },
          // Subtasks are value objects owned by the note, so they need new ids.
          subtasks: source.subtasks.map((subtask, index) => ({
            ...subtask,
            id: `${subtask.id}-copy-${index}`,
          })),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const index = state.notes.findIndex((note) => note.id === noteId);
          const notes = [...state.notes];
          notes.splice(index + 1, 0, copy);
          return { notes };
        });

        return copy.id;
      },

      setStartAt: (noteId, startAt) => {
        if (startAt !== null && Number.isNaN(new Date(startAt).getTime())) return;
        set((state) => ({ notes: patchNote(state.notes, noteId, (note) =>
          note.locked || note.startAt === startAt ? null : { startAt },
        ) }));
      },

      setDueAt: (noteId, dueAt) => {
        if (dueAt !== null && Number.isNaN(new Date(dueAt).getTime())) return;
        set((state) => ({ notes: patchNote(state.notes, noteId, (note) =>
          note.locked || note.dueAt === dueAt ? null : { dueAt, ...(note.repeatRule ? { repeatRule: dueAt ? repeatRule(note.repeatRule.frequency, dueAt) : null } : {}) },
        ) }));
      },

      setInbox: (noteId, inbox) => set((state) => ({ notes: patchNote(state.notes, noteId, (note) => note.locked ? null : { inbox }) })),
      setTitle: (noteId, title) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) =>
            EDIT_GUARDED_BY_LOCK && note.locked ? null : { title },
          ),
        }));
      },

      setText: (noteId, text) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) =>
            EDIT_GUARDED_BY_LOCK && note.locked
              ? null
              : // Keep the document in step, or the next render would resolve
                // the stale `content` and put the old text straight back.
                { excerpt: text, content: fromPlainText(text) },
          ),
        }));
      },

      setContent: (noteId, content, text) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) =>
            EDIT_GUARDED_BY_LOCK && note.locked
              ? null
              : // Both in one patch, deliberately. `excerpt` is the plain-text
                // projection of `content` â€” search, previews and sorting read
                // it â€” so writing one without the other is how they drift.
                { content, excerpt: text },
          ),
        }));
      },

      toggleSubtask: (noteId, subtaskId, completed) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => {
            if (EDIT_GUARDED_BY_LOCK && note.locked) return null;

            return {
              subtasks: note.subtasks.map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, completed } : subtask,
              ),
            };
          }),
        }));
      },

      setReminder: (noteId, remindAt) => {
        if (remindAt !== null && !parseDate(remindAt)) return;
        set((state) => ({ notes: patchNote(state.notes, noteId, (note) => note.locked ? null : { remindAt }) }));
      },
      setRepeat: (noteId, frequency) => {
        set((state) => ({ notes: patchNote(state.notes, noteId, (note) => {
          if (note.locked || (frequency && !note.dueAt)) return null;
          return { repeatRule: frequency && note.dueAt ? repeatRule(frequency, note.dueAt) : null };
        }) }));
      },
      toggleComplete: (noteId) => {
        set((state) => {
          const source = state.notes.find((note) => note.id === noteId);
          if (!source || source.archived || source.deletedAt || state.restoringNoteId === noteId) return state;
          const completed = !source.completed;
          const now = new Date().toISOString();
          const next = completed ? recurringSuccessor(source, now) : null;
          const notes = patchNote(state.notes, noteId, (note) => ({
            ...(next && note.repeatRule ? { repeatRule: { ...note.repeatRule, nextId: next.id } } : {}),
            completed, completedAt: completed ? now : null,
            subtasks: completed ? note.subtasks.map((subtask) => ({ ...subtask, completed: true })) : note.subtasks,
          }));
          if (next && !notes.some((note) => note.id === next.id)) notes.push({ ...next, createdBy: useBoardAccess.getState().actorId ?? next.ownerId });
          return { notes };
        });
      },

      togglePin: (noteId) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => ({
            pinned: !note.pinned,
          })),
        }));
      },

      toggleLock: (noteId) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => ({
            locked: !note.locked,
          })),
        }));
      },

      setArchived: (noteId, archived) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, () => ({ archived })),
        }));
      },

      setTransform: (noteId, patch) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => {
            // A locked note cannot be moved or resized
            // (PRODUCT_SPEC.md â†’ "Locking").
            if (EDIT_GUARDED_BY_LOCK && note.locked) return null;

            return { transform: { ...note.transform, ...patch } };
          }),
        }));
      },

      moveNotes: (moves) => {
        if (moves.size === 0) return;

        set((state) => {
          const stamp = new Date().toISOString();
          let changed = false;

          const notes = state.notes.map((note) => {
            const delta = moves.get(note.id);
            if (!delta || note.locked) return note;

            changed = true;
            return {
              ...note,
              transform: {
                ...note.transform,
                x: delta.x,
                y: delta.y,
              },
              updatedAt: stamp,
            };
          });

          return changed ? { notes } : state;
        });
      },

      bringForward: (noteId) => set(shiftLayer(noteId, "forward")),
      sendBackward: (noteId) => set(shiftLayer(noteId, "backward")),

      bringToFront: (noteId) => {
        set((state) => {
          const top = state.notes.reduce(
            (max, note) => Math.max(max, note.transform.zIndex),
            0,
          );

          return {
            notes: patchNote(state.notes, noteId, (note) =>
              note.transform.zIndex === top
                ? null
                : { transform: { ...note.transform, zIndex: top + 1 } },
            ),
          };
        });
      },

      sendToBack: (noteId) => {
        set((state) => {
          const bottom = state.notes.reduce(
            (min, note) => Math.min(min, note.transform.zIndex),
            Number.POSITIVE_INFINITY,
          );
          const floor = Number.isFinite(bottom) ? bottom : 0;

          return {
            notes: patchNote(state.notes, noteId, (note) =>
              note.transform.zIndex === floor
                ? null
                : { transform: { ...note.transform, zIndex: floor - 1 } },
            ),
          };
        });
      },

      setOnCanvas: (noteId, onCanvas) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => {
            if (note.onCanvas === onCanvas) return null;
            if (!onCanvas) return { onCanvas };

            return {
              onCanvas,
              transform: {
                ...note.transform,
                ...placeOnCanvas(note, state.notes),
              },
            };
          }),
        }));
      },

      sendLaneToCanvas: (laneId) => {
        set((state) => {
          const stamp = new Date().toISOString();
          let placed = state.notes.filter((note) => note.onCanvas);
          let changed = false;

          const notes = state.notes.map((note) => {
            if (note.laneId !== laneId || note.onCanvas) return note;
            if (note.archived || note.deletedAt) return note;

            changed = true;
            const moved: Note = {
              ...note,
              onCanvas: true,
              transform: { ...note.transform, ...placeOnCanvas(note, placed) },
              updatedAt: stamp,
            };

            // Count each note as it lands, so a column arrives as a tidy grid
            // rather than a single stack in one spot.
            placed = [...placed, moved];
            return moved;
          });

          return changed ? { notes } : state;
        });
      },

      setColor: (noteId, color) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => ({
            appearance: { ...note.appearance, color },
          })),
        }));
      },

      toggleTag: (noteId, tagId) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => {
            if (EDIT_GUARDED_BY_LOCK && note.locked) return null;

            const has = note.tagIds.includes(tagId);

            return {
              tagIds: has
                ? note.tagIds.filter((id) => id !== tagId)
                : [...note.tagIds, tagId],
            };
          }),
        }));
      },

      removeTagEverywhere: (tagId) => {
        set((state) => {
          let changed = false;

          const notes = state.notes.map((note) => {
            if (!note.tagIds.includes(tagId)) return note;

            changed = true;
            return {
              ...note,
              tagIds: note.tagIds.filter((id) => id !== tagId),
              updatedAt: new Date().toISOString(),
            };
          });

          // Returning the same array when nothing matched keeps the reference
          // stable, so the sync engine's diff sees no change and the board
          // does not re-render.
          return changed ? { notes } : state;
        });
      },

      setCategory: (noteId, categoryId) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) =>
            EDIT_GUARDED_BY_LOCK && note.locked ? null : { categoryId },
          ),
        }));
      },

      clearCategoryEverywhere: (categoryId) => {
        set((state) => {
          let changed = false;

          const notes = state.notes.map((note) => {
            if (note.categoryId !== categoryId) return note;

            changed = true;
            return {
              ...note,
              categoryId: null,
              updatedAt: new Date().toISOString(),
            };
          });

          return changed ? { notes } : state;
        });
      },

      setCover: (noteId, coverUrl) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) =>
            EDIT_GUARDED_BY_LOCK && note.locked
              ? null
              : { appearance: { ...note.appearance, coverUrl } },
          ),
        }));
      },

      setStyle: (noteId, style) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) => {
            const definition = getNoteStyle(style);

            return {
              appearance: {
                ...note.appearance,
                style,
                // Dark Card and Kraft Paper imply their paper. Writing that
                // color through means the swatch shown in the color picker
                // matches what the card actually renders.
                color: definition.forcedColor ?? note.appearance.color,
              },
            };
          }),
        }));
      },

      setPriority: (noteId, priority) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, () => ({ priority })),
        }));
      },

      setLane: (noteId, laneId) => {
        set((state) => ({
          notes: patchNote(state.notes, noteId, (note) =>
            note.laneId === laneId ? null : { laneId },
          ),
        }));
      },

      /**
       * Rehomes every note of a removed lane. Called by the lane deletion
       * flow, which owns the decision of where they go.
       */
      moveNotesToLane: (fromLaneId, toLaneId) => {
        set((state) => {
          const stamp = new Date().toISOString();
          let changed = false;

          const notes = state.notes.map((note) => {
            if (note.laneId !== fromLaneId) return note;
            changed = true;
            return { ...note, laneId: toLaneId, updatedAt: stamp };
          });

          return changed ? { notes } : state;
        });
      },

      deleteNotesInLane: (laneId) => {
        for(const note of get().notes)if(note.laneId===laneId)get().deleteNote(note.id);
      },

      focusNote: (noteId) => set({ focusedNoteId: noteId }),

      expandNote: (noteId) => { if(get().notes.some((note)=>note.id===noteId&&!note.deletedAt))set({ expandedNoteId: noteId }); },

      collapseNote: () => set({ expandedNoteId: null }),

      clearFocus: () => set({ focusedNoteId: null }),

      reset: (notes, context = LOCAL_BOARD_CONTEXT) =>
        set({
          notes: [...notes],
          legacySamplesPending: false,
          focusedNoteId: null,
          expandedNoteId: null,
          restoringNoteId: null,
          lastRestoration: null,
          boardContext: context,
        }),
    }, () => get().boardContext.boardId, ["reset","focusNote","expandNote","collapseNote","clearFocus","setRestoring","applyRestoredNote","removePurgedNotes"]),
    {
      name: "tackly:notes",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, version) => migrateLocalNotes(persisted, localStorage, version),
      // Only the records persist. `focusedNoteId` is interaction state and
      // would steal focus on reload if it survived.
      partialize: (state) => ({ notes: state.notes, legacySamplesPending: state.legacySamplesPending }),
      merge: (persisted, current) => {
        const saved = persisted as { notes?: Note[]; legacySamplesPending?: boolean } | undefined;
        if (!saved?.legacySamplesPending) return { ...current, ...saved };
        const cleaned = migrateLocalNotes(saved, localStorage, 2);
        if (!cleaned.legacySamplesPending) {
          try { localStorage.setItem("tackly:notes", JSON.stringify({ state: cleaned, version: 2 })); }
          catch { return { ...current, ...saved }; }
        }
        return { ...current, ...cleaned };
      },
      // The server has no localStorage, so hydrating during render would
      // produce markup that disagrees with the client. `useHydrateNoteStore`
      // rehydrates in an effect instead.
      skipHydration: true,
    },
  ),
);

/** Reads the notes array. Exported so components share one selector identity. */
export const selectNotes = (state: NoteStoreState): Note[] => state.notes;

/** Reads a single note, or `undefined` if it has been deleted. */
export function selectNote(noteId: string) {
  return (state: NoteStoreState): Note | undefined =>
    state.notes.find((note) => note.id === noteId);
}
