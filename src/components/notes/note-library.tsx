"use client";

import { useMemo, useState } from "react";
import { Inbox, Plus, Search, StickyNote } from "lucide-react";
import { ClayButton } from "@/components/ui/clay-button";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { VirtualList } from "@/components/ui/virtual-list";
import { libraryNotes } from "@/features/notes/note-library";
import { useCanEditBoard } from "@/features/collaboration/access";
import { useNoteStore } from "@/stores/note-store";
import { useLaneStore } from "@/stores/lane-store";
import type { Note } from "@/types/note";

const getKey = (note: Note) => note.id;

export function NoteLibrary({ mode, actorId, onCapture }: { mode: "inbox" | "mine" | "all"; actorId: string; onCapture: () => void }) {
  const notes = useNoteStore(state => state.notes), lanes = useLaneStore(state => state.lanes);
  const [search, setSearch] = useState("");
  const canEdit = useCanEditBoard();
  const [status, setStatus] = useState<"all" | "open" | "done">("all");
  const [order, setOrder] = useState<"recent" | "oldest" | "title">("recent");
  const base = useMemo(() => libraryNotes(notes, mode, actorId, search), [notes, mode, actorId, search]);
  const records = useMemo(() => {
    const filtered = base.filter((note) => status === "all" || (status === "done") === note.completed);
    const time = (note: Note) => new Date(note.updatedAt).getTime() || 0;
    return order === "recent" ? filtered : [...filtered].sort(order === "oldest" ? (a, b) => time(a) - time(b) : (a, b) => (a.title || "Untitled").localeCompare(b.title || "Untitled"));
  }, [base, status, order]);
  const inbox = mode === "inbox";
  const title=mode === "all" ? "All Notes" : "My Notes";
  const renderNote = (note: Note) => <article className="flex flex-wrap items-center gap-3 border-b border-border p-4" data-note-id={note.id}>
    <button type="button" onClick={() => useNoteStore.getState().expandNote(note.id)} className="min-w-0 flex-1 text-left">
      <h2 className="truncate text-sm font-medium">{note.title || "Untitled note"}</h2>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.excerpt || "An empty page, ready for a thought."}</p>
      <p className="mt-2 text-xs text-muted-foreground">{lanes.find(lane => lane.id === note.laneId)?.name ?? "Unassigned"}{note.onCanvas ? " · On Canvas" : ""}{note.completed ? " · Completed" : ""}</p>
    </button>
    {inbox && canEdit ? <label className="text-xs text-muted-foreground">Organize into
      <select aria-label={`Organize ${note.title || "Untitled note"} into column`} disabled={note.locked} value="" onChange={event => {
        const state = useNoteStore.getState(); state.setLane(note.id, event.target.value); state.setInbox(note.id, false);
      }} className="ml-2 min-h-10 max-w-44 rounded-md border border-border bg-surface p-2 text-foreground">
        <option value="" disabled>Choose column</option>{lanes.map(lane => <option key={lane.id} value={lane.id}>{lane.name}</option>)}
      </select>
    </label> : null}
  </article>;

  return <main id="main-content" tabIndex={-1} aria-label={inbox ? "Inbox" : title} className="tk-scrollbar-thin relative z-[var(--z-board)] min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{inbox ? "Capture / Organize" : "Your writing / One library"}</p>
        <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-tight">{inbox ? <Inbox size={24} aria-hidden="true" /> : <StickyNote size={24} aria-hidden="true" />}{inbox ? "A landing place for your thoughts" : title}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{inbox ? "Capture first. Choose a column when you are ready; organizing clears this queue, not the note." : mode === "all" ? "Every note on this board, from you and your collaborators. One library across every layout." : "Notes you created on this board, whether they live in a column, on the Canvas, or both."}</p>
      </div><ClayButton size="sm" variant="primary" disabled={!canEdit} onClick={onCapture}><Plus size={15} aria-hidden="true" />{inbox ? "Quick capture" : "New note"}</ClayButton>
    </header>
    <SurfacePanel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <label className="flex min-w-0 items-center gap-2 text-sm"><Search size={16} aria-hidden="true" /><input aria-label={inbox ? "Search inbox" : mode === "all" ? "Search all notes" : "Search my notes"} value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a thought…" className="w-full min-w-0 bg-transparent outline-none" /></label>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status">
          {([["all", "All"], ["open", "Open"], ["done", "Done"]] as const).map(([value, label]) => <ClayButton key={value} size="sm" variant="ghost" selected={status === value} onClick={() => setStatus(value)}>{label}</ClayButton>)}
          <select aria-label="Sort notes" value={order} onChange={event => setOrder(event.target.value as typeof order)} className="min-h-9 rounded-md border border-border bg-surface px-2 text-xs">
            <option value="recent">Default order</option><option value="oldest">Least recently edited</option><option value="title">Title A–Z</option>
          </select>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{records.length} {inbox ? "to organize" : records.length === 1 ? "note" : "notes"}</span>
      </div>
      {records.length ? records.length > 100 ? <VirtualList items={records} getKey={getKey} renderItem={renderNote} /> : records.map(note => <div key={note.id}>{renderNote(note)}</div>) :
        <div className="px-6 py-14"><h2 className="text-lg font-medium">{search ? "No matching notes" : inbox ? "A clear inbox" : "Your next idea starts here"}</h2><p className="mt-2 text-sm text-muted-foreground">{search ? "Try another word." : inbox ? "Quick captures wait here until you organize them. They also appear on your Board." : "Create a note here, on the Board, or on the Canvas. It stays the same note everywhere."}</p></div>}
    </SurfacePanel>
  </main>;
}
