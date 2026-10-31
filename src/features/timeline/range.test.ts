import { describe, expect, it } from "vitest";
import { MOCK_NOTES } from "@/features/board/mock-board";
import { dayKey, dueAtForDay } from "@/features/calendar/month";
import { dayOrdinal, noteRange, shiftPeriod, timelineBar, timelineWindow } from "@/features/timeline/range";

const note = (start: string | null, due: string | null) => ({ ...MOCK_NOTES[0]!, archived: false, deletedAt: null, startAt: start, dueAt: due });
describe("timeline ranges", () => {
  it("makes a Monday-first week and handles year boundaries", () => {
    const window = timelineWindow(new Date(2027, 0, 1), "week");
    expect(dayKey(window.start)).toBe("2026-12-28");
    expect(dayKey(window.end)).toBe("2027-01-03");
    expect(window.days).toHaveLength(7);
  });
  it("uses real month and calendar-quarter lengths including leap years", () => {
    expect(timelineWindow(new Date(2024, 1, 29), "month").days).toHaveLength(29);
    const quarter = timelineWindow(new Date(2024, 1, 29), "quarter");
    expect(dayKey(quarter.start)).toBe("2024-01-01");
    expect(dayKey(quarter.end)).toBe("2024-03-31");
    expect(quarter.days).toHaveLength(91);
    expect(timelineWindow(new Date(2026, 9, 9), "quarter").days).toHaveLength(92);
  });
  it("shifts scopes without month-end overflow", () => {
    expect(dayKey(shiftPeriod(new Date(2026, 0, 31), "month", 1))).toBe("2026-02-01");
    expect(dayKey(shiftPeriod(new Date(2026, 11, 31), "quarter", 1))).toBe("2027-01-01");
    expect(dayKey(shiftPeriod(new Date(2026, 9, 9), "week", -1))).toBe("2026-09-28");
  });
  it("computes inclusive civil-day duration independent of daylight-saving hour counts", () => {
    const first = new Date(2026, 2, 7, 23);
    const last = new Date(2026, 2, 9, 1);
    expect(dayOrdinal(last) - dayOrdinal(first)).toBe(2);
    const range = noteRange(note(first.toISOString(), last.toISOString()));
    expect(range.status === "dated" && range.duration).toBe(3);
  });
  it("renders start-only and due-only notes as one-day milestones", () => {
    const window = timelineWindow(new Date(2026, 9, 9), "month");
    expect(timelineBar(note(null, "2026-10-09"), window)).toMatchObject({ offset: 8, span: 1, duration: 1 });
    expect(timelineBar(note("2026-10-09", null), window)).toMatchObject({ offset: 8, span: 1, duration: 1 });
  });
  it("clips overlapping ranges at both edges but retains full duration", () => {
    const window = timelineWindow(new Date(2026, 9, 9), "month");
    expect(timelineBar(note("2026-09-28", "2026-11-03"), window)).toMatchObject({ offset: 0, span: 31, duration: 37, clippedStart: true, clippedEnd: true });
    expect(timelineBar(note("2026-10-29", "2026-11-03"), window)).toMatchObject({ offset: 28, span: 3, duration: 6, clippedEnd: true });
  });
  it("distinguishes invalid, reversed and undated records without fabricating ranges", () => {
    expect(noteRange(note(null, null)).status).toBe("undated");
    expect(noteRange(note("invalid", "2026-10-09")).status).toBe("invalid");
    expect(noteRange(note("2026-10-10", "2026-10-09")).status).toBe("invalid");
  });
  it("excludes offscreen/archived/deleted notes and never mutates a record", () => {
    const window = timelineWindow(new Date(2026, 9, 9), "month");
    const record = note("2026-10-08", dueAtForDay(new Date(2026, 9, 9)));
    const before = JSON.stringify(record);
    expect(timelineBar(note("2026-11-01", "2026-11-03"), window)).toBeNull();
    expect(timelineBar({ ...record, archived: true }, window)).toBeNull();
    expect(timelineBar({ ...record, deletedAt: record.createdAt }, window)).toBeNull();
    expect(timelineBar(record, window)).toMatchObject({ span: 2 });
    expect(JSON.stringify(record)).toBe(before);
  });
});
