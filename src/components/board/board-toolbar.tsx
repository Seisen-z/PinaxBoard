"use client";

import { Plus } from "lucide-react";

import { BoardControls } from "@/components/board/board-controls";
import { BoardFilterMenu } from "@/components/board/board-filter-menu";
import { ViewSwitcher } from "@/components/board/view-switcher";
import { ZoomControls } from "@/components/board/zoom-controls";
import { CanvasControls } from "@/components/canvas/canvas-controls";
import { NewNoteMenu } from "@/components/notes/new-note-menu";
import { ClayButton } from "@/components/ui/clay-button";
import { Separator } from "@/components/ui/separator";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { type BoardViewId } from "@/config/layouts";
import { cn } from "@/lib/utils";

/** Surfaces where a note is simply added to the first column. */
const TEMPLATE_VIEWS: readonly BoardViewId[] = ["board", "grid", "list"];

export interface BoardToolbarProps {
  activeView: BoardViewId;
  canAddNote?: boolean;
  showViewSwitcher?: boolean;
  onSelectView: (view: BoardViewId) => void;
  /** Notes visible on the active surface, for the count readout. */
  noteCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  /** Creates a blank note on the active surface. */
  onAddNote: () => void;
  /** Creates a note prefilled from a template. Board, Grid and List only. */
  onAddNoteFromTemplate?: (templateId: string) => void;
  /** Frames every canvas note in the viewport. Canvas only. */
  onFitToContent: () => void;
  /** Creates a blank note at the centre of the canvas view. Canvas only. */
  onAddCanvasNote: () => void;
}

/**
 * The toolbar between the breadcrumb bar and the surface.
 *
 * This is where the two floating clusters went. They were there because
 * FRONTEND_SPEC.md §43 wanted the board edge-to-edge; with the sidebar in
 * place the app already has fixed chrome, and a toolbar beats two clusters
 * hovering over the content they control — not least because they no longer
 * cover the bottom of a column.
 *
 * The right half changes with the surface: the Board gets sort/density and
 * filtering, the Canvas gets grid, snap and fit. Neither shows the other's
 * controls (IMPLEMENTATION_PLAN.md §10).
 */
export function BoardToolbar({
  activeView,
  canAddNote = true,
  showViewSwitcher = true,
  onSelectView,
  noteCount,
  zoom,
  onZoomChange,
  onResetZoom,
  onAddNote,
  onAddNoteFromTemplate,
  onFitToContent,
  onAddCanvasNote,
}: BoardToolbarProps) {
  const isCanvas = activeView === "canvas";

  return (
    <SurfacePanel
      tone="base"
      radius="none"
      border="soft"
      className={cn(
        "z-[var(--z-header)] shrink-0 border-x-0 border-t-0",
        "flex flex-wrap items-center gap-2 px-4 py-2",
      )}
      style={{ minHeight: "var(--toolbar-height)" }}
      data-guide="toolbar"
    >
      {showViewSwitcher ? <ViewSwitcher activeView={activeView} onSelectView={onSelectView} /> : <span className="text-sm font-medium capitalize">{activeView} tools</span>}

      <Separator orientation="vertical" className="mx-1 h-5" />

      {isCanvas ? (
        <CanvasControls
          onFitToContent={onFitToContent}
          onAddNote={onAddCanvasNote}
        />
      ) : (
        <>
          <BoardFilterMenu />
          <BoardControls />
        </>
      )}

      <div className="ml-auto flex items-center gap-2" data-guide="new-note">
        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {noteCount} {noteCount === 1 ? "note" : "notes"}
        </span>

        {activeView === "board" || isCanvas ? <ZoomControls
          zoom={zoom}
          onZoomChange={onZoomChange}
          onResetZoom={onResetZoom}
        /> : null}

        {onAddNoteFromTemplate && TEMPLATE_VIEWS.includes(activeView) ? (
          <NewNoteMenu disabled={!canAddNote} onBlank={onAddNote} onTemplate={onAddNoteFromTemplate} />
        ) : (
          <ClayButton variant="primary" size="sm" disabled={!canAddNote} onClick={onAddNote}>
            <Plus size={15} aria-hidden="true" />
            New note
          </ClayButton>
        )}
      </div>
    </SurfacePanel>
  );
}
