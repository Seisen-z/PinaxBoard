"use client";

import { useMemo } from "react";

import type { LaneHeaderActions } from "@/components/board/lane-header";
import { firstLaneId, useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";

export interface LaneActions extends LaneHeaderActions {
  onAddLane: () => void;
}

/**
 * Binds the lane store to the board's column UI.
 *
 * Deleting a column is the one action that crosses stores: the lane store owns
 * columns and the note store owns notes, so this hook — which knows about both
 * — decides what happens to the orphans. Notes are **moved to the first
 * remaining column**, never deleted. Losing a column's worth of work to a menu
 * click is not a recoverable mistake, and the notes are one drag away from
 * wherever the user actually wants them.
 *
 * @example
 * const laneActions = useLaneActions();
 * <LaneHeader lane={lane} actions={laneActions} … />
 */
export function useLaneActions(): LaneActions {
  const addLane = useLaneStore((state) => state.addLane);
  const renameLane = useLaneStore((state) => state.renameLane);
  const setLaneColor = useLaneStore((state) => state.setLaneColor);
  const moveLane = useLaneStore((state) => state.moveLane);
  const removeLane = useLaneStore((state) => state.removeLane);
  const beginRename = useLaneStore((state) => state.beginRename);
  const endRename = useLaneStore((state) => state.endRename);

  const addNote = useNoteStore((state) => state.addNote);
  const moveNotesToLane = useNoteStore((state) => state.moveNotesToLane);
  const sendLaneToCanvas = useNoteStore((state) => state.sendLaneToCanvas);

  return useMemo<LaneActions>(
    () => ({
      onAddLane: () => {
        addLane();
      },
      onAddNote: (laneId) => {
        addNote(laneId);
      },
      onRename: renameLane,
      onBeginRename: beginRename,
      onEndRename: endRename,
      onSetColor: setLaneColor,
      onMove: moveLane,
      onSendToCanvas: sendLaneToCanvas,

      onDelete: (laneId) => {
        // Work out the destination *before* removing the lane, or the lane
        // being deleted could be picked as its own fallback.
        const remaining = useLaneStore
          .getState()
          .lanes.filter((lane) => lane.id !== laneId);

        const fallback = firstLaneId({
          ...useLaneStore.getState(),
          lanes: remaining,
        });

        // No fallback means this was the last column; `removeLane` refuses.
        if (!fallback) return;

        moveNotesToLane(laneId, fallback);
        removeLane(laneId);
      },
    }),
    [
      addLane,
      addNote,
      beginRename,
      endRename,
      moveLane,
      moveNotesToLane,
      removeLane,
      renameLane,
      sendLaneToCanvas,
      setLaneColor,
    ],
  );
}
