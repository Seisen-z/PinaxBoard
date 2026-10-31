import type { ISODateString, UUID } from "@/types/common";

/**
 * A column on the Board.
 *
 * Lanes are **user data**, not a fixed enum. People name their own columns —
 * "Today", "Waiting on Sam", "Someday" — and rename, recolor, reorder and
 * delete them. The five lanes the app ships with (To Do, In Progress, Review,
 * Done, Ideas) are seed values, nothing more.
 *
 * This is why a note stores `laneId` rather than a status: a status enum would
 * make "rename this column" a schema migration.
 */
export interface Lane {
  id: UUID;
  boardId: UUID;
  name: string;
  /** CSS color for the lane's accent dot. */
  color: string;
  /** Sort order on the board, ascending. */
  position: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** What happens to a lane's notes when the lane is deleted. */
export type LaneDeletionStrategy =
  /** Move them into another lane. */
  | { kind: "move"; targetLaneId: UUID }
  /** Delete them along with the lane. */
  | { kind: "delete" };
