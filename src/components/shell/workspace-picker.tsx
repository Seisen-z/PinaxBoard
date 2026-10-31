"use client";

import {
  Check,
  ChevronDown,
  FolderPlus,
  Loader2,
  Pencil,
  Plus,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { ClayButton } from "@/components/ui/clay-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Board } from "@/types/board";
import type { Workspace } from "@/types/workspace";

export interface WorkspacePickerProps {
  workspaces: readonly Workspace[];
  boards: readonly Board[];
  activeWorkspace: Workspace | null;
  activeBoard: Board | null;
  loading: boolean;
  error: Error | null;
  /** False when signed out or unconfigured — the app is on local state. */
  cloudEnabled: boolean;
  canManageWorkspace?: boolean;
  canManageBoard?: boolean;

  onSelectWorkspace: (workspaceId: string) => void;
  onSelectBoard: (boardId: string) => void;
  onCreateWorkspace: () => void;
  onCreateBoard: () => void;
  onRenameWorkspace: (workspace: Workspace) => void;
  onRenameBoard: (board: Board) => void;
  onRetry: () => void;
  /**
   * Classes for the trigger, replacing its default sizing. The picker sits in
   * the sidebar's header row, where it fills the width, but it is also usable
   * inline — so the shape is the caller's to choose, not the picker's.
   */
  triggerClassName?: string;
  /** Hides the board name on the trigger, when the breadcrumb already says it. */
  hideBoardOnTrigger?: boolean;
}

/** Shown in place of a workspace name before a project is connected. */
const LOCAL_LABEL = "Local workspace";

/**
 * The header's workspace and board switcher (FRONTEND_SPEC.md §10, §11).
 *
 * Replaces the permanent sidebar the spec rules out (§11): workspace and board
 * navigation lives in a dropdown so the Board keeps the full width.
 *
 * Signed out, it names the local workspace and says why there is nothing to
 * switch between — rather than showing an empty list that looks broken.
 */
export function WorkspacePicker({
  workspaces,
  boards,
  activeWorkspace,
  activeBoard,
  loading,
  error,
  cloudEnabled,
  canManageWorkspace = true, canManageBoard = true,
  onSelectWorkspace,
  onSelectBoard,
  onCreateWorkspace,
  onCreateBoard,
  onRenameWorkspace,
  onRenameBoard,
  onRetry,
  triggerClassName,
  hideBoardOnTrigger = false,
}: WorkspacePickerProps) {
  const label = cloudEnabled
    ? (activeWorkspace?.name ?? (loading ? "Loading…" : LOCAL_LABEL))
    : LOCAL_LABEL;

  const boardLabel = activeBoard?.name ?? null;
  const showBoardOnTrigger = Boolean(boardLabel) && !hideBoardOnTrigger;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ClayButton
          variant="ghost"
          size="sm"
          className={triggerClassName ?? "ml-1 hidden max-w-[16rem] lg:inline-flex"}
          aria-label={
            boardLabel
              ? `Workspace ${label}, board ${boardLabel}. Switch workspace or board`
              : `Workspace: ${label}. Switch workspace`
          }
        >
          {loading ? (
            <Loader2 size={13} aria-hidden="true" className="animate-spin" />
          ) : null}
          <span className="truncate">{label}</span>
          {showBoardOnTrigger ? (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                /
              </span>
              <span className="truncate text-muted-foreground">{boardLabel}</span>
            </>
          ) : null}
          <ChevronDown size={14} aria-hidden="true" />
        </ClayButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-auto min-w-60">
        {!cloudEnabled ? (
          <>
            <DropdownMenuLabel>{LOCAL_LABEL}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href="/login">Sign in to sync and add workspaces</Link>
            </DropdownMenuItem>
          </>
        ) : error ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 text-danger">
              <TriangleAlert size={14} aria-hidden="true" />
              Could not load
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={onRetry}>Try again</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>

            {workspaces.length === 0 && !loading ? (
              <DropdownMenuItem disabled>No workspaces yet</DropdownMenuItem>
            ) : null}

            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onSelect={() => onSelectWorkspace(workspace.id)}
                aria-current={
                  workspace.id === activeWorkspace?.id ? "true" : undefined
                }
              >
                <span className="flex-1 truncate">{workspace.name}</span>
                {workspace.id === activeWorkspace?.id ? (
                  <>
                    <Check size={14} aria-hidden="true" />
                    <span className="sr-only">(current)</span>
                  </>
                ) : null}
              </DropdownMenuItem>
            ))}

            <DropdownMenuItem onSelect={onCreateWorkspace}>
              <FolderPlus aria-hidden="true" />
              New workspace
            </DropdownMenuItem>

            {activeWorkspace ? (
              <DropdownMenuItem disabled={!canManageWorkspace} onSelect={() => onRenameWorkspace(activeWorkspace)}>
                <Pencil aria-hidden="true" />
                Rename workspace
              </DropdownMenuItem>
            ) : null}

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Boards
                <span className="ml-auto pl-3 text-xs text-muted-foreground">
                  {boardLabel ?? "None"}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-auto min-w-48">
                {boards.length === 0 && !loading ? (
                  <DropdownMenuItem disabled>No boards yet</DropdownMenuItem>
                ) : null}

                {boards.map((board) => (
                  <DropdownMenuItem
                    key={board.id}
                    onSelect={() => onSelectBoard(board.id)}
                    aria-current={board.id === activeBoard?.id ? "true" : undefined}
                  >
                    <span className="flex-1 truncate">{board.name}</span>
                    {board.id === activeBoard?.id ? (
                      <>
                        <Check size={14} aria-hidden="true" />
                        <span className="sr-only">(current)</span>
                      </>
                    ) : null}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={!activeWorkspace || !canManageWorkspace}
                  onSelect={onCreateBoard}
                >
                  <Plus aria-hidden="true" />
                  New board
                </DropdownMenuItem>

                {activeBoard ? (
                  <DropdownMenuItem disabled={!canManageBoard} onSelect={() => onRenameBoard(activeBoard)}>
                    <Pencil aria-hidden="true" />
                    Rename board
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
