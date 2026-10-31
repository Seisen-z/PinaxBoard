"use client";

import { useEffect, useMemo } from "react";

import { useBoards, useWorkspaces } from "@/features/workspaces/queries";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { Board } from "@/types/board";
import type { Workspace } from "@/types/workspace";

export interface ActiveWorkspace {
  workspaces: Workspace[];
  boards: Board[];
  activeWorkspace: Workspace | null;
  activeBoard: Board | null;
  /** True while either list is loading for the first time. */
  loading: boolean;
  /** Set when a list failed to load, so the UI can offer a retry. */
  error: Error | null;
  /** False when signed out or unconfigured — the app runs on local state. */
  cloudEnabled: boolean;
}

/**
 * Resolves which workspace and board are open.
 *
 * Selection lives in Zustand and the lists live in TanStack Query, which means
 * the two can disagree — a stored id can point at a workspace that was
 * archived, deleted on another device, or belongs to a different account. This
 * hook is where that is reconciled: an unresolvable selection falls back to the
 * first available, so the user always lands on something real rather than a
 * blank screen.
 *
 * @param enabled Whether cloud data is available (signed in and configured).
 *
 * @example
 * const { activeWorkspace, activeBoard, loading } = useActiveWorkspace(signedIn);
 */
export function useActiveWorkspace(enabled: boolean): ActiveWorkspace {
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const activeBoardId = useWorkspaceStore((state) => state.activeBoardId);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const setActiveBoard = useWorkspaceStore((state) => state.setActiveBoard);

  const workspacesQuery = useWorkspaces(enabled);
  const workspaces = useMemo(
    () => workspacesQuery.data ?? [],
    [workspacesQuery.data],
  );

  const resolvedWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
      workspaces[0] ??
      null,
    [workspaces, activeWorkspaceId],
  );

  const boardsQuery = useBoards(resolvedWorkspace?.id ?? null, enabled);
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);

  const resolvedBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? boards[0] ?? null,
    [boards, activeBoardId],
  );

  // Write the resolution back so the stored selection stops pointing at
  // something that no longer exists. Guarded on inequality, or this would loop.
  useEffect(() => {
    if (!enabled) return;
    if (resolvedWorkspace && resolvedWorkspace.id !== activeWorkspaceId) {
      setActiveWorkspace(resolvedWorkspace.id);
    }
  }, [enabled, resolvedWorkspace, activeWorkspaceId, setActiveWorkspace]);

  useEffect(() => {
    if (!enabled) return;
    if (resolvedBoard && resolvedBoard.id !== activeBoardId) {
      setActiveBoard(resolvedBoard.id);
    }
  }, [enabled, resolvedBoard, activeBoardId, setActiveBoard]);

  return {
    workspaces,
    boards,
    activeWorkspace: resolvedWorkspace,
    activeBoard: resolvedBoard,
    loading: workspacesQuery.isLoading || boardsQuery.isLoading,
    error: workspacesQuery.error ?? boardsQuery.error ?? null,
    cloudEnabled: enabled,
  };
}
