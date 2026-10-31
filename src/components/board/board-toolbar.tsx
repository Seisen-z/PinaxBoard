"use client";

import { ChevronDown, Plus } from "lucide-react";

import { BoardControls } from "@/components/board/board-controls";
import { BoardFilterMenu } from "@/components/board/board-filter-menu";
import { ViewSwitcher } from "@/components/board/view-switcher";
import { ZoomControls } from "@/components/board/zoom-controls";
import { CanvasControls } from "@/components/canvas/canvas-controls";
import { ClayButton } from "@/components/ui/clay-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { type BoardViewId } from "@/config/layouts";
import { NOTE_TEMPLATES } from "@/features/notes/templates";
import { cn } from "@/lib/utils";

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
  /** Creates a note prefilled from a template. Hidden on the Canvas. */
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

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {noteCount} {noteCount === 1 ? "note" : "notes"}
        </span>

        {activeView === "board" || isCanvas ? <ZoomControls
          zoom={zoom}
          onZoomChange={onZoomChange}
          onResetZoom={onResetZoom}
        /> : null}

        <div className="flex items-center gap-1">
          <ClayButton variant="primary" size="sm" disabled={!canAddNote} onClick={onAddNote}>
            <Plus size={15} aria-hidden="true" />
            New note
          </ClayButton>
          {onAddNoteFromTemplate && !isCanvas ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ClayButton variant="secondary" size="sm" disabled={!canAddNote} aria-label="New note from a template">
                  <ChevronDown size={15} aria-hidden="true" />
                </ClayButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>New note from a template</DropdownMenuLabel>
                {NOTE_TEMPLATES.map((template) => (
                  <DropdownMenuItem key={template.id} onSelect={() => onAddNoteFromTemplate(template.id)}>
                    <span className="flex flex-col">
                      <span className="font-medium">{template.label}</span>
                      <span className="text-xs text-muted-foreground">{template.description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </SurfacePanel>
  );
}
