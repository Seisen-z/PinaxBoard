import type { KeyboardCoordinateGetter } from "@dnd-kit/core";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";

/** Re-read on drop: a note/column may have changed while the pointer was held. */
export function commitBoardDrop(noteId: string, laneId: string | null): boolean {
  if (!laneId) return false;
  const note = useNoteStore.getState().notes.find((record) => record.id === noteId);
  const lane = useLaneStore.getState().lanes.find((record) => record.id === laneId);
  if (!note || !lane || note.locked || note.archived || note.deletedAt ||
      note.boardId !== lane.boardId || note.laneId === lane.id) return false;
  useNoteStore.getState().setLane(note.id, lane.id);
  return true;
}

/** A left/right key moves a whole column, rather than an arbitrary 25 pixels. */
export const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") return;
  const rect = context.collisionRect;
  if (!rect) return;
  event.preventDefault();
  const centreX = rect.left + rect.width / 2;
  const direction = event.code === "ArrowRight" ? 1 : -1;
  const targets = context.droppableContainers.getEnabled().flatMap((container) => {
    const target = context.droppableRects.get(container.id);
    if (!target) return [];
    const x = target.left + target.width / 2;
    return (x - centreX) * direction > 1 ? [{ x, rect: target }] : [];
  }).sort((a, b) => Math.abs(a.x - centreX) - Math.abs(b.x - centreX));
  const target = targets[0];
  if (!target) return;
  return {
    x: currentCoordinates.x + target.x - centreX,
    y: currentCoordinates.y + target.rect.top + target.rect.height / 2 - (rect.top + rect.height / 2),
  };
};
