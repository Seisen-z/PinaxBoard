import { DEFAULT_LANE_SEEDS } from "@/config/lanes";
import {
  MOCK_BOARD_ID,
  MOCK_OWNER_ID,
  MOCK_WORKSPACE_ID,
} from "@/features/board/board-identity";
import { createBlankNote } from "@/features/notes/create-note";
import type { Priority } from "@/types/common";
import type {
  Note,
  NoteColorId,
  NoteStyleId,
  Subtask,
  Tag,
} from "@/types/note";

/**
 * Test-only Board fixtures, retained for regression coverage.
 *
 * Production stores/catalogues must not import this module or seed its notes.
 * Only test harnesses use this content; real workspaces start empty.
 *
 * Timestamps are fixed rather than relative to `Date.now()` so snapshots and
 * date formatting stay deterministic across runs.
 */

export {
  MOCK_BOARD_ID,
  MOCK_OWNER_ID,
  MOCK_WORKSPACE_ID,
  MOCK_WORKSPACE_NAME,
} from "@/features/board/board-identity";

/**
 * Lane ids used by the fixtures below.
 *
 * The mocks reference the seeded lanes by name rather than hard-coding ids,
 * so renaming a seed cannot silently orphan a fixture note.
 */
const LANE = Object.fromEntries(
  DEFAULT_LANE_SEEDS.map((seed) => [seed.name, seed.id]),
) as Record<string, string>;

function laneIdFor(name: string): string {
  const id = LANE[name];
  if (!id) throw new Error(`No seeded lane named "${name}"`);
  return id;
}

const CREATED_AT = "2026-09-20T09:00:00.000Z";

export const MOCK_TAGS: readonly Tag[] = [
  { id: "tag-work", workspaceId: MOCK_WORKSPACE_ID, name: "work", color: "var(--info)" },
  { id: "tag-planning", workspaceId: MOCK_WORKSPACE_ID, name: "planning", color: "var(--status-ideas)" },
  { id: "tag-design", workspaceId: MOCK_WORKSPACE_ID, name: "design", color: "var(--priority-high)" },
  { id: "tag-dev", workspaceId: MOCK_WORKSPACE_ID, name: "development", color: "var(--success)" },
  { id: "tag-important", workspaceId: MOCK_WORKSPACE_ID, name: "important", color: "var(--danger)" },
] as const;

interface MockNoteInput {
  id: string;
  lane: string;
  title: string;
  excerpt?: string;
  color: NoteColorId;
  style?: NoteStyleId;
  priority?: Priority;
  tagIds?: string[];
  subtasks?: string[];
  completedSubtasks?: number;
  dueAt?: string;
  pinned?: boolean;
  completed?: boolean;
  onCanvas?: boolean;
}

/**
 * Spreads the mock notes across the canvas.
 *
 * `createBlankNote` places notes at the origin, which is right for a note the
 * user creates but would stack all eleven mocks on top of each other in Canvas
 * Mode. They are laid out in a loose four-column grid with a small per-note
 * jitter, so the canvas looks like a desk rather than a spreadsheet.
 */
function mockPlacement(index: number): { x: number; y: number; zIndex: number } {
  const columns = 4;
  const column = index % columns;
  const row = Math.floor(index / columns);

  // Deterministic pseudo-jitter — a real random would break snapshot stability.
  const jitterX = ((index * 37) % 23) - 11;
  const jitterY = ((index * 53) % 19) - 9;

  return {
    x: 80 + column * 320 + jitterX,
    y: 80 + row * 300 + jitterY,
    zIndex: index + 1,
  };
}

let mockIndex = 0;

