"use client";

import { Maximize2, Minus, Plus } from "lucide-react";

import { ClayButton } from "@/components/ui/clay-button";
import { IconButton } from "@/components/ui/icon-button";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STOPS } from "@/config/layouts";
import { clamp } from "@/lib/utils";

export interface ZoomControlsProps {
  /** Current zoom, where 1 = 100%. */
  zoom: number;
  onZoomChange: (zoom: number) => void;
  /** Resets to 100%. */
  onResetZoom?: () => void;
  onToggleFullscreen?: () => void;
}

/**
 * Zoom, at the right of the board toolbar.
 *
 * Steps move between the preset stops in `src/config/layouts.ts` rather than
 * by a fixed increment, so the percentages a user sees match the zoom menu
 * offered in Canvas Mode (PRODUCT_SPEC.md → "Zoom Controls").
 */
export function ZoomControls({
  zoom,
  onZoomChange,
  onResetZoom,
  onToggleFullscreen,
}: ZoomControlsProps) {
  const percent = Math.round(zoom * 100);

  const stepTo = (direction: "in" | "out") => {
    const next =
      direction === "in"
        ? ZOOM_STOPS.find((stop) => stop > zoom + 0.001)
        : [...ZOOM_STOPS].reverse().find((stop) => stop < zoom - 0.001);

    onZoomChange(clamp(next ?? zoom, MIN_ZOOM, MAX_ZOOM));
  };

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Zoom">
      <IconButton
        label="Zoom out"
        icon={<Minus size={16} />}
        variant="ghost"
        size="sm"
        disabled={zoom <= MIN_ZOOM + 0.001}
        onClick={() => stepTo("out")}
      />

      <ClayButton
        variant="ghost"
        size="sm"
        onClick={onResetZoom}
        aria-label={`Zoom level ${percent} percent. Reset to 100 percent`}
        className="min-w-14 tabular-nums"
      >
        {percent}%
      </ClayButton>

      <IconButton
        label="Zoom in"
        icon={<Plus size={16} />}
        variant="ghost"
        size="sm"
        disabled={zoom >= MAX_ZOOM - 0.001}
        onClick={() => stepTo("in")}
      />

      <IconButton
        label="Toggle fullscreen"
        icon={<Maximize2 size={16} />}
        variant="ghost"
        size="sm"
        onClick={onToggleFullscreen}
      />
    </div>
  );
}
