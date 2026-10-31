"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { readCachedBoard, reconcileBoard, writeCachedBoard } from "@/features/offline/board-cache";
import type { BoardContents } from "@/features/notes/repository";
import { fetchBoardContents } from "@/features/notes/repository";
import { queryKeys } from "@/lib/query-client";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSelectionStore } from "@/stores/selection-store";

export interface BoardContentsState {
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseBoardContentsOptions {
  boardId: string | null;
  /**
   * The signed-in user. Stamped onto notes created after hydration, alongside
   * `boardId` — without it a new note carries the local mock ids and Postgres
   * rejects the insert.
   */
  ownerId: string | null;
  enabled: boolean;
  boardOwnerId?: string | null;
  canWrite?: boolean;
  /** Called after the stores are filled, so the sync engine starts clean. */
  onHydrated: (baseline?: BoardContents) => void;
}

/**
 * Loads a board's notes and columns into the Zustand stores.
 *
 * TanStack Query owns the *fetch* — caching, retries, refetch on reconnect —
 * and the stores own what the UI reads. The handoff happens once per board,
 * here.
 *
 * Why not read from the query cache directly in components: every interaction
 * (drag, type, toggle) writes locally and must be instant. Driving the UI from
 * the server cache would mean either a round trip per keystroke, or
 * maintaining an optimistic shadow of the whole board — which is the store
 * again, with extra steps.
 *
 * Hydration **replaces** store contents rather than merging. A merge would
 * have to resolve conflicts between local edits and server state, and silently
 * guessing wrong there loses work; a clean load after the sync engine has
 * flushed is predictable.
 *
 * @example
 * const { loading, error } = useBoardContents({
 *   boardId, enabled: signedIn, onHydrated: sync.markClean,
 * });
 */
export function useBoardContents({
  boardId,
  ownerId,
  enabled,
  boardOwnerId, canWrite = true,
  onHydrated,
}: UseBoardContentsOptions): BoardContentsState {
  const active = enabled && Boolean(boardId);

  const query = useQuery({
    queryKey: queryKeys.notes(boardId ?? "none"),
    queryFn: async () => {
      const cached = ownerId && boardId ? readCachedBoard(ownerId, boardId) : null;
      try { return await fetchBoardContents(boardId as string); }
      catch (error) { if (cached) return cached.baseline; throw error; }
    },
    networkMode: "always",
    enabled: active,
    // The stores are the working copy; refetching behind them would discard
    // unsaved edits. A reload or a board switch is the refresh point.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  /**
   * Which board has been written into the stores.
   *
   * A ref, and never read during render: it exists only to stop a re-render
   * re-hydrating and discarding edits made since. Nothing renders differently
   * because of it, so making it state would add a render for no one's benefit.
   */
  const hydratedBoardRef = useRef<string | null>(null);
  const onHydratedRef = useRef(onHydrated);

  useEffect(() => {
    onHydratedRef.current = onHydrated;
  });

  useEffect(() => {
    if (!active || !boardId || !ownerId || !query.data) return;
    const scope = `${ownerId}:${boardId}`;
    if (hydratedBoardRef.current === scope) return;

    const cached = readCachedBoard(ownerId, boardId);
    const recovered = cached && canWrite ? reconcileBoard(query.data, cached) : query.data;
    useLaneStore.getState().reset(recovered.lanes, boardId);
    // The context travels with the records: a note created after this point
    // belongs to this board and this user, not to the local mock board.
    useNoteStore.getState().reset(recovered.notes, { boardId, ownerId: boardOwnerId ?? ownerId });
    // A selection from the previous board points at notes that are gone.
    useSelectionStore.getState().clear();

    hydratedBoardRef.current = scope;
    onHydratedRef.current({ notes: query.data.notes, lanes: query.data.lanes });
    try { if (canWrite || !cached?.pending) writeCachedBoard({ boardId, ownerId, baseline: { notes: query.data.notes, lanes: query.data.lanes }, working: recovered, pending: JSON.stringify(recovered.notes) !== JSON.stringify(query.data.notes) || JSON.stringify(recovered.lanes) !== JSON.stringify(query.data.lanes), revision: Date.now() }); } catch { /* Autosave reports quota failure without discarding working records. */ }
  }, [active, boardId, ownerId, boardOwnerId, canWrite, query.data]);

  // No separate reset when the board changes: the guard above already fails
  // for a different id, so switching boards re-hydrates and overwrites the
  // marker on its own.

  return {
    loading: active && query.isLoading,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
  };
}