/** Builds a mock note on top of the real blank-note factory. */
function mockNote(input: MockNoteInput): Note {
  const placement = mockPlacement(mockIndex);
  mockIndex += 1;

  const base = createBlankNote({
    boardId: MOCK_BOARD_ID,
    ownerId: MOCK_OWNER_ID,
    laneId: laneIdFor(input.lane),
    x: placement.x,
    y: placement.y,
    zIndex: placement.zIndex,
  });

  const subtasks: Subtask[] = (input.subtasks ?? []).map((title, index) => ({
    id: `${input.id}-sub-${index}`,
    noteId: input.id,
    title,
    completed: index < (input.completedSubtasks ?? 0),
    position: index,
  }));

  return {
    ...base,
    id: input.id,
    title: input.title,
    excerpt: input.excerpt ?? "",
    appearance: {
      ...base.appearance,
      color: input.color,
      style: input.style ?? base.appearance.style,
    },
    priority: input.priority ?? "none",
    tagIds: input.tagIds ?? [],
    subtasks,
    dueAt: input.dueAt ?? null,
    pinned: input.pinned ?? false,
    completed: input.completed ?? false,
    onCanvas: input.onCanvas ?? false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

export const MOCK_NOTES: readonly Note[] = [
  mockNote({
    id: "note-project-planning",
    lane: "To Do",
    title: "Project Planning",
    color: "yellow",
    priority: "high",
    tagIds: ["tag-work", "tag-planning"],
    subtasks: [
      "Define requirements",
      "Create roadmap",
      "Assign tasks",
      "Review with the team",
    ],
    completedSubtasks: 1,
    dueAt: "2026-09-28T17:00:00.000Z",
    pinned: true,
  }),
  mockNote({
    id: "note-groceries",
    lane: "To Do",
    title: "Weekend Shopping",
    color: "mint",
    style: "lined",
    subtasks: ["Coffee beans", "Olive oil", "Notebook refills"],
    tagIds: [],
  }),
  mockNote({
    id: "note-reading",
    lane: "To Do",
    title: "Reading list",
    excerpt:
      "Three articles on spatial interfaces, plus the chapter on direct manipulation.",
    color: "cream",
    style: "minimal",
    priority: "low",
  }),
  mockNote({
    id: "note-canvas-mode",
    onCanvas: true,
    lane: "In Progress",
    title: "Canvas Mode prototype",
    excerpt:
      "Pointer-driven drag with requestAnimationFrame transforms. Commit the note position on pointerup, never per mousemove.",
    color: "blue",
    priority: "urgent",
    tagIds: ["tag-dev", "tag-important"],
    dueAt: "2026-09-30T12:00:00.000Z",
  }),
  mockNote({
    id: "note-design-tokens",
    onCanvas: true,
    lane: "In Progress",
    title: "Design tokens",
    color: "lavender",
    style: "grid",
    tagIds: ["tag-design"],
    subtasks: ["Surfaces", "Paper colors", "Clay depth", "Status colors"],
    completedSubtasks: 3,
  }),
  mockNote({
    id: "note-copy-review",
    lane: "Review",
    title: "Empty state copy",
    excerpt:
      "“Your board is empty. Create your first note and start organizing your workspace.”",
    color: "peach",
    priority: "medium",
    tagIds: ["tag-design"],
  }),
  mockNote({
    id: "note-a11y-pass",
    lane: "Review",
    title: "Accessibility pass",
    color: "pink",
    subtasks: ["Focus rings", "Touch targets", "Reduced motion"],
    completedSubtasks: 2,
    tagIds: ["tag-dev"],
  }),
  mockNote({
    id: "note-shell",
    lane: "Done",
    title: "Application shell",
    excerpt: "Solid header, open lanes, floating controls.",
    color: "mint",
    completed: true,
    subtasks: ["Header", "Lanes", "Controls"],
    completedSubtasks: 3,
    tagIds: ["tag-work"],
  }),
  mockNote({
    id: "note-scaffold",
    lane: "Done",
    title: "Project scaffolding",
    color: "slate",
    style: "dark",
    completed: true,
    dueAt: "2026-09-22T10:00:00.000Z",
  }),
  mockNote({
    id: "note-focus-mode",
    onCanvas: true,
    lane: "Ideas",
    title: "Focus Mode ambience",
    excerpt:
      "Dim the board, centre the note, keep the paper texture. Maybe an optional soundscape.",
    color: "kraft",
    style: "kraft",
    tagIds: ["tag-planning"],
  }),
  mockNote({
    id: "note-desk-objects",
    lane: "Ideas",
    title: "Desk objects",
    excerpt: "Push pins, paper clips, a coffee ring. Sparingly.",
    color: "yellow",
    style: "sticky",
  }),
] as const;
