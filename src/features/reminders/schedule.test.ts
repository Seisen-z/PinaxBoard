import { describe, expect, it } from "vitest";
import { dueReminders, fromLocalDateTime, localDateTime, nextOccurrence, occurrenceId, parseRepeatRule, recurringSuccessor, repeatRule } from "./schedule";
import { createBlankNote } from "@/features/notes/create-note";
import { noteFromRow, noteToInsert } from "@/lib/mappers/note";
import { useNoteStore } from "@/stores/note-store";

const due = new Date(2026, 0, 31, 15, 30).toISOString();
const base = () => ({ ...createBlankNote({ boardId: "board", ownerId: "owner", laneId: "lane" }), id: "parent", dueAt: due });

describe("calendar recurrence", () => {
  it.each([["daily", 1], ["weekly", 7]] as const)("advances %s by local civil days", (frequency, days) => {
    const next = nextOccurrence(due, repeatRule(frequency, due)!)!;
    expect(next.getHours()).toBe(15);
    expect(next.getTime()).toBe(new Date(2026, 1, days, 15, 30).getTime());
  });
  it("clamps Jan 31 to February and restores March 31 without drift", () => {
    const rule = repeatRule("monthly", due)!;
    const feb = nextOccurrence(due, rule)!;
    expect(feb.getDate()).toBe(28);
    expect(nextOccurrence(feb.toISOString(), rule)?.getDate()).toBe(31);
    const eastern = { frequency: "daily" as const, anchorDay: 7, anchorMonth: 2, timeZone: "America/New_York", anchorTime: "02:30:00.000" };
    const gap = nextOccurrence("2026-03-07T07:30:00.000Z", eastern)!;
    expect(gap.toISOString()).toBe("2026-03-08T07:30:00.000Z");
    expect(nextOccurrence(gap.toISOString(), eastern)?.toISOString()).toBe("2026-03-09T06:30:00.000Z");
  });
  it("keeps the leap-day anchor for yearly repeats", () => {
    const leap = new Date(2024, 1, 29, 8).toISOString();
    const rule = repeatRule("yearly", leap)!;
    let current = leap;
    for (let year = 2025; year <= 2028; year++) {
      const next = nextOccurrence(current, rule)!;
      expect(next.getDate()).toBe(year === 2028 ? 29 : 28);
      current = next.toISOString();
    }
  });
  it("rejects invalid dates, malformed rules and unknown frequencies", () => {
    expect(parseRepeatRule({ frequency: "custom", anchorDay: 31, anchorMonth: 0 })).toBeNull();
    expect(parseRepeatRule({ frequency: "daily", anchorDay: 0, anchorMonth: 0 })).toBeNull();
    expect(nextOccurrence("invalid", repeatRule("daily", due)!)).toBeNull();
    expect(fromLocalDateTime("2026-02-30T08:00")).toBeNull();
    expect(fromLocalDateTime("2026-10-14T08:30")).toBeTruthy();
    expect(localDateTime(fromLocalDateTime("2026-10-14T08:30"))).toBe("2026-10-14T08:30");
  });
  it("uses stable UUID-shaped IDs per parent/scheduled occurrence", () => {
    expect(occurrenceId("parent", due)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(occurrenceId("parent", due)).toBe(occurrenceId("parent", due));
    expect(occurrenceId("other", due)).not.toBe(occurrenceId("parent", due));
  });
  it("creates one fresh successor with schedule, reminder offset and reset checklist", () => {
    const source = { ...base(), repeatRule: repeatRule("monthly", due), remindAt: new Date(new Date(due).getTime() - 3600000).toISOString(), startAt: new Date(2026, 0, 30, 9).toISOString(), subtasks: [{ id: "task", noteId: "parent", title: "Task", completed: true, position: 0 }] };
    const next = recurringSuccessor(source, due)!;
    expect(next.recurrenceSourceId).toBe("parent");
    expect(next.completed).toBe(false); expect(next.completedAt).toBeNull();
    expect(new Date(next.dueAt!).getTime() - new Date(next.remindAt!).getTime()).toBe(3600000);
    expect(next.subtasks[0]?.completed).toBe(false); expect(next.subtasks[0]?.noteId).toBe(next.id);
    expect(source.subtasks[0]?.completed).toBe(true);
    expect(new Date(next.startAt!).getHours()).toBe(9);
  });
  it("filters due reminders by completion, archive, deletion and actual time", () => {
    const now = new Date(due).getTime();
    const note = { ...base(), remindAt: due };
    expect(dueReminders([note, { ...note, completed: true }, { ...note, archived: true }, { ...note, deletedAt: due }, { ...note, remindAt: "invalid" }, { ...note, remindAt: new Date(now + 1).toISOString() }], now)).toEqual([note]);
  });
});

describe("persisted scheduling and atomic local completion", () => {
  it("omits new columns for legacy rows and round-trips real schedule fields", () => {
    expect(noteToInsert(base())).not.toHaveProperty("remind_at");
    const source = { ...base(), remindAt: due, repeatRule: repeatRule("weekly", due), recurrenceSourceId: "source" };
    const restored = noteFromRow(noteToInsert(source), { fallbackLaneId: "lane" });
    expect(restored.remindAt).toBe(due); expect(restored.repeatRule).toEqual(source.repeatRule); expect(restored.recurrenceSourceId).toBe("source");
  });
  it("completion creates one successor; reopening/recompleting or reload never duplicates it", () => {
    useNoteStore.getState().reset([{ ...base(), repeatRule: repeatRule("daily", due) }]);
    useNoteStore.getState().toggleComplete("parent");
    expect(useNoteStore.getState().notes).toHaveLength(2);
    const saved = JSON.parse(JSON.stringify(useNoteStore.getState().notes));
    useNoteStore.getState().reset(saved);
    useNoteStore.getState().toggleComplete("parent");
    useNoteStore.getState().toggleComplete("parent");
    expect(useNoteStore.getState().notes).toHaveLength(2);
    expect(useNoteStore.getState().notes[0]?.completedAt).toBeTruthy();
    const nextId = useNoteStore.getState().notes[1]!.id;
    useNoteStore.getState().deleteNote(nextId);
    useNoteStore.getState().toggleComplete("parent"); useNoteStore.getState().toggleComplete("parent");
    expect(useNoteStore.getState().notes).toHaveLength(2);
    expect(useNoteStore.getState().notes.filter((note)=>!note.deletedAt)).toHaveLength(1);
    expect(useNoteStore.getState().notes.find((note)=>note.id===nextId)?.deletedAt).toEqual(expect.any(String)); // Intentional deletion is not undone by recompletion.
  });
  it("schedule edits respect lock, require due dates and clear repeats with removed due dates", () => {
    useNoteStore.getState().reset([{ ...base(), dueAt: null }]);
    useNoteStore.getState().setRepeat("parent", "daily");
    expect(useNoteStore.getState().notes[0]?.repeatRule).toBeUndefined();
    useNoteStore.getState().setDueAt("parent", due);
    useNoteStore.getState().setRepeat("parent", "monthly");
    useNoteStore.getState().toggleLock("parent");
    useNoteStore.getState().setReminder("parent", due);
    expect(useNoteStore.getState().notes[0]?.remindAt).toBeUndefined();
    useNoteStore.getState().toggleLock("parent");
    useNoteStore.getState().setDueAt("parent", null);
    expect(useNoteStore.getState().notes[0]?.repeatRule).toBeNull();
  });
});
