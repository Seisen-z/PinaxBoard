import { normalizeBackground } from "@/features/background/settings";
import type { BoardRow, WorkspaceRow } from "@/types/database";
import type { Board, BackgroundSettings } from "@/types/board";
import { LAYOUT_MODES, isMemberOf, type LayoutMode } from "@/types/common";
import type { Workspace } from "@/types/workspace";

/**
 * Translation between `workspaces` / `boards` rows and their domain objects.
 *
 * Reads are defensive for the same reason as the note mapper: a row can be
 * older or newer than this build, and an unrecognised value must degrade to a
 * sensible default rather than blanking the workspace picker.
 */

export function workspaceFromRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export function boardFromRow(row: BoardRow): Board {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    layoutMode: toLayoutMode(row.layout_mode),
    background: toBackground(row.background),
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

/**
 * The schema also allows `'board'`, the lane surface, which is not a
 * `LayoutMode` — the layout list describes alternate *views* of a board, while
 * the lane Board is the board's home surface. Anything unrecognised falls back
 * to Canvas Mode's sibling default.
 */
function toLayoutMode(value: string): LayoutMode {
  return isMemberOf(LAYOUT_MODES, value) ? value : "canvas";
}

/**
 * Parses the `background` jsonb column.
 *
 * Merged over the default rather than replacing it, so a row written before a
 * new effect existed still produces a complete settings object — a missing
 * `vignette` would otherwise render as `undefined` in a CSS variable and
 * silently break the background layer.
 */
function toBackground(value: unknown): BackgroundSettings {
  return normalizeBackground(value);
}
