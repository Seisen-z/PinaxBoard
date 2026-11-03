"use client";

import { saveSharedBoard } from "@/features/collaboration/repository";
import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";

import {
  deleteLanes,
  deleteNotes,
  upsertLanes,
  upsertNotes,
  fetchBoardContents,
} from "@/features/notes/repository";
import {
  AUTOSAVE_DELAY_MS,
  countPending,
  diffById,
  isEmptyDiff,
  rollbackSnapshot,
  snapshotById,
  type BoardDiff,
} from "@/features/notes/sync-engine";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSyncStore } from "@/stores/sync-store";
import { readCachedBoard, writeCachedBoard, sameRecord, reconcileBoard } from "@/features/offline/board-cache";
import type { Lane } from "@/types/lane";
import type { Note } from "@/types/note";
import type { BoardContents } from "@/features/notes/repository";

export interface BoardSyncOptions {
  /** The board being edited, or `null` when running on local state. */
  boardId: string | null;
  /** The signed-in user's id. Lanes carry an owner column. */
  ownerId: string | null;
  /** False to disable syncing entirely (signed out, or unconfigured). */
  enabled: boolean;
  boardOwnerId?: string | null;
  canWrite?: boolean;
  shared?: boolean;
}

export interface BoardSync {
  /** Writes any pending changes now. */
  flush: () => void;
  /** Re-attempts after a failure, without waiting for the next edit. */
  retry: () => void;
  /** Marks the current store contents as already persisted. */
  markClean: (baseline?: BoardContents) => void;
  savePending: () => Promise<boolean>;
  acceptRestored: (note: Note) => void;
  acceptPurged: (ids:readonly string[])=>void;
}

/**
 * Autosave for notes and columns (IMPLEMENTATION_PLAN.md Â§50).
 *
 * The flow the spec prescribes, end to end:
 *
 * ```text
 * edit â†’ immediate local update (Zustand)
 *      â†’ debounce
 *      â†’ persist (Supabase)
 *      â†’ show sync status
 * ```
 *
 * The stores stay the source of truth for the UI, which is what keeps every
 * interaction instant regardless of the network. This hook watches them,
 * works out what changed by reference comparison, and writes only that.
 *
 * Why a snapshot diff rather than dirty flags on the store: a flag has to be
 * set by every action that touches a record, and the one action that forgets
 * loses data silently. A diff cannot forget.
 *
 * @example
 * const sync = useBoardSync({ boardId, ownerId, enabled: signedIn });
 */
