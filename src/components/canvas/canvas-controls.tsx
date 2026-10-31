"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import {
  Check,
  Grid2x2,
  Grid2x2Check,
  Magnet,
  Maximize,
  Plus,
  Ruler,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";

import { IconButton } from "@/components/ui/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DROPDOWN_MENU_PRIMITIVES,
  type MenuPrimitives,
} from "@/components/ui/menu-primitives";
import { useCanvasStore, type GridMode } from "@/stores/canvas-store";

const NEXT_GRID_MODE: Record<GridMode, GridMode> = {
  off: "dot",
  dot: "line",
  line: "off",
};

const GRID_LABELS: Record<GridMode, string> = {
  off: "off",
  dot: "dots",
  line: "lines",
};

/** Grid spacings offered in the settings menu, in canvas units. */
const GRID_SIZES = [8, 16, 24, 32, 48] as const;

export interface CanvasControlsProps {
  /** Frames every note in the viewport. */
  onFitToContent: () => void;
  /** Creates a blank note at the centre of the current view. */
  onAddNote: () => void;
}

/**
 * Canvas-only controls (IMPLEMENTATION_PLAN.md §10).
 *
 * A different set from {@link BoardControls}, because the two surfaces answer
 * different questions: the canvas cares about grid, snap and where the
 * viewport is; the column Board cares about sorting and density. Neither
 * surface shows the other's settings.
 */
export function CanvasControls({ onFitToContent, onAddNote }: CanvasControlsProps) {
  const canEdit=useCanEditBoard();
  const gridMode = useCanvasStore((state) => state.gridMode);
  const setGridMode = useCanvasStore((state) => state.setGridMode);
  const snap = useCanvasStore((state) => state.snapToGrid);
  const setSnap = useCanvasStore((state) => state.setSnapToGrid);

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Canvas">
      <IconButton
        disabled={!canEdit} label="Add note to canvas"
        icon={<Plus size={16} />}
        variant="ghost"
        size="sm"
        onClick={onAddNote}
      />

      <IconButton
        label={`Grid: ${GRID_LABELS[gridMode]}. Switch to ${GRID_LABELS[NEXT_GRID_MODE[gridMode]]}`}
        icon={gridMode === "off" ? <Grid2x2 size={16} /> : <Grid2x2Check size={16} />}
        variant="ghost"
        size="sm"
        selected={gridMode !== "off"}
        onClick={() => setGridMode(NEXT_GRID_MODE[gridMode])}
      />

      <IconButton
        label={snap ? "Snap to grid: on" : "Snap to grid: off"}
        icon={<Magnet size={16} />}
        variant="ghost"
        size="sm"
        selected={snap}
        onClick={() => setSnap(!snap)}
      />

      <IconButton
        label="Fit to content"
        icon={<Maximize size={16} />}
        variant="ghost"
        size="sm"
        onClick={onFitToContent}
      />

      <CanvasSettingsMenu onFitToContent={onFitToContent}>
        <IconButton
          label="Canvas settings"
          icon={<Settings2 size={16} />}
          variant="ghost"
          size="sm"
        />
      </CanvasSettingsMenu>
    </div>
  );
}

export interface CanvasSettingsMenuProps {
  onFitToContent: () => void;
  children: ReactNode;
}

/** The canvas settings menu, without its surrounding cluster. */
export function CanvasSettingsMenu({
  onFitToContent,
  children,
}: CanvasSettingsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-52">
        <CanvasSettingsItems ui={DROPDOWN_MENU_PRIMITIVES} onFitToContent={onFitToContent} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface CanvasSettingsItemsProps {
  /** The menu family to render with — dropdown or context. */
  ui: MenuPrimitives;
  onFitToContent: () => void;
}

/** The settings rows, so a right-click menu reuses them rather than copying. */
export function CanvasSettingsItems({
  ui,
  onFitToContent,
}: CanvasSettingsItemsProps) {
  const gridMode = useCanvasStore((state) => state.gridMode);
  const setGridMode = useCanvasStore((state) => state.setGridMode);
  const gridSize = useCanvasStore((state) => state.gridSize);
  const setGridSize = useCanvasStore((state) => state.setGridSize);
  const snap = useCanvasStore((state) => state.snapToGrid);
  const setSnap = useCanvasStore((state) => state.setSnapToGrid);
  const resetViewport = useCanvasStore((state) => state.resetViewport);

  return (
    <>
      <ui.Label>Canvas</ui.Label>

      <ui.Sub>
        <ui.SubTrigger>
          <Grid2x2 aria-hidden="true" />
          Grid
          <span className="ml-auto pl-3 text-xs text-muted-foreground">
            {GRID_LABELS[gridMode]}
          </span>
        </ui.SubTrigger>
        <ui.SubContent className="w-auto min-w-36">
          {(Object.keys(GRID_LABELS) as GridMode[]).map((mode) => (
            <ui.Item key={mode} onSelect={() => setGridMode(mode)}>
              <span className="flex-1 capitalize">{GRID_LABELS[mode]}</span>
              {mode === gridMode ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span className="sr-only">(current)</span>
                </>
              ) : null}
            </ui.Item>
          ))}
        </ui.SubContent>
      </ui.Sub>

      <ui.Sub>
        <ui.SubTrigger>
          <Ruler aria-hidden="true" />
          Grid size
          <span className="ml-auto pl-3 text-xs text-muted-foreground">
            {gridSize}px
          </span>
        </ui.SubTrigger>
        <ui.SubContent className="w-auto min-w-32">
          {GRID_SIZES.map((size) => (
            <ui.Item key={size} onSelect={() => setGridSize(size)}>
              <span className="flex-1">{size}px</span>
              {size === gridSize ? (
                <>
                  <Check size={14} aria-hidden="true" />
                  <span className="sr-only">(current)</span>
                </>
              ) : null}
            </ui.Item>
          ))}
        </ui.SubContent>
      </ui.Sub>

      <ui.Item onSelect={() => setSnap(!snap)}>
        <Magnet aria-hidden="true" />
        {snap ? "Turn snapping off" : "Turn snapping on"}
      </ui.Item>

      <ui.Separator />

      <ui.Item onSelect={onFitToContent}>
        <Maximize aria-hidden="true" />
        Fit to content
      </ui.Item>

      <ui.Item onSelect={resetViewport}>
        <Ruler aria-hidden="true" />
        Reset view
      </ui.Item>
    </>
  );
}

export { NEXT_GRID_MODE, GRID_SIZES };
