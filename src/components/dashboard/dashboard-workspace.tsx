"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ClayButton } from "@/components/ui/clay-button";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { DASHBOARD_SECTIONS, dashboardSummary, recentBoards, type DashboardSection } from "@/features/dashboard/summary";
import type { Note } from "@/types/note";
import type { Board } from "@/types/board";

export interface DashboardWorkspaceProps {
  notes: readonly Note[];
  boards: readonly Board[];
  boardName: string;
  cloud: boolean;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  onOpenNote: (id: string) => void;
  onOpenBoard: (id: string) => void;
  onAddNote: () => void;
  canAddNote?: boolean;
}

const EMPTY: Record<DashboardSection, string> = {
  Today: "No open notes start or are due today.",
  Overdue: "No open notes are overdue.",
  Upcoming: "Nothing due in the next seven days.",
  "High Priority": "No open high-priority or urgent notes.",
  "Recently Edited": "Your edits will appear here.",
  "Completed Today": "No recorded completions today. Older notes without a completion date are not counted.",
  "Pinned Notes": "Pin a note to keep it close at hand.",
};

/** Small, live lists rather than charts or a second copy of the user's notes. */
export function DashboardWorkspace(props: DashboardWorkspaceProps) {
  const [now, setNow] = useState(() => new Date());
  const [expanded, setExpanded] = useState<DashboardSection[]>([]);
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const sections = useMemo(() => dashboardSummary(props.notes, now), [props.notes, now]);
  const boards = useMemo(() => recentBoards(props.boards).slice(0, 5), [props.boards]);

  return <main id="main-content" tabIndex={-1} aria-label="Dashboard" className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">{props.boardName} / Board summary</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your desk, at a glance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Open work, recent edits and the notes you pinned.</p>
      </div>
      <ClayButton size="sm" variant="primary" onClick={props.onAddNote} disabled={props.loading || Boolean(props.error) || props.canAddNote === false}><Plus size={15} aria-hidden="true" />Add note</ClayButton>
    </header>
    {props.loading ? <p role="status">Loading your dashboard...</p> : props.error ?
      <SurfacePanel role="alert" className="flex flex-wrap items-center gap-3 p-4">
        <p>{props.error.message}</p><ClayButton size="sm" onClick={props.onRetry}>Retry dashboard</ClayButton>
      </SurfacePanel> : <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {DASHBOARD_SECTIONS.map((name) => {
          const notes = sections[name];
          const showAll = expanded.includes(name);
          return <SurfacePanel as="section" key={name} aria-label={name} className={name === "Today" ? "p-4 xl:col-span-2" : "p-4"}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold">{name}</h2>
              <span className="text-xs tabular-nums text-muted-foreground" aria-label={`${notes.length} notes`}>{notes.length}</span>
            </div>
            {notes.length === 0 ? <p className="text-sm text-muted-foreground">{EMPTY[name]}</p> :
              <ul className="divide-y divide-border">{(showAll ? notes : notes.slice(0, 5)).map((note) => <li key={note.id}>
                <button type="button" aria-label={`Open ${note.title || "Untitled note"}`} onClick={() => props.onOpenNote(note.id)} className="flex w-full items-center justify-between gap-3 rounded-sm py-2 text-left text-sm hover:bg-surface-raised">
                  <span className="min-w-0 truncate">{note.title || "Untitled note"}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{note.completed ? "Completed" : note.priority === "urgent" ? "Urgent" : note.priority === "high" ? "High" : "Open"}</span>
                </button>
              </li>)}</ul>}
            {notes.length > 5 ? <button type="button" className="mt-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => setExpanded((current) => showAll ? current.filter((section) => section !== name) : [...current, name])}>
              {showAll ? `Show fewer in ${name}` : `Show all ${notes.length} in ${name}`}
            </button> : null}
          </SurfacePanel>;
        })}
        <SurfacePanel as="section" aria-label="Recent Boards" className="p-4">
          <h2 className="text-sm font-semibold">Recent Boards</h2>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">{props.cloud ? "Recently updated in this workspace" : "Local mode"}</p>
          {boards.length ? <ul>{boards.map((board) => <li key={board.id}><button type="button" onClick={() => props.onOpenBoard(board.id)} className="w-full rounded-sm py-2 text-left text-sm hover:bg-surface-raised">{board.name || "Untitled board"}</button></li>)}</ul> :
            <p className="text-sm text-muted-foreground">{props.cloud ? "No recent boards in this workspace." : "Your local board is open. Sign in to see recent boards."}</p>}
        </SurfacePanel>
      </div>}
  </main>;
}
