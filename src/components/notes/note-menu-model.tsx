"use client";

import {
  Archive,
  ArrowRightLeft,
  CircleCheck,
  CircleSlash,
  Copy,
  Flag,
  FolderTree,
  LayoutDashboard,
  Lock,
  Palette,
  Pencil,
  Pin,
  PinOff,
  Tag as TagIcon,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

import { NoteColorPicker } from "@/components/notes/note-color-picker";
import { NoteCategoryPicker } from "@/components/notes/note-category-picker";
import { NotePriorityPicker } from "@/components/notes/note-priority-picker";
import { NoteTagPicker } from "@/components/notes/note-tag-picker";
import { NoteStylePicker } from "@/components/notes/note-style-picker";
import type { Lane } from "@/types/lane";
import type { Priority } from "@/types/common";
import type { Category, Note, NoteColorId, NoteStyleId, Tag } from "@/types/note";

/**
 * Every action a note's menu can perform (FRONTEND_SPEC.md §38).
 *
 * Grouped into one object so the card that renders the menu does not carry a
 * dozen separate callbacks.
 */
export interface NoteMenuActions {
  onEdit: (noteId: string) => void;
  onDuplicate: (noteId: string) => void;
  onToggleComplete: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onToggleLock: (noteId: string) => void;
  onChangeColor: (noteId: string, color: NoteColorId) => void;
  onChangeStyle: (noteId: string, style: NoteStyleId) => void;
  onChangePriority: (noteId: string, priority: Priority) => void;
  /** Adds or removes one tag. */
  onToggleTag: (noteId: string, tagId: string) => void;
  /** Creates a workspace tag and puts it on this note. */
  onCreateTag: (noteId: string, name: string) => void;
  onChangeCategory: (noteId: string, categoryId: string | null) => void;
  /** Creates a workspace category and assigns it to this note. */
  onCreateCategory: (noteId: string, name: string) => void;
  onChangeLane: (noteId: string, laneId: string) => void;
  onArchive: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  /** Puts the note on the Canvas, or takes it off. */
  onSetOnCanvas: (noteId: string, onCanvas: boolean) => void;
}

/**
 * One row of a note menu, as data.
 *
 * The same menu is reachable two ways — the card's ⋯ button and a right-click
 * — and Radix models those as two separate component families with parallel
 * APIs. Describing the menu as data means the actions, labels, ordering and
 * disabled rules live in exactly one place, and each renderer is a thin map
 * over this list. Duplicating the JSX instead is how the two copies drift.
 */
export type NoteMenuEntry =
  | {
      kind: "item";
      id: string;
      label: string;
      icon: ReactNode;
      onSelect: () => void;
      destructive?: boolean;
      disabled?: boolean;
      /** Native tooltip, used to explain a disabled row. */
      hint?: string;
      /** Extra text for screen readers only. */
      srSuffix?: string;
    }
  | { kind: "separator"; id: string }
  | {
      kind: "submenu";
      id: string;
      label: string;
      icon: ReactNode;
      /** Width class for the submenu panel. */
      widthClass: string;
      content: ReactNode;
    };

export interface BuildNoteMenuOptions {
  note: Note;
  actions: NoteMenuActions;
  /** Destinations for "Move to Column", in board order. */
  lanes: readonly Lane[];
  /** The workspace's vocabulary. */
  tags: readonly Tag[];
  categories: readonly Category[];
  /**
   * False when signed out: the demo vocabulary is read-only, because a tag has
   * no workspace to belong to until there is one.
   */
  taxonomyEditable: boolean;
  /**
   * Renders a lane row. Supplied by the renderer so the destinations use that
   * menu family's own item component.
   */
  renderLaneItem: (lane: Lane, disabled: boolean) => ReactNode;
}

/**
 * Builds the note menu.
 *
 * Two rules from the spec are encoded here:
 *  - Destructive actions sit below their own separator (§38).
 *  - Appearance lives in submenus rather than on the card, keeping the default
 *    board calm (§72).
 *
 * A locked note keeps its menu: locking guards against accidental change, so
 * Unlock — and the deliberate actions reached from here — stay available.
 * Delete is the exception, and is disabled rather than hidden so the reason is
 * discoverable with Unlock two rows above.
 */
export function buildNoteMenu({
  note,
  actions,
  lanes,
  tags,
  categories,
  taxonomyEditable,
  renderLaneItem,
}: BuildNoteMenuOptions): NoteMenuEntry[] {
  return [
    {
      kind: "item",
      id: "edit",
      label: "Edit",
      icon: <Pencil aria-hidden="true" />,
      onSelect: () => actions.onEdit(note.id),
    },
    {
      kind: "item",
      id: "duplicate",
      label: "Duplicate",
      icon: <Copy aria-hidden="true" />,
      onSelect: () => actions.onDuplicate(note.id),
    },
    {
      kind: "item",
      id: "complete",
      label: note.completed ? "Mark Incomplete" : "Mark Done",
      icon: note.completed ? (
        <CircleSlash aria-hidden="true" />
      ) : (
        <CircleCheck aria-hidden="true" />
      ),
      onSelect: () => actions.onToggleComplete(note.id),
    },

    { kind: "separator", id: "sep-state" },

    {
      kind: "item",
      id: "pin",
      label: note.pinned ? "Unpin" : "Pin",
      icon: note.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />,
      onSelect: () => actions.onTogglePin(note.id),
    },
    {
      kind: "item",
      id: "canvas",
      label: note.onCanvas ? "Remove from Canvas" : "Add to Canvas",
      icon: note.onCanvas ? (
        <X aria-hidden="true" />
      ) : (
        <LayoutDashboard aria-hidden="true" />
      ),
      onSelect: () => actions.onSetOnCanvas(note.id, !note.onCanvas),
      // Taking a note off the Canvas leaves it on its column, so this is not
      // a destructive action and needs no confirmation.
      ...(note.onCanvas
        ? { srSuffix: " — the note stays on its column" }
        : {}),
    },
    {
      kind: "item",
      id: "lock",
      label: note.locked ? "Unlock" : "Lock",
      icon: note.locked ? <Unlock aria-hidden="true" /> : <Lock aria-hidden="true" />,
      onSelect: () => actions.onToggleLock(note.id),
    },

    { kind: "separator", id: "sep-appearance" },

    {
      kind: "submenu",
      id: "color",
      label: "Change Color",
      icon: <Palette aria-hidden="true" />,
      widthClass: "w-auto",
      content: (
        <NoteColorPicker
          value={note.appearance.color}
          onChange={(color) => actions.onChangeColor(note.id, color)}
        />
      ),
    },
    {
      kind: "submenu",
      id: "style",
      label: "Change Style",
      icon: <Pencil aria-hidden="true" />,
      widthClass: "w-auto min-w-44",
      content: (
        <NoteStylePicker
          value={note.appearance.style}
          color={note.appearance.color}
          onChange={(style) => actions.onChangeStyle(note.id, style)}
        />
      ),
    },
    {
      kind: "submenu",
      id: "priority",
      label: "Change Priority",
      icon: <Flag aria-hidden="true" />,
      widthClass: "w-auto min-w-36",
      content: (
        <NotePriorityPicker
          value={note.priority}
          onChange={(priority) => actions.onChangePriority(note.id, priority)}
        />
      ),
    },
    {
      kind: "submenu",
      id: "tags",
      label: "Tags",
      icon: <TagIcon aria-hidden="true" />,
      widthClass: "w-auto min-w-48",
      content: (
        <NoteTagPicker
          tags={tags}
          selectedIds={note.tagIds}
          onToggle={(tagId) => actions.onToggleTag(note.id, tagId)}
          {...(taxonomyEditable
            ? { onCreate: (name: string) => actions.onCreateTag(note.id, name) }
            : {})}
        />
      ),
    },
    {
      kind: "submenu",
      id: "category",
      label: "Category",
      icon: <FolderTree aria-hidden="true" />,
      widthClass: "w-auto min-w-48",
      content: (
        <NoteCategoryPicker
          categories={categories}
          selectedId={note.categoryId}
          onSelect={(categoryId) => actions.onChangeCategory(note.id, categoryId)}
          {...(taxonomyEditable
            ? { onCreate: (name: string) => actions.onCreateCategory(note.id, name) }
            : {})}
        />
      ),
    },
    {
      kind: "submenu",
      id: "lane",
      label: "Move to Column",
      icon: <ArrowRightLeft aria-hidden="true" />,
      widthClass: "w-auto min-w-36",
      content: (
        <>{lanes.map((lane) => renderLaneItem(lane, lane.id === note.laneId))}</>
      ),
    },

    // Dangerous actions are separated (FRONTEND_SPEC.md §38).
    { kind: "separator", id: "sep-danger" },

    {
      kind: "item",
      id: "archive",
      label: "Archive",
      icon: <Archive aria-hidden="true" />,
      onSelect: () => actions.onArchive(note.id),
    },
    {
      kind: "item",
      id: "delete",
      label: "Delete",
      icon: <Trash2 aria-hidden="true" />,
      onSelect: () => actions.onDelete(note.id),
      destructive: true,
      disabled: note.locked,
      ...(note.locked
        ? {
            hint: "Unlock this note before deleting it",
            srSuffix: " — unavailable while the note is locked",
          }
        : {}),
    },
  ];
}

/** The accent dot shown beside a destination column. */
export function LaneSwatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-2.5 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}
