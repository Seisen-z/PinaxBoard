"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchBoardRole } from "./repository";
import { useBoardAccess } from "./access";
import { parseCursors, type CollaboratorCursor } from "./presence";
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
    let alive = true, ready = false, lastMove = 0, lastCursor: CollaboratorCursor | null = null;
    const refresh = () => window.dispatchEvent(new CustomEvent("tackly:remote-board", { detail: boardId }));
    const channel = supabase.channel(`tackly:board:${boardId}`, { config: { private: true, presence: { key: session } } });
    const read = () => { if (alive) setLive({ boardId, status: ready ? "Live" : "Connecting", cursors: parseCursors(Object.values(channel.presenceState()).flat(), session) }); };
    channel.on("presence", { event: "sync" }, read)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `board_id=eq.${boardId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "lanes", filter: `board_id=eq.${boardId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_members", filter: `board_id=eq.${boardId}` }, () => { void client.invalidateQueries({ queryKey: ["board-role", user.id, boardId] }); void client.invalidateQueries({ queryKey: ["board-people", boardId] }); })
      .subscribe(status => {
        if (!alive) return; ready = status === "SUBSCRIBED";
        setLive({ boardId, status: ready ? "Live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "Reconnecting" : "Connecting", cursors: [] });
        if (ready) {
          lastCursor={session,userId:user.id,name:(user.displayName||"Collaborator").slice(0,60),view:viewRef.current,x:0,y:0,canvas:false,visible:false,at:Date.now(),noteId:null};
          void channel.track(lastCursor);refresh();
        }
      });
    const move = (event: PointerEvent) => {
      if (!ready || Date.now() - lastMove < 80) return; lastMove = Date.now();
      const expanded=useNoteStore.getState().expandedNoteId;
      const main = expanded ? document.querySelector<HTMLElement>('[data-testid="note-focus-dialog"] .tk-paper') : document.getElementById("main-content");
      if (!main || !(event.target instanceof Node) || !main.contains(event.target)) return;
      const anchor=event.target instanceof Element ? event.target.closest<HTMLElement>("[data-note-id]") : null;
      const canvasSurface=main.dataset.testid === "canvas";
      const rect = (anchor && !canvasSurface && !expanded ? anchor : main).getBoundingClientRect(), canvas = main.dataset.testid === "canvas", viewport = useCanvasStore.getState().viewport;
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      lastCursor = { session, userId: user.id, name: (user.displayName || "Collaborator").slice(0, 60), view: viewRef.current, x: canvas ? (x - viewport.x) / viewport.zoom : x / rect.width, y: canvas ? (y - viewport.y) / viewport.zoom : y / rect.height, canvas, visible:true, anchorId:!canvas && !expanded ? anchor?.dataset.noteId ?? null : null, at: Date.now(), noteId: useNoteStore.getState().expandedNoteId };
      void channel.track(lastCursor);
    };
    const heartbeat = window.setInterval(() => { if (ready && lastCursor) void channel.track({ ...lastCursor, view:viewRef.current, visible:Date.now()-lastMove<12_000 && lastCursor.view===viewRef.current, at: Date.now() }); read(); }, 4000);
    // Polling closes missed-event gaps and rechecks permission after removal, including DELETE events.
    const poll = window.setInterval(refresh, 12_000);
    document.addEventListener("pointermove", move);
    return () => { alive = false; document.removeEventListener("pointermove", move); window.clearInterval(heartbeat); window.clearInterval(poll); void supabase.removeChannel(channel); };
  }, [boardId, user, role.data, role.error, client]);
  return { role: user ? role.error ? null : role.data ?? null : "owner" as const, loading: Boolean(user && boardId && role.isLoading), error: role.error, retry: () => void role.refetch(), status: live?.boardId === boardId ? live.status : "Connecting", cursors: role.data && !role.error && live?.boardId === boardId ? live.cursors : [] };
}
