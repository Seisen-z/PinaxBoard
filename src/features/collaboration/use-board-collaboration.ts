"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBoardRole } from "./repository";
import { useBoardAccess } from "./access";
import { cursorSchema, parseCursors, type CollaboratorCursor } from "./presence";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCanvasStore } from "@/stores/canvas-store";
import { useNoteStore } from "@/stores/note-store";
import type { SessionUser } from "@/features/auth/types";

export function useBoardCollaboration(boardId: string | null, user: SessionUser | null, view: string) {
  const client = useQueryClient();
  const role = useQuery({ queryKey: ["board-role", user?.id, boardId], queryFn: () => fetchBoardRole(boardId!), enabled: Boolean(user && boardId), refetchInterval: 15_000, retry: 1, refetchOnWindowFocus: true });
  const [live, setLive] = useState<{ boardId: string; status: string; cursors: CollaboratorCursor[] } | null>(null);
  const viewRef = useRef(view); useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => {
    useBoardAccess.setState({ boardId: user ? boardId ?? "pending" : null, actorId: user?.id ?? null, role: user ? role.error ? null : role.data ?? null : "owner" });
    return () => { useBoardAccess.setState({ boardId: null, actorId: null, role: "owner" }); };
  }, [boardId, user, role.data, role.error]);
  useEffect(() => {
    if (!boardId || !user || !role.data || role.error) return;
    const supabase = getSupabaseBrowserClient(), session = crypto.randomUUID();
    let alive = true, ready = false, lastMove = 0, lastSent = 0, lastCursor: CollaboratorCursor | null = null, lastKey = "", frame = 0;
    const name = (user.displayName || "Collaborator").slice(0, 60);
    const refresh = () => window.dispatchEvent(new CustomEvent("tackly:remote-board", { detail: boardId }));
    // Pointer positions travel over Broadcast: Presence is for who is here, and
    // pushing every mouse move through it hit the realtime rate limit.
    const positions = new Map<string, { cursor: CollaboratorCursor; seen: number }>();
    const channel = supabase.channel(`tackly:board:${boardId}`, { config: { private: true, presence: { key: session }, broadcast: { self: false } } });
    const compose = () => {
      frame = 0; if (!alive) return;
      const now = Date.now();
      for (const [key, entry] of positions) if (now - entry.seen > 12_000) positions.delete(key);
      const roster = new Map(parseCursors(Object.values(channel.presenceState()).flat(), session).map(cursor => [cursor.session, cursor]));
      const merged = new Map<string, CollaboratorCursor>();
      for (const [key, cursor] of roster) { const pos = positions.get(key)?.cursor; merged.set(key, pos ? { ...cursor, ...pos, name: cursor.name } : cursor); }
      for (const [key, entry] of positions) if (!merged.has(key)) merged.set(key, entry.cursor);
      setLive({ boardId, status: ready ? "Live" : "Connecting", cursors: [...merged.values()] });
    };
    const schedule = () => { if (!frame && alive) frame = requestAnimationFrame(compose); };
    const roster = () => {
      if (!ready) return;
      const key = `${viewRef.current}|${useNoteStore.getState().expandedNoteId ?? ""}`;
      lastKey = key;
      lastCursor = { ...(lastCursor ?? { x: 0, y: 0, canvas: false }), session, userId: user.id, name, view: viewRef.current, visible: false, anchorId: null, at: Date.now(), noteId: useNoteStore.getState().expandedNoteId };
      void channel.track(lastCursor);
    };
    channel.on("presence", { event: "sync" }, schedule)
      .on("presence", { event: "leave" }, ({ key }) => { positions.delete(String(key)); schedule(); })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        const parsed = cursorSchema.safeParse(payload);
        if (!parsed.success || parsed.data.session === session) return;
        positions.set(parsed.data.session, { cursor: { ...parsed.data, visible: true }, seen: Date.now() }); schedule();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `board_id=eq.${boardId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lanes", filter: `board_id=eq.${boardId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_members", filter: `board_id=eq.${boardId}` }, () => { void client.invalidateQueries({ queryKey: ["board-role", user.id, boardId] }); void client.invalidateQueries({ queryKey: ["board-people", boardId] }); })
      .subscribe(status => {
        if (!alive) return; ready = status === "SUBSCRIBED";
        setLive({ boardId, status: ready ? "Live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "Reconnecting" : "Connecting", cursors: [] });
        if (ready) { roster(); refresh(); }
      });
    const move = (event: PointerEvent) => {
      if (!ready || Date.now() - lastMove < 40) return; lastMove = Date.now();
      const expanded = useNoteStore.getState().expandedNoteId;
      const main = expanded ? document.querySelector<HTMLElement>('[data-testid="note-focus-dialog"] .tk-paper') : document.getElementById("main-content");
      if (!main || !(event.target instanceof Node) || !main.contains(event.target)) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-note-id]") : null;
      const canvas = main.dataset.testid === "canvas", viewport = useCanvasStore.getState().viewport;
      const rect = (anchor && !canvas && !expanded ? anchor : main).getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      lastCursor = { session, userId: user.id, name, view: viewRef.current, x: canvas ? (x - viewport.x) / viewport.zoom : x / rect.width, y: canvas ? (y - viewport.y) / viewport.zoom : y / rect.height, canvas, visible: true, anchorId: !canvas && !expanded ? anchor?.dataset.noteId ?? null : null, at: Date.now(), noteId: expanded };
      lastSent = Date.now();
      void channel.send({ type: "broadcast", event: "cursor", payload: lastCursor });
      // A new view or open note is a roster change, not a pointer change.
      if (`${viewRef.current}|${expanded ?? ""}` !== lastKey) roster();
    };
    const heartbeat = window.setInterval(() => {
      if (!ready) return;
      roster();
      // Keeps a still pointer visible to people who joined after the last move.
      if (lastCursor && Date.now() - lastMove < 12_000 && Date.now() - lastSent > 3_000) { lastSent = Date.now(); void channel.send({ type: "broadcast", event: "cursor", payload: { ...lastCursor, visible: true, view: viewRef.current, at: Date.now() } }); }
      schedule();
    }, 4000);
    // Polling closes missed-event gaps and rechecks permission after removal, including DELETE events.
    const poll = window.setInterval(refresh, 5_000);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible); window.addEventListener("focus", refresh);
    document.addEventListener("pointermove", move);
    return () => { alive = false; cancelAnimationFrame(frame); document.removeEventListener("pointermove", move); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", refresh); window.clearInterval(heartbeat); window.clearInterval(poll); void supabase.removeChannel(channel); };
  }, [boardId, user, role.data, role.error, client]);
  return { role: user ? role.error ? null : role.data ?? null : "owner" as const, loading: Boolean(user && boardId && role.isLoading), error: role.error, retry: () => void role.refetch(), status: live?.boardId === boardId ? live.status : "Connecting", cursors: role.data && !role.error && live?.boardId === boardId ? live.cursors : [] };
}
