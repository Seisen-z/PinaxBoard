import type { Priority } from "@/types/common";

/** Priority scale (FRONTEND_SPEC.md §21). */
export interface PriorityDefinition {
  id: Priority;
  label: string;
  colorVar: string;
  /**
   * Rank used for sorting, highest first. Kept explicit rather than derived
   * from array order so reordering the catalogue cannot silently change sorts.
   */
  rank: number;
}

export const PRIORITY_DEFINITIONS: readonly PriorityDefinition[] = [
  { id: "none", label: "None", colorVar: "--priority-none", rank: 0 },
  { id: "low", label: "Low", colorVar: "--priority-low", rank: 1 },
  { id: "medium", label: "Medium", colorVar: "--priority-medium", rank: 2 },
  { id: "high", label: "High", colorVar: "--priority-high", rank: 3 },
  { id: "urgent", label: "Urgent", colorVar: "--priority-urgent", rank: 4 },
] as const;

const PRIORITY_BY_ID = new Map<Priority, PriorityDefinition>(
  PRIORITY_DEFINITIONS.map((definition) => [definition.id, definition]),
);

/** Resolves a priority, falling back to None for unknown ids. */
export function getPriority(id: Priority): PriorityDefinition {
  const definition = PRIORITY_BY_ID.get(id);
  if (definition) return definition;

  return PRIORITY_BY_ID.get("none") as PriorityDefinition;
}
