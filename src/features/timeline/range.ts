import { dayKey, parseDate } from "@/features/calendar/month";
import type { Note } from "@/types/note";

export type TimelineScope = "week" | "month" | "quarter";
const DAY_MS = 86_400_000;
/** Civil-day arithmetic, independent of 23/25-hour daylight-saving days. */
export function dayOrdinal(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}
export interface TimelineWindow { start: Date; end: Date; days: Date[]; label: string }
export function timelineWindow(anchor: Date, scope: TimelineScope): TimelineWindow {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  let start: Date;
  let end: Date;
  if (scope === "week") {
    start = new Date(y, m, anchor.getDate() - (anchor.getDay() + 6) % 7, 12);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 12);
  } else {
    const firstMonth = scope === "quarter" ? Math.floor(m / 3) * 3 : m;
    start = new Date(y, firstMonth, 1, 12);
    end = new Date(y, firstMonth + (scope === "quarter" ? 3 : 1), 0, 12);
  }
  const length = dayOrdinal(end) - dayOrdinal(start) + 1;
  const days = Array.from({ length }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12));
  const format = (date: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  const label = scope === "quarter" ? `Q${Math.floor(start.getMonth() / 3) + 1} ${y}`
    : scope === "month" ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(start)
    : `${format(start)} - ${format(end)}`;
  return { start, end, days, label };
}
export function shiftPeriod(anchor: Date, scope: TimelineScope, delta: number): Date {
  const start = timelineWindow(anchor, scope).start;
  return scope === "week" ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 * delta, 12)
    : new Date(start.getFullYear(), start.getMonth() + delta * (scope === "quarter" ? 3 : 1), 1, 12);
}
export type NoteRange = { status: "undated" | "invalid" } | { status: "dated"; start: Date; end: Date; duration: number };
export function noteRange(note: Note): NoteRange {
  const start = parseDate(note.startAt);
  const due = parseDate(note.dueAt);
  if ((note.startAt !== null && !start) || (note.dueAt !== null && !due)) return { status: "invalid" };
  if (!start && !due) return { status: "undated" };
  const first = start ?? due!;
  const last = due ?? start!;
  const duration = dayOrdinal(last) - dayOrdinal(first) + 1;
  return duration > 0 ? { status: "dated", start: first, end: last, duration } : { status: "invalid" };
}
export interface TimelineBar { offset: number; span: number; duration: number; clippedStart: boolean; clippedEnd: boolean; label: string }
export function timelineBar(note: Note, window: TimelineWindow): TimelineBar | null {
  if (note.archived || note.deletedAt) return null;
  const range = noteRange(note);
  if (range.status !== "dated") return null;
  const first = dayOrdinal(range.start); const last = dayOrdinal(range.end);
  const left = dayOrdinal(window.start); const right = dayOrdinal(window.end);
  if (last < left || first > right) return null;
  return { offset: Math.max(first, left) - left, span: Math.min(last, right) - Math.max(first, left) + 1,
    duration: range.duration, clippedStart: first < left, clippedEnd: last > right,
    label: `${dayKey(range.start)} to ${dayKey(range.end)} (${range.duration} ${range.duration === 1 ? "day" : "days"})` };
}
