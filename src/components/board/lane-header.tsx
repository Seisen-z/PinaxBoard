"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef } from "react";

import { IconButton } from "@/components/ui/icon-button";
import { SectionHeader } from "@/components/ui/section-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANE_COLOR_OPTIONS } from "@/config/lanes";
import { cn } from "@/lib/utils";
import type { Lane } from "@/types/lane";

export interface LaneHeaderActions {
  onAddNote: (laneId: string) => void;
  onRename: (laneId: string, name: string) => void;
  onBeginRename: (laneId: string) => void;
  onEndRename: () => void;
  onSetColor: (laneId: string, color: string) => void;
  onMove: (laneId: string, direction: "left" | "right") => void;
  onDelete: (laneId: string) => void;
  /** Places every note in the column onto the Canvas. */
  onSendToCanvas: (laneId: string) => void;
}

export interface LaneHeaderProps {
  lane: Lane;
  noteCount: number;
  /** True while this lane's name is being edited. */
  renaming: boolean;
  /** False for the only remaining lane — a board needs somewhere to put notes. */
  canDelete: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  actions: LaneHeaderActions;
}

/**
 * Lane heading: colour, name, count, Add, and the lane menu
 * (FRONTEND_SPEC.md §12).
 *
 * The name is editable in place — double-click it, or pick Rename. Columns are
 * the user's own (see `src/types/lane.ts`), so renaming has to be as cheap as
 * renaming a file, not a trip through a settings dialog.
 *
 * Add is the only note-creation control in a populated lane; an empty lane
 * shows its own call to action instead. Two Add buttons per column is one too
 * many.
 */
export function LaneHeader({
  lane,
  noteCount,
  renaming,
  canDelete,
  canMoveLeft,
  canMoveRight,
  actions,
}: LaneHeaderProps) {
  const canEdit=useCanEditBoard();
  const inputRef = useRef<HTMLInputElement>(null);
  // Set when Escape cancels, so the blur that follows does not commit the
  // abandoned text.
  const cancelledRef = useRef(false);

  const commit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      actions.onEndRename();
      return;
    }

    const name = inputRef.current?.value.trim() ?? "";
    // An empty column name would leave an anonymous header, so a blank commit
    // keeps the previous name.
    if (name && name !== lane.name) actions.onRename(lane.id, name);
    actions.onEndRename();
  };

  if (renaming) {
    return (
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: lane.color }}
        />
        {/*
          Uncontrolled, and remounted per rename via `key`. The draft has no
          bearing on anything else that renders, so holding it in React state
          would only buy a re-render per keystroke — and seeding that state
          from props needs an effect the linter rightly objects to.
        */}
        <input
          key={`${lane.id}:${lane.updatedAt}`}
          ref={inputRef}
          defaultValue={lane.name}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              cancelledRef.current = true;
              event.currentTarget.blur();
            }
          }}
          aria-label={`Rename column ${lane.name}`}
          className={cn(
            "min-w-0 flex-1 rounded-sm bg-surface-raised px-1.5 py-0.5",
            "text-sm font-semibold tracking-tight text-foreground",
            "focus:outline-none",
          )}
        />
      </div>
    );
  }

  return (
    <SectionHeader
      pill
      title={lane.name}
      accentColor={lane.color}
      count={noteCount}
      className="px-0.5"
      onTitleDoubleClick={() => actions.onBeginRename(lane.id)}
      actions={
        <>
          <IconButton
            disabled={!canEdit} label={`Add note to ${lane.name}`}
            icon={<Plus size={16} />}
            variant="ghost"
            size="sm"
            onClick={() => actions.onAddNote(lane.id)}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                disabled={!canEdit} label={`Column options for ${lane.name}`}
                icon={<MoreHorizontal size={16} />}
                variant="ghost"
                size="sm"
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <DropdownMenuItem onSelect={() => actions.onBeginRename(lane.id)}>
                <Pencil aria-hidden="true" />
                Rename
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette aria-hidden="true" />
                  Column Color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-auto">
                  <div
                    role="radiogroup"
                    aria-label="Column color"
                    className="grid grid-cols-4 gap-1.5 p-1"
                  >
                    {LANE_COLOR_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={option.value === lane.color}
                        aria-label={option.label}
                        onClick={() => actions.onSetColor(lane.id, option.value)}
                        className={cn(
                          "size-6 rounded-md border border-border transition-transform hover:scale-105",
                          option.value === lane.color &&
                            "ring-2 ring-ring ring-offset-1 ring-offset-popover",
                        )}
                        style={{ backgroundColor: option.value }}
                      />
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                disabled={noteCount === 0}
                onSelect={() => actions.onSendToCanvas(lane.id)}
              >
                <LayoutDashboard aria-hidden="true" />
                Send to Canvas
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled={!canMoveLeft}
                onSelect={() => actions.onMove(lane.id, "left")}
              >
                <ChevronLeft aria-hidden="true" />
                Move Left
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canMoveRight}
                onSelect={() => actions.onMove(lane.id, "right")}
              >
                <ChevronRight aria-hidden="true" />
                Move Right
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                disabled={!canDelete}
                title={canDelete ? undefined : "A board needs at least one column"}
                onSelect={() => actions.onDelete(lane.id)}
              >
                <Trash2 aria-hidden="true" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    />
  );
}
