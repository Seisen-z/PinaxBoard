"use client";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { productivityMetrics } from "@/features/analytics/metrics";
import { fetchBoardContents } from "@/features/notes/repository";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import type { Note } from "@/types/note";
import type { Board } from "@/types/board";
export function AnalyticsWorkspace({ notes, boards = [], cloud = false, ownerId = null }: { notes: readonly Note[]; boards?: readonly Board[]; cloud?: boolean; ownerId?: string | null }) {
  const taxonomy = useTaxonomyContext();
  const query = useQuery({ queryKey: ["analytics", ownerId, boards.map((board) => board.id).join(":")], enabled: cloud && boards.length > 0, staleTime: 30000,
    queryFn: async () => { const rows: Note[] = []; for (const board of boards) rows.push(...(await fetchBoardContents(board.id)).notes); return rows; } });
  const metrics = useMemo(() => { const currentIds = new Set(notes.map((note) => note.boardId)); const all = cloud ? [...(query.data ?? []).filter((note) => !currentIds.has(note.boardId)), ...notes] : notes; return productivityMetrics(all, new Date(), taxonomy.categories); }, [notes, cloud, query.data, taxonomy.categories]);
  const values = [["Completed today", metrics.completedToday], ["Completed this week", metrics.completedWeek], ["Completed this month", metrics.completedMonth], ["Current streak", `${metrics.currentStreak} days`], ["Active notes", metrics.activeNotes], ["Active boards", metrics.activeBoards], ["Most active category", metrics.mostActiveCategory ?? "No completed category activity"]] as const;
  const max = Math.max(1, ...metrics.days.map((day) => day.count));
  return <main id="main-content" tabIndex={-1} aria-label="Analytics" className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><header><h1 className="text-xl font-semibold">Analytics</h1><p className="mt-1 text-sm text-muted-foreground">{cloud ? "Current workspace" : "Local board"} · real completion timestamps, not last-edited dates.</p></header>
    {query.isLoading && cloud ? <p role="status">Loading workspace metrics?</p> : null}
    {query.error ? <p role="alert">Workspace metrics are incomplete. <button className="underline" onClick={() => void query.refetch()}>Retry analytics</button></p> : null}
    <section aria-label="Productivity metrics" className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{values.map(([label, value]) => <article key={label} className="rounded-[var(--radius-md)] border border-border bg-surface-raised p-4"><p className="text-2xl font-semibold tabular-nums">{value}</p><h2 className="mt-1 text-sm text-muted-foreground">{label}</h2></article>)}</section>
    <section className="mt-6 rounded-[var(--radius-md)] border border-border bg-surface-raised p-4" aria-label="Completions over the last 14 days"><h2 className="font-medium">Last 14 days</h2><ol className="mt-4 space-y-2">{metrics.days.map((day) => <li key={day.date} className="flex items-center gap-3 text-sm"><time className="w-24 shrink-0" dateTime={day.date}>{day.date.slice(5)}</time><div aria-hidden="true" className="h-2 rounded bg-primary" style={{ width: `${Math.max(day.count ? 1 : 0, day.count / max * 70)}%` }} /><span>{day.count} completed</span></li>)}</ol></section>
  </main>;
}
