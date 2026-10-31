"use client";

import { useCallback } from "react";

import { WorkspacePicker } from "@/components/shell/workspace-picker";
import {
  useCreateBoard,
  useCreateWorkspace,
  useRenameBoard,
  useRenameWorkspace,
} from "@/features/workspaces/queries";
import { useActiveWorkspace } from "@/features/workspaces/use-active-workspace";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { Board } from "@/types/board";
import type { Workspace } from "@/types/workspace";

export interface WorkspaceSwitcherProps {
  /** The signed-in user's id, or `null` when signed out. */
  ownerId: string | null;
  /** Classes for the picker's trigger — see {@link WorkspacePicker}. */
  triggerClassName?: string;
  /** Drops the board name from the trigger when the breadcrumb carries it. */
  hideBoardOnTrigger?: boolean;
}

/**
 * Binds the workspace/board picker to its queries and mutations.
 *
 * Split from `WorkspacePicker` so the picker itself stays a presentational
 * component that can be rendered from a test with fixed data, rather than one
 * that only works inside a QueryClientProvider with a live session.
 *
 * Naming uses `window.prompt`. A proper dialog belongs with the rest of the
 * dialog work; a prompt keeps the flow to one step and, more importantly, is
 * obviously temporary rather than a half-built dialog that looks finished.
 */
export function WorkspaceSwitcher({
  ownerId,
  triggerClassName,
  hideBoardOnTrigger,
}: WorkspaceSwitcherProps) {
  const cloudEnabled = Boolean(ownerId);

  const {
    workspaces,
    boards,
    activeWorkspace,
    activeBoard,
    loading,
    error,
  } = useActiveWorkspace(cloudEnabled);

  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const setActiveBoard = useWorkspaceStore((state) => state.setActiveBoard);

  const createWorkspace = useCreateWorkspace();
  const renameWorkspace = useRenameWorkspace();
  const createBoard = useCreateBoard();
  const renameBoard = useRenameBoard(activeWorkspace?.id ?? null);

  const handleCreateWorkspace = useCallback(() => {
    if (!ownerId) return;

    const name = window.prompt("Name your workspace")?.trim();
    if (!name) return;

    createWorkspace.mutate({ name, ownerId });
  }, [createWorkspace, ownerId]);

  const handleCreateBoard = useCallback(() => {
    if (!ownerId || !activeWorkspace || activeWorkspace.ownerId !== ownerId) return;

    const name = window.prompt("Name your board")?.trim();
    if (!name) return;

    createBoard.mutate(
      { workspaceId: activeWorkspace.id, ownerId, name },
      // Open the new board straight away — creating one is an act of
      // intending to use it.
      { onSuccess: (board) => setActiveBoard(board.id) },
    );
  }, [activeWorkspace, createBoard, ownerId, setActiveBoard]);

  const handleRenameWorkspace = useCallback(
    (workspace: Workspace) => {
      if(workspace.ownerId!==ownerId)return;
      const name = window.prompt("Rename workspace", workspace.name)?.trim();
      if (!name || name === workspace.name) return;

      renameWorkspace.mutate({ workspaceId: workspace.id, name });
    },
    [renameWorkspace,ownerId],
  );

  const handleRenameBoard = useCallback(
    (board: Board) => {
      if(board.ownerId!==ownerId)return;
      const name = window.prompt("Rename board", board.name)?.trim();
      if (!name || name === board.name) return;

      renameBoard.mutate({ boardId: board.id, name });
    },
    [renameBoard,ownerId],
  );

  const handleRetry = useCallback(() => {
    // The queries refetch themselves on mount; nudging the selection is enough
    // to retrigger them without reaching into the query client from here.
    setActiveWorkspace(activeWorkspace?.id ?? null);
  }, [activeWorkspace, setActiveWorkspace]);

  return (
    <WorkspacePicker
      workspaces={workspaces}
      boards={boards}
      activeWorkspace={activeWorkspace}
      activeBoard={activeBoard}
      loading={loading}
      error={error}
      cloudEnabled={cloudEnabled}
      canManageWorkspace={activeWorkspace?.ownerId === ownerId}
      canManageBoard={activeBoard?.ownerId === ownerId}
      onSelectWorkspace={setActiveWorkspace}
      onSelectBoard={setActiveBoard}
      onCreateWorkspace={handleCreateWorkspace}
      onCreateBoard={handleCreateBoard}
      onRenameWorkspace={handleRenameWorkspace}
      onRenameBoard={handleRenameBoard}
      onRetry={handleRetry}
      {...(triggerClassName ? { triggerClassName } : {})}
      {...(hideBoardOnTrigger === undefined ? {} : { hideBoardOnTrigger })}
    />
  );
}
