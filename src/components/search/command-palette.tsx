"use client";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";

import { Columns3, FileText, Layers, Search } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";

import { useActiveWorkspace } from "@/features/workspaces/use-active-workspace";
import { useTaxonomyContext } from "@/features/taxonomy/context";
import { search, type SearchResult } from "@/features/search/search";
import { useNoteStore } from "@/stores/note-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { cn } from "@/lib/utils";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The signed-in user's id, or `null`. */
  ownerId?: string | null;
}

/**
 * Search across the workspace (IMPLEMENTATION_PLAN.md §18).
 *
 * Searches in memory, on every keystroke, over data the client already holds —
 * see `features/search/search.ts`. That is what keeps it responsive: there is
 * no request to debounce, no loading state to flash, and no stale result to
 * arrive after the user has typed three more characters.
 *
 * Picking a result navigates to it: a note opens in the full-screen editor, a
 * board or workspace is made active. A result that only highlighted something
 * would leave the user to find it themselves.
 */
export function CommandPalette({
  open,
  onOpenChange,
  ownerId = null,
}: CommandPaletteProps) {
  const focusReturn = useDialogFocusReturn();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const notes = useNoteStore((state) => state.notes);
  const expandNote = useNoteStore((state) => state.expandNote);

  const { tags, categories } = useTaxonomyContext();
  const { workspaces, boards } = useActiveWorkspace(Boolean(ownerId));

  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const setActiveBoard = useWorkspaceStore((state) => state.setActiveBoard);

  const results = useMemo(
    () => search(query, { notes, tags, categories, boards, workspaces }),
    [boards, categories, notes, query, tags, workspaces],
  );

  // Scroll the highlighted row into view when the arrow keys move past the
  // visible window.
  useEffect(() => {
    const active = listRef.current?.children[activeIndex];
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function choose(result: SearchResult) {
    if (result.kind === "note") expandNote(result.id);
    if (result.kind === "board") setActiveBoard(result.id);
    if (result.kind === "workspace") setActiveWorkspace(result.id);

    onOpenChange(false);
    setQuery("");
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Cleared on close so reopening starts fresh rather than showing the
        // last search's results for a frame.
        if (!next) setQuery("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-surface-sunken/70" />

        <Dialog.Content {...focusReturn}
          data-testid="command-palette"
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-[12vh] z-[var(--z-overlay)] w-[min(40rem,calc(100vw-2rem))]",
            "-translate-x-1/2 overflow-hidden rounded-[var(--radius-lg)]",
            "border border-border bg-surface shadow-panel-md",
          )}
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>

          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                // A new query means a new list, so the highlight goes back to
                // the top. Done here rather than in an effect on `query`:
                // typing is the only thing that changes it, and an effect
                // would be a second render to undo the first one's state.
                setActiveIndex(0);
              }}
              placeholder="Search notes, tags, boards…"
              aria-label="Search"
              // The list never takes focus — the caret stays here — so the
              // input owns the keyboard and announces the active row.
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="command-palette-results"
              aria-activedescendant={
                results[activeIndex] ? `result-${results[activeIndex].id}` : undefined
              }
              onKeyDown={(event) => {
                if (results.length === 0) return;

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((index) => (index + 1) % results.length);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex(
                    (index) => (index - 1 + results.length) % results.length,
                  );
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  const result = results[activeIndex];
                  if (result) choose(result);
                }
              }}
              className="h-12 w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {query && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for “{query}”
            </p>
          ) : null}

          {!query ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Search titles, note text, tags, categories, boards and workspaces.
            </p>
          ) : null}

          <ul
            ref={listRef}
            id="command-palette-results"
            role="listbox"
            aria-label="Search results"
            className="tk-scrollbar-thin max-h-80 overflow-y-auto p-1"
          >
            {results.map((result, index) => {
              const isActive = index === activeIndex;

              return (
                <li key={`${result.kind}-${result.id}`}>
                  <button
                    type="button"
                    id={`result-${result.id}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(result)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left",
                      isActive ? "bg-surface-raised" : "",
                    )}
                  >
                    <ResultGlyph kind={result.kind} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {result.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A glyph per result kind, so the three are distinguishable at a glance. */
function ResultGlyph({ kind }: { kind: SearchResult["kind"] }) {
  const className = "shrink-0 text-muted-foreground";

  if (kind === "board") return <Columns3 size={15} aria-hidden="true" className={className} />;
  if (kind === "workspace") return <Layers size={15} aria-hidden="true" className={className} />;

  return <FileText size={15} aria-hidden="true" className={className} />;
}
