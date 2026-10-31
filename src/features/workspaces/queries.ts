"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import {
  archiveBoard,
  archiveWorkspace,
  createBoard,
  createWorkspace,
  fetchBoards,
  fetchWorkspaces,
  renameBoard,
  renameWorkspace,
} from "@/features/workspaces/repository";
import { queryKeys } from "@/lib/query-client";
import { createId } from "@/lib/utils";
import type { Board } from "@/types/board";
import type { Workspace } from "@/types/workspace";

/**
 * Server state for workspaces and boards (IMPLEMENTATION_PLAN.md §13, §49).
 *
 * TanStack Query owns this data; Zustand owns which one is *selected*. Mixing
 * the two would make the active-selection store a second, stale copy of the
 * server's list.
 *
 * Every mutation is optimistic and rolls back on failure, so creating or
 * renaming feels instant (PRODUCT_SPEC.md → "Use Optimistic UX").
 */

/**
 * Loads the signed-in user's workspaces.
 *
 * `enabled` is false when signed out, so the hook stays mounted and returns an
 * idle result rather than firing a request that RLS would answer with an empty
 * list anyway.
 */
export function useWorkspaces(
  enabled: boolean,
): UseQueryResult<Workspace[], Error> {
  return useQuery({
    queryKey: queryKeys.workspaces(),
    queryFn: fetchWorkspaces,
    enabled,
  });
}

export function useBoards(
  workspaceId: string | null,
  enabled: boolean,
): UseQueryResult<Board[], Error> {
  return useQuery({
    queryKey: queryKeys.boards(workspaceId ?? "none"),
    queryFn: () => fetchBoards(workspaceId as string),
    enabled: enabled && Boolean(workspaceId),
  });
}

export interface CreateWorkspaceVariables {
  name: string;
  ownerId: string;
}

export function useCreateWorkspace(): UseMutationResult<
  Workspace,
  Error,
  CreateWorkspaceVariables,
  { previous: Workspace[] | undefined }
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ name, ownerId }: CreateWorkspaceVariables) => {
      const existing = client.getQueryData<Workspace[]>(queryKeys.workspaces()) ?? [];
      return createWorkspace({ name, ownerId, position: existing.length });
    },

    onMutate: async ({ name, ownerId }) => {
      // Stop an in-flight refetch from landing on top of the optimistic row.
      await client.cancelQueries({ queryKey: queryKeys.workspaces() });

      const previous = client.getQueryData<Workspace[]>(queryKeys.workspaces());
      const now = new Date().toISOString();

      const optimistic: Workspace = {
        id: createId(),
        ownerId,
        name,
        icon: null,
        color: null,
        position: previous?.length ?? 0,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };

      client.setQueryData<Workspace[]>(queryKeys.workspaces(), [
        ...(previous ?? []),
        optimistic,
      ]);

      return { previous };
    },

    onError: (_error, _variables, context) => {
      // Put the list back exactly as it was, rather than refetching — the user
      // should see their previous state, not a loading spinner.
      if (context) client.setQueryData(queryKeys.workspaces(), context.previous);
    },

    onSettled: () => {
      // The optimistic row carries a client id; only a refetch gives it the
      // database's.
      void client.invalidateQueries({ queryKey: queryKeys.workspaces() });
    },
  });
}

export function useRenameWorkspace(): UseMutationResult<
  void,
  Error,
  { workspaceId: string; name: string },
  { previous: Workspace[] | undefined }
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, name }) => renameWorkspace(workspaceId, name),

    onMutate: async ({ workspaceId, name }) => {
      await client.cancelQueries({ queryKey: queryKeys.workspaces() });
      const previous = client.getQueryData<Workspace[]>(queryKeys.workspaces());

      client.setQueryData<Workspace[]>(queryKeys.workspaces(), (current) =>
        current?.map((workspace) =>
          workspace.id === workspaceId ? { ...workspace, name } : workspace,
        ),
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context) client.setQueryData(queryKeys.workspaces(), context.previous);
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.workspaces() });
    },
  });
}

export function useArchiveWorkspace(): UseMutationResult<
  void,
  Error,
  string,
  { previous: Workspace[] | undefined }
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => archiveWorkspace(workspaceId),

    onMutate: async (workspaceId) => {
      await client.cancelQueries({ queryKey: queryKeys.workspaces() });
      const previous = client.getQueryData<Workspace[]>(queryKeys.workspaces());

      client.setQueryData<Workspace[]>(queryKeys.workspaces(), (current) =>
        current?.filter((workspace) => workspace.id !== workspaceId),
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context) client.setQueryData(queryKeys.workspaces(), context.previous);
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.workspaces() });
    },
  });
}

export interface CreateBoardVariables {
  workspaceId: string;
  ownerId: string;
  name: string;
}

/**
 * Creates a board.
 *
 * Deliberately **not** optimistic: creating a board also seeds its columns, so
 * an optimistic board would appear with none and the user could land on an
 * empty, unusable surface before the write completed.
 */
export function useCreateBoard(): UseMutationResult<
  Board,
  Error,
  CreateBoardVariables
> {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, ownerId, name }: CreateBoardVariables) => {
      const existing =
        client.getQueryData<Board[]>(queryKeys.boards(workspaceId)) ?? [];

      return createBoard({ workspaceId, ownerId, name, position: existing.length });
    },

    onSuccess: (_board, { workspaceId }) => {
      void client.invalidateQueries({ queryKey: queryKeys.boards(workspaceId) });
    },
  });
}

export function useRenameBoard(
  workspaceId: string | null,
): UseMutationResult<
  void,
  Error,
  { boardId: string; name: string },
  { previous: Board[] | undefined }
> {
  const client = useQueryClient();
  const key = queryKeys.boards(workspaceId ?? "none");

  return useMutation({
    mutationFn: ({ boardId, name }) => renameBoard(boardId, name),

    onMutate: async ({ boardId, name }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Board[]>(key);

      client.setQueryData<Board[]>(key, (current) =>
        current?.map((board) =>
          board.id === boardId ? { ...board, name } : board,
        ),
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context) client.setQueryData(key, context.previous);
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
}

export function useArchiveBoard(
  workspaceId: string | null,
): UseMutationResult<void, Error, string, { previous: Board[] | undefined }> {
  const client = useQueryClient();
  const key = queryKeys.boards(workspaceId ?? "none");

  return useMutation({
    mutationFn: (boardId: string) => archiveBoard(boardId),

    onMutate: async (boardId) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Board[]>(key);

      client.setQueryData<Board[]>(key, (current) =>
        current?.filter((board) => board.id !== boardId),
      );

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context) client.setQueryData(key, context.previous);
    },

    onSettled: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
}