export function useBoardSync({
  boardId,
  ownerId,
  enabled,
  boardOwnerId, canWrite = true, shared = false,
}: BoardSyncOptions): BoardSync {
  const recordOwnerId = boardOwnerId ?? ownerId;
  /** What we believe the server already has. */
  const noteSnapshot = useRef<Map<string, Note>>(new Map());
  const laneSnapshot = useRef<Map<string, Lane>>(new Map());
  /** Guards against two flushes overlapping and writing out of order. */
  const inFlight = useRef(false);
  const recoveringRef = useRef(false);
  const pendingWrite = useRef<Promise<void> | null>(null);
  const client = useQueryClient();

  const setSaving = useSyncStore((state) => state.setSaving);
  const setSaved = useSyncStore((state) => state.setSaved);
  const setSyncError = useSyncStore((state) => state.setError);
  const setOffline = useSyncStore((state) => state.setOffline);
  const setIdle = useSyncStore((state) => state.setIdle);

  const flushRef = useRef<(() => void) | null>(null);
  const needsRecovery = useRef(false);
  /** True once the browser actually lost connectivity; only then may recovery fork conflict copies. */
  const offlineSeen = useRef(false);
  const confirmedRef = useRef<BoardContents>({ notes: [], lanes: [] });
  const scopeRef = useRef<string | null>(null);
  const markClean = useCallback((baseline?: BoardContents) => {
    const state = useNoteStore.getState();
    scopeRef.current = `${ownerId ?? state.boardContext.ownerId}:${state.boardContext.boardId}`;
    noteSnapshot.current = snapshotById(baseline?.notes ?? state.notes);
    laneSnapshot.current = snapshotById(baseline?.lanes ?? useLaneStore.getState().lanes);
    confirmedRef.current = { notes: [...noteSnapshot.current.values()], lanes: [...laneSnapshot.current.values()] };
    setIdle();
    queueMicrotask(() => flushRef.current?.());
  }, [setIdle, ownerId]);

  const buildDiff = useCallback((): BoardDiff => {
    return {
      notes: diffById(noteSnapshot.current, useNoteStore.getState().notes),
      lanes: diffById(laneSnapshot.current, useLaneStore.getState().lanes),
    };
  }, []);

  const flushNow = useCallback(async () => {
    if (!enabled || !canWrite || !boardId || !ownerId) return;
    const state = useNoteStore.getState();
    const key = `${ownerId}:${boardId}`;
    if (state.boardContext.boardId !== boardId || state.boardContext.ownerId !== recordOwnerId || scopeRef.current !== key) return;

    // A second flush while one is running would race: both would diff against
    // the same snapshot and write the same rows twice.
    if (recoveringRef.current) return;
    if (inFlight.current) { await pendingWrite.current; return; }

    if (needsRecovery.current && navigator.onLine !== false) { window.dispatchEvent(new Event("online")); return; }
    const diff = buildDiff();
    if (isEmptyDiff(diff)) return;

    const working = { notes: state.notes, lanes: useLaneStore.getState().lanes };
    const baseline = confirmedRef.current;
    try { writeCachedBoard({ boardId, ownerId, baseline, working, pending: true, revision: Date.now() }); }
    catch { setSyncError("Device storage is full. Keep this tab open and export a backup, then retry."); return; }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { offlineSeen.current = true; setOffline(); return; }

    inFlight.current = true;
    setSaving(countPending(diff));

    // Marked clean optimistically so edits made *during* the write are seen as
    // new changes rather than being folded into this batch and lost.
    const tagChangedIds = diff.notes.upserts.filter((note) => !sameRecord(noteSnapshot.current.get(note.id)?.tagIds ?? [], note.tagIds)).map((note) => note.id);
    const newRecurringIds = diff.notes.upserts.filter((note) => note.recurrenceSourceId && !noteSnapshot.current.has(note.id)).map((note) => note.id);
    const nextNotes = snapshotById(useNoteStore.getState().notes);
    const nextLanes = snapshotById(useLaneStore.getState().lanes);
    noteSnapshot.current = nextNotes;
    laneSnapshot.current = nextLanes;

    const task = (async () => {
    try {
      // Columns first: a note can reference a column that was just created,
      // and the foreign key would reject the note otherwise.
      if (shared) await saveSharedBoard(boardId, diff, baseline, recordOwnerId!);
      else {
      await upsertLanes(diff.lanes.upserts, recordOwnerId!);
      if (newRecurringIds.length) await upsertNotes(diff.notes.upserts, newRecurringIds);
      else await upsertNotes(diff.notes.upserts, [], tagChangedIds);
      await deleteNotes(diff.notes.deletions);
      // Columns last on the way out, after their notes have been rehomed.
      await deleteLanes(diff.lanes.deletions);
      }

      // Keep the hydration cache aligned with the persisted batch. Returning
      // to this board must not reload pre-archive/pre-trash records.
      client.setQueryData<BoardContents>(queryKeys.notes(boardId),(data)=>data?{notes:[...nextNotes.values()],lanes:[...nextLanes.values()]}:data);
      if (scopeRef.current === key) confirmedRef.current = { notes: [...nextNotes.values()], lanes: [...nextLanes.values()] };
      const latest = readCachedBoard(ownerId, boardId);
      if (latest) writeCachedBoard({ ...latest, baseline: { notes: [...nextNotes.values()], lanes: [...nextLanes.values()] }, pending: !sameRecord(latest.working, { notes: [...nextNotes.values()], lanes: [...nextLanes.values()] }) });
      if (scopeRef.current === key) setSaved();
      for(const note of diff.notes.upserts) void client.invalidateQueries({queryKey:queryKeys.noteHistory(note.id,ownerId)});
    } catch (error) {
      needsRecovery.current = true;
      // Put the failed records back so the next attempt retries them. Dropping
      // them here is how an edit disappears for good.
      if (scopeRef.current === key) {
        rollbackSnapshot(noteSnapshot.current, diff.notes);
        rollbackSnapshot(laneSnapshot.current, diff.lanes);
      }

      setSyncError(
        error instanceof Error
          ? error.message
          : "Could not save your changes. They are safe on this device.",
      );
    } finally {
      inFlight.current = false;
    }
    })();
    pendingWrite.current = task;
    await task;
    if(pendingWrite.current === task) pendingWrite.current = null;
  }, [
    boardId,
    client,
    buildDiff,
    enabled,
    ownerId, recordOwnerId, canWrite, shared,
    setOffline,
    setSaved,
    setSaving,
    setSyncError,
  ]);

  useEffect(() => { flushRef.current = () => void flushNow(); return () => { flushRef.current = null; }; }, [flushNow]);

  const scheduleFlush = useDebouncedCallback(() => {
    void flushNow();
  }, AUTOSAVE_DELAY_MS);

  // Watch both stores. Zustand's `subscribe` fires on any state change; the
  // diff decides whether anything actually needs writing.
  useEffect(() => {
    if (!enabled || !canWrite || !boardId) return;

    const journal = () => {
      const state = useNoteStore.getState();
      if (!ownerId || state.boardContext.ownerId !== recordOwnerId || state.boardContext.boardId !== boardId || scopeRef.current !== `${ownerId}:${boardId}`) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) offlineSeen.current = true;
      const working = { notes: state.notes, lanes: useLaneStore.getState().lanes };
      const baseline = confirmedRef.current;
      try { writeCachedBoard({ ownerId, boardId, working, baseline, pending: !sameRecord(working, baseline), revision: Date.now() }); }
      catch { setSyncError("Device storage is full. Keep this tab open and export your notes."); }
      scheduleFlush.schedule();
    };
    const unsubscribeNotes = useNoteStore.subscribe(journal);
    const unsubscribeLanes = useLaneStore.subscribe(journal);

    return () => {
      unsubscribeNotes();
      unsubscribeLanes();
    };
  }, [boardId, ownerId, recordOwnerId, canWrite, enabled, scheduleFlush, setSyncError]);

  // A pending save when the tab goes away is still a save the user is owed.
  // `visibilitychange` is the reliable signal â€” `beforeunload` is skipped on
  // mobile, where a backgrounded tab is often never resumed.
  useEffect(() => {
    if (!enabled) return;

    const onHidden = () => {
      if (document.visibilityState === "hidden") scheduleFlush.flush();
    };

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", scheduleFlush.flush);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", scheduleFlush.flush);
    };
  }, [enabled, scheduleFlush]);

  // Coming back online is the natural moment to clear a backlog.
  useEffect(() => {
    if (!enabled) return;

    const recover = async () => {
      if (!boardId || !ownerId || inFlight.current || recoveringRef.current) return;
      recoveringRef.current = true;
      try {
        const remote = await fetchBoardContents(boardId);
        const state = useNoteStore.getState();
        if (state.boardContext.boardId !== boardId || state.boardContext.ownerId !== recordOwnerId) return;
        const cached = readCachedBoard(ownerId, boardId);
        const wasOffline = needsRecovery.current || offlineSeen.current;
        const next = cached && canWrite ? reconcileBoard(remote, cached, wasOffline) : remote;
        offlineSeen.current = false;
        const expanded = state.expandedNoteId;
        // Switch baseline before resetting stores; subscribers journal the recovered diff.
        confirmedRef.current = remote; noteSnapshot.current = snapshotById(remote.notes); laneSnapshot.current = snapshotById(remote.lanes);
        useLaneStore.getState().reset(next.lanes, boardId);
        useNoteStore.getState().reset(next.notes, { boardId, ownerId: recordOwnerId! });
        if (expanded && next.notes.some((note) => note.id === expanded)) useNoteStore.getState().expandNote(expanded);
        if (next.notes.some(note => note.title.endsWith("(offline conflict copy)")) || next.lanes.some(lane=>lane.name.endsWith("(conflict copy)"))) window.dispatchEvent(new Event("tackly:conflict-copy"));
        needsRecovery.current = false;
        recoveringRef.current = false;
        await flushNow();
      } catch (error) { setSyncError(error instanceof Error ? error.message : "Reconnect failed. Changes remain on this device. Retry sync."); } finally { recoveringRef.current = false; }
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onOnline = () => void recover();
    const onRemote = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== boardId) return;
      clearTimeout(timer);
      const attempt = () => { if (inFlight.current || recoveringRef.current) { timer=setTimeout(attempt,200); return; } void recover(); };
      timer=setTimeout(attempt,150);
    };
    const onOffline = () => { offlineSeen.current = true; };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);window.addEventListener("tackly:remote-board",onRemote);
    return () => { clearTimeout(timer); window.removeEventListener("offline", onOffline); window.removeEventListener("online", onOnline);window.removeEventListener("tackly:remote-board",onRemote); };
  }, [enabled, boardId, ownerId, recordOwnerId, canWrite, flushNow, setSyncError]);

  const retry = useCallback(() => {
    scheduleFlush.cancel();
    if (navigator.onLine !== false) window.dispatchEvent(new Event("online"));
    else void flushNow();
  }, [flushNow, scheduleFlush]);

  const savePending = useCallback(async () => {
    if(!enabled || !boardId || !ownerId) return false;
    for(let attempt=0;attempt<3;attempt++) {
      const context=useNoteStore.getState().boardContext;
      if(context.boardId!==boardId || context.ownerId!==recordOwnerId)return false;
      await flushNow();
      if(isEmptyDiff(buildDiff())) return true;
    }
    return false;
  },[enabled,boardId,ownerId,recordOwnerId,flushNow,buildDiff]);
  const acceptRestored = useCallback((note:Note)=>{
    if(note.boardId!==boardId||note.ownerId!==recordOwnerId)return;
    client.setQueryData<BoardContents>(queryKeys.notes(note.boardId),(data)=>data?{...data,notes:data.notes.map((current)=>current.id===note.id?note:current)}:data);
    const context=useNoteStore.getState().boardContext;
    if(context.boardId!==note.boardId || context.ownerId!==note.ownerId || boardId!==note.boardId)return;
    noteSnapshot.current.set(note.id,note);
    useNoteStore.getState().applyRestoredNote(note);
  },[boardId,recordOwnerId,client]);
  const acceptPurged=useCallback((ids:readonly string[])=>{
    if(!boardId||!ownerId)return;
    // Update this board's cache even if its view changed during the RPC.
    client.setQueryData<BoardContents>(queryKeys.notes(boardId),(data)=>data?{...data,notes:data.notes.filter((note)=>!ids.includes(note.id))}:data);
    for(const id of ids){client.removeQueries({queryKey:queryKeys.noteHistory(id,ownerId)});client.removeQueries({queryKey:queryKeys.attachments(id)});}
    const context=useNoteStore.getState().boardContext;
    if(context.boardId!==boardId||context.ownerId!==recordOwnerId)return;
    for(const id of ids)noteSnapshot.current.delete(id);
    useNoteStore.getState().removePurgedNotes(ids,true);
  },[boardId,ownerId,recordOwnerId,client]);
  return { flush: scheduleFlush.flush, retry, markClean, savePending, acceptRestored, acceptPurged };
}

