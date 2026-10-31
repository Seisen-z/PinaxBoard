import type { CategoryRow, TagRow } from "@/types/database";
import type { Category, Tag } from "@/types/note";

/**
 * Row ↔ domain for tags and categories (IMPLEMENTATION_PLAN.md §17).
 *
 * Both are workspace-scoped vocabularies the user builds up. Like the other
 * mappers, this is the only place snake_case meets camelCase.
 *
 * Neither carries `ownerId` into the domain type: ownership is enforced by Row
 * Level Security, and a field the UI never reads is a field that can go stale.
 */

export function tagFromRow(row: TagRow): Tag {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
  };
}

export function categoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    emoji: row.emoji,
  };
}
