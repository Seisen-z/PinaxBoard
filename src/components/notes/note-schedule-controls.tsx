"use client";
import { localDateTime, fromLocalDateTime, nextOccurrence, parseRepeatRule, type RepeatFrequency } from "@/features/reminders/schedule";
import { useScheduleSupport } from "@/features/reminders/use-schedule-support";
import { useNoteStore } from "@/stores/note-store";
import type { Note } from "@/types/note";

export function NoteScheduleControls({ note, ownerId }: { note: Note; ownerId: string | null }) {
  const support = useScheduleSupport(ownerId);
  const setReminder = useNoteStore((state) => state.setReminder);
  const setRepeat = useNoteStore((state) => state.setRepeat);
  const disabled = note.locked || !support.ready;
  const rule = parseRepeatRule(note.repeatRule);
  const next = rule && note.dueAt ? nextOccurrence(note.dueAt, rule) : null;
  const inputClass = "rounded-[var(--radius-sm)] border border-current/20 bg-transparent px-2 py-1";
  return <fieldset aria-label="Reminders and repeat" className="flex flex-col gap-2 text-sm">
    <legend className="mb-2 font-medium">Reminders and repeat</legend>
    {support.loading ? <p role="status">Checking cloud scheduling...</p> : null}
    {support.error ? <p role="alert">{support.error.message} <button type="button" onClick={support.retry}>Retry scheduling</button></p> : null}
    <label className="flex flex-wrap items-center gap-2">Remind me
      <input type="datetime-local" aria-label="Reminder time" className={inputClass} disabled={disabled}
        value={localDateTime(note.remindAt)} onChange={(event) => {
          const value = event.target.value;
          if (!value) setReminder(note.id, null);
          else { const date = fromLocalDateTime(value); if (date) setReminder(note.id, date); }
        }} />
    </label>
    {note.remindAt ? <button type="button" disabled={disabled} className="self-start text-xs" onClick={() => setReminder(note.id, null)}>Remove reminder</button> : null}
    <label className="flex flex-wrap items-center gap-2">Repeat
      <select aria-label="Repeat rule" className={inputClass} disabled={disabled} value={rule?.frequency ?? "none"}
        onChange={(event) => setRepeat(note.id, event.target.value === "none" ? null : event.target.value as RepeatFrequency)}>
        <option value="none">Does not repeat</option>
        {["daily", "weekly", "monthly", "yearly"].map((frequency) => <option key={frequency} value={frequency} disabled={!note.dueAt}>{frequency[0]!.toUpperCase() + frequency.slice(1)}</option>)}
      </select>
    </label>
    <p className="text-xs text-current/60">{!note.dueAt ? "Set a due date to enable repeat." : rule?.nextId ? "The next occurrence has already been created." : next ? `Completing this note creates one next occurrence: ${next.toLocaleString()}.` : "Repeat creates the next note when you complete this one."}</p>
    <p className="text-xs text-current/60">Reminders are checked while Pinax Board is open. Browser alerts require your permission; in-app reminders remain available.</p>
  </fieldset>;
}
