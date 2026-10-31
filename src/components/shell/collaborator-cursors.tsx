"use client";
import { useEffect, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { useNoteStore } from "@/stores/note-store";
import { useCanvasStore } from "@/stores/canvas-store";
import type { CollaboratorCursor } from "@/features/collaboration/presence";

export function CollaboratorCursors({ cursors, view }: { cursors: readonly CollaboratorCursor[]; view: string }) {
  const expanded=useNoteStore(state=>state.expandedNoteId);
  const viewport = useCanvasStore(state => state.viewport);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const measure = () => setRect(document.getElementById("main-content")?.getBoundingClientRect() ?? null);
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;const main=document.getElementById("main-content");if(main)observer?.observe(main);
    measure(); window.addEventListener("resize", measure); document.addEventListener("scroll", measure, true);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); document.removeEventListener("scroll", measure, true); };
  }, [view]);
  if (!rect) return null;
  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[calc(var(--z-overlay)+1)] overflow-hidden" data-testid="collaborator-cursors">
    {cursors.filter(cursor => cursor.visible && (cursor.noteId ? cursor.noteId===expanded : cursor.view===view && !expanded)).map(cursor => {
      const anchor=cursor.anchorId ? Array.from(document.querySelectorAll<HTMLElement>("[data-note-id]")).find(node=>node.dataset.noteId===cursor.anchorId) : null;
      if(cursor.anchorId&&!anchor)return null;
      const bounds=cursor.noteId ? document.querySelector<HTMLElement>('[data-testid="note-focus-dialog"] .tk-paper')?.getBoundingClientRect() : anchor?.getBoundingClientRect() ?? rect;
      if(!bounds)return null;
      const x = cursor.canvas ? cursor.x * viewport.zoom + viewport.x : cursor.x * bounds.width;
      const y = cursor.canvas ? cursor.y * viewport.zoom + viewport.y : cursor.y * bounds.height;
      if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return null;
      return <div key={cursor.session} className="absolute text-primary" style={{ transform: `translate(${bounds.left + x}px,${bounds.top + y}px)` }}><MousePointer2 size={18} fill="currentColor" /><span className="ml-4 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">{cursor.name}</span></div>;
    })}
  </div>;
}
