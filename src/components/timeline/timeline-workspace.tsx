"use client";

import { ChevronLeft, ChevronRight, GanttChart } from "lucide-react";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { ClayButton } from "@/components/ui/clay-button";
import { IconButton } from "@/components/ui/icon-button";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { hasActiveFilters } from "@/features/board/filter-notes";
import { visibleNotes } from "@/features/board/visible-notes";
import { dayKey } from "@/features/calendar/month";
import { noteRange, shiftPeriod, timelineBar, timelineWindow, type TimelineScope } from "@/features/timeline/range";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { useLaneStore } from "@/stores/lane-store";
import { useNoteStore } from "@/stores/note-store";
import { useSettingsStore } from "@/stores/settings-store";

export interface TimelineWorkspaceProps {
  anchor: Date;
  scope: TimelineScope;
  onChangeAnchor: (anchor: Date) => void;
  onChangeScope: (scope: TimelineScope) => void;
  today?: Date;
}
export function TimelineWorkspace({ anchor, scope, onChangeAnchor, onChangeScope, today = new Date() }: TimelineWorkspaceProps) {
  const notes = useNoteStore((state) => state.notes);
  const openNote = useNoteStore((state) => state.expandNote);
  const lanes = useLaneStore((state) => state.lanes);
  const filters = useSettingsStore((state) => state.boardFilters);
  const showCompleted = useSettingsStore((state) => state.boardShowCompleted);
  const sort = useSettingsStore((state) => state.boardSort);
  const clearFilters = useSettingsStore((state) => state.clearBoardFilters);
  const { categories } = useTaxonomyContext();
  const window = useMemo(() => timelineWindow(anchor, scope), [anchor, scope]);
  const visible = useMemo(() => visibleNotes(notes, filters, showCompleted, sort), [notes, filters, showCompleted, sort]);
  const bars = useMemo(() => visible.flatMap((note) => { const bar = timelineBar(note, window); return bar ? [{ note, bar }] : []; }), [visible, window]);
  const attention = visible.filter((note) => noteRange(note).status === "invalid");
  const unscheduled = visible.filter((note) => noteRange(note).status === "undated");
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const lanesById = useMemo(() => new Map(lanes.map((lane) => [lane.id, lane])), [lanes]);
  const surface = useRef<HTMLElement>(null);
  useEffect(() => {
    // Bring today's column into view so a long range does not open on the past.
    const column = surface.current?.querySelector<HTMLElement>('[data-today="true"]');
    column?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [window]);
  const overdue = bars.filter(({ note }) => !note.completed && note.dueAt && new Date(note.dueAt).getTime() < today.getTime()).length;
  const columnsStyle = { "--timeline-days": window.days.length } as CSSProperties;

  return <main ref={surface} id="main-content" tabIndex={-1} aria-label="Timeline" data-testid="timeline-workspace"
    className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 min-w-0 flex-1 overflow-auto p-2 sm:p-4">
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <GanttChart size={18} aria-hidden="true" />
      <h2 className="mr-auto text-base font-semibold" aria-live="polite">{window.label}</h2>
      <div role="group" aria-label="Timeline scope" className="flex gap-1">
        {(["week", "month", "quarter"] as const).map((value) => <ClayButton key={value} size="sm" variant="ghost"
          selected={scope === value} onClick={() => onChangeScope(value)}>{value.charAt(0).toUpperCase() + value.slice(1)}</ClayButton>)}
      </div>
      <IconButton label="Previous period" icon={<ChevronLeft size={16} />} onClick={() => onChangeAnchor(shiftPeriod(anchor, scope, -1))} />
      <ClayButton size="sm" variant="ghost" onClick={() => onChangeAnchor(today)}>Today</ClayButton>
      <IconButton label="Next period" icon={<ChevronRight size={16} />} onClick={() => onChangeAnchor(shiftPeriod(anchor, scope, 1))} />
    </div>
    <p className="mb-2 text-xs tabular-nums text-muted-foreground" data-testid="timeline-summary">{bars.length} {bars.length === 1 ? "task" : "tasks"} in view{overdue ? ` · ${overdue} overdue` : ""}{unscheduled.length ? ` · ${unscheduled.length} unscheduled` : ""}</p>
    <p className="mb-2 text-xs text-muted-foreground">Scroll horizontally to explore dates. Open a task to edit its start and due dates.</p>
    {bars.length === 0 ? <div role="status" className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
      <span>No tasks overlap this period.</span>
      {hasActiveFilters(filters) ? <ClayButton size="sm" onClick={clearFilters}>Clear filters</ClayButton> : null}
    </div> : null}
    <div className="tk-timeline" style={columnsStyle} role="table" aria-label="Task date ranges">
      <div role="row" className="tk-timeline-row tk-timeline-header">
        <div role="columnheader" className="tk-timeline-label">Task / column</div>
        <div className="tk-timeline-track">
          {window.days.map((day) => <div role="columnheader" key={dayKey(day)} className="tk-timeline-date"
            data-today={dayKey(day) === dayKey(today) || undefined} title={dayKey(day)}>
            <span>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(day)}</span><span>{day.getDate()}</span>
          </div>)}
        </div>
      </div>
      {bars.map(({ note, bar }) => {
        const category = note.categoryId ? categoriesById.get(note.categoryId) : undefined;
        return <div role="row" key={note.id} data-note-id={note.id} className="tk-timeline-row">
          <div role="cell" className="tk-timeline-label">
            <button type="button" className="w-full truncate text-left text-sm font-medium" onClick={() => openNote(note.id)}>{note.title || "Untitled note"}</button>
            <span className="truncate text-xs text-muted-foreground">{lanesById.get(note.laneId)?.name ?? "No column"}</span>
          </div>
          <div role="cell" aria-colspan={window.days.length} className="tk-timeline-track tk-timeline-lane">
            <button type="button" aria-label={`Open ${note.title || "Untitled note"}: ${bar.label}`}
              title={`${bar.label}${category ? `; ${category.name}` : ""}`} data-testid="timeline-bar"
              data-offset={bar.offset} data-span={bar.span} data-duration={bar.duration}
              data-clipped-start={bar.clippedStart || undefined} data-clipped-end={bar.clippedEnd || undefined}
              data-completed={note.completed || undefined} className="tk-timeline-bar" onClick={() => openNote(note.id)}
              style={{ gridColumn: `${bar.offset + 1} / span ${bar.span}`, "--timeline-accent": category?.color ?? "var(--info)" } as CSSProperties}>
              {bar.clippedStart ? <span aria-hidden="true">&lsaquo;</span> : null}
              <span className="min-w-0 flex-1 truncate">{note.title || "Untitled note"}</span>
              <PriorityBadge priority={note.priority} />
              <span className="sr-only">{category ? `Category: ${category.name}. ` : ""}{note.completed ? "Completed." : ""}</span>
              {bar.clippedEnd ? <span aria-hidden="true">&rsaquo;</span> : null}
            </button>
          </div>
        </div>;
      })}
    </div>
    {[{ title: "Date ranges need attention", records: attention }, { title: "Unscheduled notes", records: unscheduled }].map((section) => section.records.length ?
      <section key={section.title} aria-label={section.title} className="mt-4">
        <h3 className="mb-1 text-sm font-semibold">{section.title} ({section.records.length})</h3>
        <p className="mb-2 text-xs text-muted-foreground">{section.title === "Unscheduled notes" ? "Open a note and add a start or due date to schedule it." : "A date is invalid or the due date precedes the start date. Open the note to correct it."}</p>
        <ul className="flex flex-wrap gap-2">{section.records.map((note) => <li key={note.id}><ClayButton size="sm" variant="ghost" onClick={() => openNote(note.id)}>{note.title || "Untitled note"}</ClayButton></li>)}</ul>
      </section> : null)}
  </main>;
}
