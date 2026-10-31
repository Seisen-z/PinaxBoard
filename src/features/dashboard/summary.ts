import { parseDate } from "@/features/calendar/month";
import type { Note } from "@/types/note";
import type { Board } from "@/types/board";

export const DASHBOARD_SECTIONS = ["Today", "Overdue", "Upcoming", "High Priority", "Recently Edited", "Completed Today", "Pinned Notes"] as const;
export type DashboardSection = typeof DASHBOARD_SECTIONS[number];

/** Active-board working records from the existing query hydration, never a second cache. */
export function dashboardSummary(notes: readonly Note[], now: Date): Record<DashboardSection, Note[]> {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const endUpcoming = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8).getTime();
  const live = notes.filter((note) => !note.archived && !note.deletedAt);
  const open = live.filter((note) => !note.completed);
  const due = (note: Note) => parseDate(note.dueAt)?.getTime() ?? Infinity;
  const isToday = (value: string | null | undefined) => {
    const time = parseDate(value ?? null)?.getTime();
    return time !== undefined && time >= today && time < tomorrow;
  };
  const byDue = (a: Note, b: Note) => due(a) - due(b) || a.id.localeCompare(b.id);
  const byEdited = (a: Note, b: Note) => (parseDate(b.updatedAt)?.getTime() ?? 0) - (parseDate(a.updatedAt)?.getTime() ?? 0) || a.id.localeCompare(b.id);
  return {
    Today: open.filter((note) => isToday(note.dueAt) || isToday(note.startAt)).sort(byDue),
    Overdue: open.filter((note) => due(note) < today).sort(byDue),
    Upcoming: open.filter((note) => due(note) >= tomorrow && due(note) < endUpcoming).sort(byDue),
    "High Priority": open.filter((note) => note.priority === "high" || note.priority === "urgent").sort((a, b) => Number(b.priority === "urgent") - Number(a.priority === "urgent") || byDue(a, b)),
    "Recently Edited": [...live].sort(byEdited),
    "Completed Today": live.filter((note) => note.completed && isToday(note.completedAt)).sort((a, b) => (parseDate(b.completedAt ?? null)?.getTime() ?? 0) - (parseDate(a.completedAt ?? null)?.getTime() ?? 0) || a.id.localeCompare(b.id)),
    "Pinned Notes": live.filter((note) => note.pinned).sort(byEdited),
  };
}

/** Recency means board updatedAt, not an invented last-visited timestamp. */
export function recentBoards(boards: readonly Board[]): Board[] {
  return boards.filter((board) => !board.archivedAt).sort((a, b) =>
    (parseDate(b.updatedAt)?.getTime() ?? 0) - (parseDate(a.updatedAt)?.getTime() ?? 0) || a.id.localeCompare(b.id));
}
