import type { Note } from "@/types/note";

/** Calendar keys are local days, never UTC date slices. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const result = new Date(year!, month! - 1, day!, 12);
    return dayKey(result) === value ? result : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date-only input means the end of that local day, not an already-overdue noon. */
export function dueAtForDay(date: Date): string {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).toISOString();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function shiftMonth(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
}

export interface CalendarDay { date: Date; key: string; inMonth: boolean }

/** Six complete Sunday-first weeks, including neighbouring-month days. */
export function monthDays(month: Date): CalendarDay[] {
  const first = startOfMonth(month);
  const offset = first.getDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first.getFullYear(), first.getMonth(), 1 - offset + index, 12);
    return { date, key: dayKey(date), inMonth: date.getMonth() === first.getMonth() && date.getFullYear() === first.getFullYear() };
  });
}

/** A projection only. Keep original record identity and the caller's sort order. */
export function notesByDay(notes: readonly Note[]): Map<string, Note[]> {
  const grouped = new Map<string, Note[]>();
  for (const note of notes) {
    if (note.archived || note.deletedAt) continue;
    const due = parseDate(note.dueAt);
    if (!due) continue;
    const key = dayKey(due);
    const bucket = grouped.get(key) ?? [];
    bucket.push(note);
    grouped.set(key, bucket);
  }
  return grouped;
}
