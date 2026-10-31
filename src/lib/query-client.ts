import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

/**
 * TanStack Query defaults for Tackly.
 *
 * TanStack Query owns Supabase-backed server state (IMPLEMENTATION_PLAN.md
 * §49); Zustand owns UI/interaction state. Nothing here talks to Supabase yet —
 * that arrives in Milestone 5 — but the client is configured now so every
 * feature added later inherits the same retry and staleness policy.
 */

/**
 * A 4xx from PostgREST means the request itself was wrong (bad filter, RLS
 * denial, missing row). Retrying cannot fix it and only delays the error state
 * the user needs to see, so we retry transient failures only.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;

  const status = extractStatus(error);
  if (status !== null && status >= 400 && status < 500) return false;

  return true;
}

/** Pulls an HTTP-ish status code off an unknown error, if it carries one. */
function extractStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;

  const candidate = (error as { status?: unknown }).status;
  return typeof candidate === "number" ? candidate : null;
}

export const queryDefaults: DefaultOptions = {
  queries: {
    // Board data changes through this client's own mutations far more often
    // than it changes elsewhere, so a short stale window avoids refetch churn
    // while keeping cross-device edits reasonably fresh.
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: shouldRetry,
  },
  mutations: {
    // Mutations are optimistic and roll back on failure; a silent retry would
    // re-apply an edit the user has already seen reverted.
    retry: false,
  },
};

/** Creates a QueryClient. One per browser tab, or one per test. */
export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: queryDefaults });
}

/** Query key factory — keeps cache keys consistent and refactor-safe. */
export const queryKeys = {
  workspaces: () => ["workspaces"] as const,
  workspace: (workspaceId: string) => ["workspaces", workspaceId] as const,
  boards: (workspaceId: string) => ["workspaces", workspaceId, "boards"] as const,
  board: (boardId: string) => ["boards", boardId] as const,
  notes: (boardId: string) => ["boards", boardId, "notes"] as const,
  note: (noteId: string) => ["notes", noteId] as const,
  noteHistory: (noteId:string,ownerId:string)=>["notes",noteId,"history",ownerId] as const,
  attachments: (noteId: string) => ["notes", noteId, "attachments"] as const,
  tags: (workspaceId: string) => ["workspaces", workspaceId, "tags"] as const,
  categories: (workspaceId: string) =>
    ["workspaces", workspaceId, "categories"] as const,
  search: (workspaceId: string, term: string) =>
    ["workspaces", workspaceId, "search", term] as const,
} as const;
