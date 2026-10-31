import { parseDate } from "@/features/calendar/month";
import type { Note } from "@/types/note";

export const REPEAT_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
export type RepeatFrequency = typeof REPEAT_FREQUENCIES[number];
export interface RepeatRule { frequency: RepeatFrequency; anchorDay: number; anchorMonth: number; timeZone?: string; anchorTime?: string; nextId?: string }

export function parseRepeatRule(value: unknown): RepeatRule | null {
  if (!value || typeof value !== "object") return null;
  const rule = value as Record<string, unknown>;
  if (!REPEAT_FREQUENCIES.includes(rule.frequency as RepeatFrequency) || !Number.isInteger(rule.anchorDay) || Number(rule.anchorDay) < 1 || Number(rule.anchorDay) > 31 || !Number.isInteger(rule.anchorMonth) || Number(rule.anchorMonth) < 0 || Number(rule.anchorMonth) > 11) return null;
  if (rule.nextId !== undefined && (typeof rule.nextId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rule.nextId))) return null;
  if (rule.timeZone !== undefined) {
    if (typeof rule.timeZone !== "string") return null;
    try { new Intl.DateTimeFormat("en-US", { timeZone: rule.timeZone }); } catch { return null; }
  }
  if (rule.anchorTime !== undefined && (typeof rule.anchorTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}$/.test(rule.anchorTime))) return null;
  return { frequency: rule.frequency as RepeatFrequency, anchorDay: Number(rule.anchorDay), anchorMonth: Number(rule.anchorMonth), ...(typeof rule.timeZone === "string" ? { timeZone: rule.timeZone } : {}), ...(typeof rule.anchorTime === "string" ? { anchorTime: rule.anchorTime } : {}), ...(typeof rule.nextId === "string" ? { nextId: rule.nextId } : {}) };
}

export function repeatRule(frequency: RepeatFrequency, dueAt: string): RepeatRule | null {
  const date = parseDate(dueAt);
  return date ? { frequency, anchorDay: date.getDate(), anchorMonth: date.getMonth(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, anchorTime: `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}:${String(date.getSeconds()).padStart(2,"0")}.${String(date.getMilliseconds()).padStart(3,"0")}` } : null;
}

function wallDate(date: Date, zone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month")-1, get("day"), get("hour"), get("minute"), get("second"), date.getMilliseconds()));
}
function fromWall(wall: Date, zone: string): Date | null {
  const target = wall.getTime();
  const offsets = new Set([-2, 0, 2].map((days) => {
    const sample = new Date(target + days * 86400000);
    return wallDate(sample, zone).getTime() - sample.getTime();
  }));
  const candidates = [...offsets].map((offset) => new Date(target-offset));
  const exact = candidates.filter((date) => wallDate(date, zone).getTime() === target).sort((a,b) => a.getTime()-b.getTime());
  if (exact[0]) return exact[0]; // Fall overlap: first valid occurrence.
  return candidates.filter((date) => wallDate(date, zone).getTime() >= target).sort((a,b) => wallDate(a,zone).getTime()-wallDate(b,zone).getTime())[0] ?? null; // Spring gap: shift forward.
}
/** Fixed schedule timezone prevents different clients generating different successors. */
export function nextOccurrence(dueAt: string, rule: RepeatRule): Date | null {
  const current = parseDate(dueAt);
  if (!current || !parseRepeatRule(rule)) return null;
  const zone = rule.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const next = wallDate(current, zone);
  if (rule.frequency === "daily" || rule.frequency === "weekly") next.setUTCDate(next.getUTCDate() + (rule.frequency === "daily" ? 1 : 7));
  else {
    next.setUTCDate(1);
    if (rule.frequency === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
    else { next.setUTCFullYear(next.getUTCFullYear() + 1); next.setUTCMonth(rule.anchorMonth); }
    next.setUTCDate(Math.min(rule.anchorDay, new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth()+1,0)).getUTCDate()));
  }
  if (rule.anchorTime) {
    const [hour, minute, second, ms] = rule.anchorTime.split(/[:.]/).map(Number);
    next.setUTCHours(hour!, minute!, second!, ms!);
  }
  const result = fromWall(next, zone);
  return result && result.getTime() > current.getTime() ? result : null;
}

/** Stable UUID-shaped application id, not a cryptographic token or UUID-v5 claim. */
export function occurrenceId(parentId: string, nextAt: string): string {
  const input = `${parentId}:${nextAt}`;
  const parts = [2166136261, 2246822507, 3266489909, 668265263].map((seed) => {
    let hash = seed;
    for (let i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, "0");
  });
  const hex = parts.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

/** One successor per scheduled occurrence; overdue completion advances one step, not a flood. */
export function recurringSuccessor(note: Note, now: string): Note | null {
  const rule = parseRepeatRule(note.repeatRule);
  const due = parseDate(note.dueAt);
  if (!rule || rule.nextId || !due || note.archived || note.deletedAt) return null;
  const next = nextOccurrence(note.dueAt!, rule);
  if (!next) return null;
  const nextAt = next.toISOString();
  const id = occurrenceId(note.id, nextAt);
  const start = parseDate(note.startAt);
  const zone = rule.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  let nextStart: Date | null = null;
  if (start) {
    const civil = (date: Date) => { const wall = wallDate(date, zone); return Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) / 86400000; };
    const wall = wallDate(start, zone); wall.setUTCDate(wall.getUTCDate()+civil(next)-civil(due)); nextStart=fromWall(wall,zone);
  }
  const reminder = parseDate(note.remindAt ?? null);
  return {
    ...note, id, title: note.title, completed: false, completedAt: null, pinned: false, locked: false,
    recurrenceSourceId: note.id, startAt: nextStart?.toISOString() ?? null, dueAt: nextAt,
    remindAt: reminder ? new Date(next.getTime() - (due.getTime() - reminder.getTime())).toISOString() : null,
    subtasks: note.subtasks.map((task, i) => ({ ...task, id: `${id}-${i}`, noteId: id, completed: false })),
    transform: { ...note.transform, x: note.transform.x + 24, y: note.transform.y + 24, zIndex: note.transform.zIndex + 1 },
    createdAt: now, updatedAt: now, deletedAt: null,
  };
}

export function dueReminders(notes: readonly Note[], now: number): Note[] {
  return notes.filter((note) => !note.completed && !note.archived && !note.deletedAt && parseDate(note.remindAt ?? null) !== null && parseDate(note.remindAt!)!.getTime() <= now);
}

export function localDateTime(value: string | null | undefined): string {
  const date = parseDate(value ?? null);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalDateTime(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = parseDate(value);
  return date && localDateTime(date.toISOString()) === value ? date.toISOString() : null;
}
