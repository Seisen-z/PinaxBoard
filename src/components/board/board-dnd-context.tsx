"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor,
  closestCenter, pointerWithin, useSensor, useSensors,
} from "@dnd-kit/core";
import { SurfaceCard } from "@/components/ui/surface-card";
import { columnKeyboardCoordinates, commitBoardDrop } from "@/features/board/board-dnd";
import { resolveNoteAppearance } from "@/lib/note-appearance";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";

export function BoardDndContext({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const notes = useNoteStore((state) => state.notes);
  const activeNote = notes.find((note) => note.id === activeId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
  );
  const noteName = (id: string | number) => useNoteStore.getState().notes.find((note) => note.id === id)?.title || "Untitled note";
  const laneName = (id: string | number) => useLaneStore.getState().lanes.find((lane) => lane.id === id)?.name || "column";

  return (
    <DndContext sensors={sensors}
      collisionDetection={(args) => args.pointerCoordinates ? pointerWithin(args) : closestCenter(args)}
      accessibility={{
        screenReaderInstructions: { draggable: "Press Space or Enter to pick up a note. Use Left and Right to choose a column. Press Space or Enter to drop, or Escape to cancel." },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${noteName(active.id)}.`,
          onDragOver: ({ over }) => over ? `Over ${laneName(over.id)}.` : "Outside the columns.",
          onDragEnd: ({ active, over }) => over ? `Dropped ${noteName(active.id)} on ${laneName(over.id)}.` : "Move cancelled.",
          onDragCancel: () => "Move cancelled. Note unchanged.",
        },
      }}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={({ active, over }) => {
        commitBoardDrop(String(active.id), over ? String(over.id) : null);
        setActiveId(null);
      }}>
      {children}
      <DragOverlay dropAnimation={null} style={{ zIndex: "var(--z-note-dragging)" }}>
        {activeNote ? (
          <SurfaceCard elevation="drag" style={resolveNoteAppearance(activeNote.appearance).paperStyle}
            className="pointer-events-none border p-3.5" aria-hidden="true">
            <p className="truncate font-semibold">{activeNote.title || "Untitled note"}</p>
            <p className="line-clamp-2 text-xs opacity-75">{activeNote.excerpt}</p>
          </SurfaceCard>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
