import { DEFAULT_LANE_COLOR, UNTITLED_LANE_NAME } from "@/config/lanes";
import type { LaneRow } from "@/types/database";
import type { Lane } from "@/types/lane";

/**
 * Translation between `lanes` rows and the `Lane` domain object.
 *
 * As with notes, reads are defensive: a column with a blank name would render
 * an anonymous header, so it falls back to the placeholder name instead.
 */

export function laneFromRow(row: LaneRow): Lane {
  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name.trim() || UNTITLED_LANE_NAME,
    color: row.color || DEFAULT_LANE_COLOR,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function laneToInsert(lane: Lane, ownerId: string): LaneRow {
  return {
    id: lane.id,
    board_id: lane.boardId,
    owner_id: ownerId,
    name: lane.name,
    color: lane.color,
    position: lane.position,
    created_at: lane.createdAt,
    updated_at: lane.updatedAt,
  };
}

/** Only the changed fields, for the same reason as `noteToUpdate`. */
export function laneToUpdate(patch: Partial<Lane>): Partial<LaneRow> {
  const row: Partial<LaneRow> = {};

  if (patch.name !== undefined) row.name = patch.name;
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.position !== undefined) row.position = patch.position;

  return row;
}
