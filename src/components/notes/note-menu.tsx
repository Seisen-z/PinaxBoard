"use client";

import { useCanEditBoard } from "@/features/collaboration/access";
import type { ReactNode } from "react";

import {
  LaneSwatch,
  buildNoteMenu,
  type NoteMenuActions,
  type NoteMenuEntry,
} from "@/components/notes/note-menu-model";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CONTEXT_MENU_PRIMITIVES,
  DROPDOWN_MENU_PRIMITIVES,
  type MenuPrimitives,
} from "@/components/ui/menu-primitives";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { selectOrderedLanes, useLaneStore } from "@/stores/lane-store";
import type { Note } from "@/types/note";

export type { NoteMenuActions } from "@/components/notes/note-menu-model";

export interface NoteMenuProps {
  note: Note;
  actions: NoteMenuActions;
  /** The element that opens the menu. */
  children: ReactNode;
}

/**
 * The note's ⋯ menu (FRONTEND_SPEC.md §38).
 *
 * Shares its contents with {@link NoteContextMenu} through
 * `buildNoteMenu` — see the note there on why the menu is described as data.
 *
 * @example
 * <NoteMenu note={note} actions={actions}>
 *   <NoteMoreButton noteTitle={note.title} />
 * </NoteMenu>
 */
export function NoteMenu({ note, actions, children }: NoteMenuProps) {
  const canEdit = useCanEditBoard();
  const lanes = useLaneStore(selectOrderedLanes);
  const taxonomy = useTaxonomyContext();

  const entries = buildNoteMenu({
    note,
    actions,
    lanes,
    tags: taxonomy.tags,
    categories: taxonomy.categories,
    taxonomyEditable: taxonomy.editable,
    renderLaneItem: (lane, disabled) => (
      <DropdownMenuItem
        key={lane.id}
        disabled={disabled}
        onSelect={() => actions.onChangeLane(note.id, lane.id)}
      >
        <LaneSwatch color={lane.color} />
        {lane.name}
      </DropdownMenuItem>
    ),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>

      {/*
        The generated content defaults to the trigger's width, which for an
        icon button is far too narrow to read the action labels.
      */}
      <DropdownMenuContent
        align="end"
        className="w-auto min-w-52"
        aria-label={`Actions for ${note.title || "Untitled"}`}
      >
        {canEdit ? entries.map((entry) => renderEntry(entry, DROPDOWN_MENU_PRIMITIVES)) : <DropdownMenuItem onSelect={()=>actions.onEdit(note.id)}>Open note</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface NoteContextMenuProps {
  note: Note;
  actions: NoteMenuActions;
  /** The note card. Right-clicking anywhere in it opens the menu. */
  children: ReactNode;
}

/**
 * The same menu, on right-click.
 *
 * Radix's `ContextMenu` calls `preventDefault()` on `contextmenu` for its
 * trigger, so the browser's own menu is suppressed over a note — and still
 * available everywhere else on the page, which is what you want for copying
 * text or opening a link.
 *
 * @example
 * <NoteContextMenu note={note} actions={actions}>
 *   <PaperNoteCard note={note} … />
 * </NoteContextMenu>
 */
export function NoteContextMenu({
  note,
  actions,
  children,
}: NoteContextMenuProps) {
  const canEdit = useCanEditBoard();
  const lanes = useLaneStore(selectOrderedLanes);
  const taxonomy = useTaxonomyContext();

  const entries = buildNoteMenu({
    note,
    actions,
    lanes,
    tags: taxonomy.tags,
    categories: taxonomy.categories,
    taxonomyEditable: taxonomy.editable,
    renderLaneItem: (lane, disabled) => (
      <ContextMenuItem
        key={lane.id}
        disabled={disabled}
        onSelect={() => actions.onChangeLane(note.id, lane.id)}
      >
        <LaneSwatch color={lane.color} />
        {lane.name}
      </ContextMenuItem>
    ),
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className="w-auto min-w-52"
        aria-label={`Actions for ${note.title || "Untitled"}`}
      >
        {canEdit ? entries.map((entry) => renderEntry(entry, CONTEXT_MENU_PRIMITIVES)) : <ContextMenuItem onSelect={()=>actions.onEdit(note.id)}>Open note</ContextMenuItem>}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function renderEntry(entry: NoteMenuEntry, ui: MenuPrimitives): ReactNode {
  if (entry.kind === "separator") return <ui.Separator key={entry.id} />;

  if (entry.kind === "submenu") {
    return (
      <ui.Sub key={entry.id}>
        <ui.SubTrigger>
          {entry.icon}
          {entry.label}
        </ui.SubTrigger>
        <ui.SubContent className={entry.widthClass}>
          {entry.content}
        </ui.SubContent>
      </ui.Sub>
    );
  }

  return (
    <ui.Item
      key={entry.id}
      disabled={entry.disabled ?? false}
      onSelect={entry.onSelect}
      {...(entry.destructive ? { variant: "destructive" as const } : {})}
      {...(entry.hint ? { title: entry.hint } : {})}
    >
      {entry.icon}
      {entry.label}
      {entry.srSuffix ? (
        <span className="sr-only">{entry.srSuffix}</span>
      ) : null}
    </ui.Item>
  );
}
