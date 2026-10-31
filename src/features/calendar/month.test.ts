import { describe, expect, it } from "vitest";
import { dayKey, dueAtForDay, monthDays, notesByDay, parseDate, shiftMonth } from "@/features/calendar/month";
import { MOCK_NOTES } from "@/features/board/mock-board";

describe("calendar dates", () => {
  it("makes six complete Sunday-first weeks with unique local keys", () => {
    const days = monthDays(new Date(2026, 9, 31));
    expect(days).toHaveLength(42);
    expect(days[0]!.date.getDay()).toBe(0);
    expect(days[41]!.date.getDay()).toBe(6);
    expect(new Set(days.map((day) => day.key)).size).toBe(42);
    expect(days.filter((day) => day.inMonth)).toHaveLength(31);
  });
  it("handles leap February and year rollover without day-of-month overflow", () => {
    expect(monthDays(new Date(2024, 1, 1)).filter((day) => day.inMonth)).toHaveLength(29);
    expect(dayKey(shiftMonth(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
    expect(dayKey(shiftMonth(new Date(2026, 0, 31), -1))).toBe("2025-12-01");
  });
  it("treats date-only strings as local days and rejects invalid dates", () => {
    expect(dayKey(parseDate("2026-10-09")!)).toBe("2026-10-09");
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("invalid")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
  it("creates end-of-local-day timestamps that return to the same date", () => {
    const date = new Date(2026, 9, 9, 12);
    const parsed = new Date(dueAtForDay(date));
    expect(dayKey(parsed)).toBe(dayKey(date));
    expect(parsed.getHours()).toBe(23);
    expect(parsed.getMinutes()).toBe(59);
  });
  it("groups original records, ignoring undated, invalid, archived and deleted notes", () => {
    const base = MOCK_NOTES[0]!;
    const live = { ...base, id: "live", dueAt: dueAtForDay(new Date(2026, 9, 9)) };
    const notes = [live, { ...live, id: "null", dueAt: null }, { ...live, id: "bad", dueAt: "invalid" },
      { ...live, id: "archived", archived: true }, { ...live, id: "deleted", deletedAt: live.createdAt }];
    const before = JSON.stringify(notes);
    const grouped = notesByDay(notes);
    expect(grouped.size).toBe(1);
    expect(grouped.get("2026-10-09")).toEqual([live]);
    expect(grouped.get("2026-10-09")![0]).toBe(live);
    expect(JSON.stringify(notes)).toBe(before);
  });
});
