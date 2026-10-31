"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { ClayButton } from "@/components/ui/clay-button";
import { IconButton } from "@/components/ui/icon-button";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { visibleNotes } from "@/features/board/visible-notes";
import { hasActiveFilters } from "@/features/board/filter-notes";
import { dayKey, monthDays, notesByDay, shiftMonth, startOfMonth } from "@/features/calendar/month";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";

export interface CalendarWorkspaceProps {
  month: Date;
  selectedDate: Date;
  onChangeMonth: (month: Date) => void;
  onSelectDate: (date: Date) => void;
  onAddNote: () => void;
  today?: Date;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const longDate = (date: Date) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);

export function CalendarWorkspace({ month, selectedDate, onChangeMonth, onSelectDate, onAddNote, today = new Date() }: CalendarWorkspaceProps) {
  const notes = useNoteStore((state) => state.notes);
  const openNote = useNoteStore((state) => state.expandNote);
  const filters = useSettingsStore((state) => state.boardFilters);
  const showCompleted = useSettingsStore((state) => state.boardShowCompleted);
  const sort = useSettingsStore((state) => state.boardSort);
  const clearFilters = useSettingsStore((state) => state.clearBoardFilters);
  const { categories } = useTaxonomyContext();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const days = useMemo(() => monthDays(month), [month]);
  const grouped = useMemo(() => notesByDay(visibleNotes(notes, filters, showCompleted, sort)), [notes, filters, showCompleted, sort]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month);
  const count = days.reduce((total, day) => total + (grouped.get(day.key)?.length ?? 0), 0);

  return (
    <main id="main-content" tabIndex={-1} aria-label="Calendar" data-testid="calendar-workspace"
      className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 min-w-0 flex-1 overflow-auto p-2 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CalendarDays size={18} aria-hidden="true" />
        <h2 className="mr-auto text-base font-semibold" aria-live="polite">{monthLabel}</h2>
        <IconButton label="Previous month" icon={<ChevronLeft size={16} />} onClick={() => onChangeMonth(shiftMonth(month, -1))} />
        <ClayButton size="sm" variant="ghost" onClick={() => { onChangeMonth(startOfMonth(today)); onSelectDate(today); }}>Today</ClayButton>
        <IconButton label="Next month" icon={<ChevronRight size={16} />} onClick={() => onChangeMonth(shiftMonth(month, 1))} />
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Select a day to place a new note. Open a note to edit its due date.</p>
      <p className="mb-2 text-xs text-muted-foreground sm:hidden">Scroll horizontally to see all seven days.</p>
      {count === 0 ? <div role="status" className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>No dated notes in this calendar range.</span>
        {hasActiveFilters(filters) ? <ClayButton size="sm" onClick={clearFilters}>Clear filters</ClayButton> : null}
        <ClayButton size="sm" onClick={onAddNote}>Add note on selected day</ClayButton>
      </div> : null}
      <div role="grid" aria-label={monthLabel} aria-colcount={7} aria-rowcount={7} className="tk-calendar-grid">
        <div role="row" className="tk-calendar-week">
          {WEEKDAYS.map((name) => <div key={name} role="columnheader" className="border-b border-border px-2 py-2 text-center text-xs font-medium text-muted-foreground">{name}</div>)}
        </div>
        {Array.from({ length: 6 }, (_, row) => <div role="row" key={row} className="tk-calendar-week">
          {days.slice(row * 7, row * 7 + 7).map((day) => {
            const dayNotes = grouped.get(day.key) ?? [];
            const expanded = expandedDay === day.key;
            const selected = day.key === dayKey(selectedDate);
            return <section role="gridcell" key={day.key} aria-label={longDate(day.date)} aria-selected={selected}
              data-date={day.key} data-outside-month={!day.inMonth || undefined} className="tk-calendar-day">
              <button type="button" aria-label={`Select ${longDate(day.date)}`} aria-pressed={selected}
                aria-current={day.key === dayKey(today) ? "date" : undefined}
                className="tk-calendar-date" onClick={() => onSelectDate(day.date)}>{day.date.getDate()}</button>
              <ul className="flex flex-col gap-1" aria-label={`Notes on ${longDate(day.date)}`}>
                {(expanded ? dayNotes : dayNotes.slice(0, 3)).map((note) => {
                  const category = note.categoryId ? categoriesById.get(note.categoryId) : undefined;
                  return <li key={note.id}>
                    <button type="button" onClick={() => openNote(note.id)} aria-label={`Open ${note.title || "Untitled note"}`}
                      data-note-id={note.id} data-completed={note.completed || undefined} className="tk-calendar-note"
                      style={{ "--calendar-note-accent": category?.color ?? "var(--info)" } as CSSProperties}>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">{note.title || "Untitled note"}</span>
                      <PriorityBadge priority={note.priority} />
                      {category ? <span className="sr-only">Category: {category.name}</span> : null}
                    </button>
                  </li>;
                })}
              </ul>
              {dayNotes.length > 3 ? <button type="button" className="mt-1 text-xs text-muted-foreground"
                aria-expanded={expanded} onClick={() => setExpandedDay(expanded ? null : day.key)}>
                {expanded ? "Show less" : `+${dayNotes.length - 3} more`}
              </button> : null}
            </section>;
          })}
        </div>)}
      </div>
    </main>
  );
}
