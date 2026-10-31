import type { Note, Category } from "@/types/note";
export interface ProductivityMetrics { completedToday: number; completedWeek: number; completedMonth: number; currentStreak: number; activeNotes: number; activeBoards: number; mostActiveCategory: string | null; days: { date: string; count: number }[]; }
export function productivityMetrics(notes: readonly Note[], now = new Date(), categories: readonly Category[] = []): ProductivityMetrics {
  const live = notes.filter((note) => !note.deletedAt && !note.archived);
  const completed = live.filter((note) => note.completed && note.completedAt && Number.isFinite(Date.parse(note.completedAt)) && Date.parse(note.completedAt) <= now.getTime());
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const counts = new Map<string, number>(); const categoryCounts = new Map<string, number>();
  for (const note of completed) { const day = localDay(new Date(note.completedAt!)); counts.set(day, (counts.get(day) ?? 0) + 1); if (note.categoryId) categoryCounts.set(note.categoryId, (categoryCounts.get(note.categoryId) ?? 0) + 1); }
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!counts.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0; while (counts.has(localDay(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const category = [...categoryCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  return { completedToday: counts.get(localDay(now)) ?? 0, completedWeek: completed.filter((note) => Date.parse(note.completedAt!) >= weekStart.getTime()).length,
    completedMonth: completed.filter((note) => Date.parse(note.completedAt!) >= monthStart.getTime()).length, currentStreak: streak,
    activeNotes: live.filter((note) => !note.completed).length, activeBoards: new Set(live.filter((note) => !note.completed).map((note) => note.boardId)).size,
    mostActiveCategory: categories.find((item) => item.id === category)?.name ?? null,
    days: Array.from({ length: 14 }, (_, index) => { const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13 + index); const key = localDay(date); return { date: key, count: counts.get(key) ?? 0 }; }),
  };
}
function localDay(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
