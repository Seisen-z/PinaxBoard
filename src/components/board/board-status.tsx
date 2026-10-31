"use client";

import { Loader2, RotateCcw, TriangleAlert } from "lucide-react";

import { ClayButton } from "@/components/ui/clay-button";
import { SurfacePanel } from "@/components/ui/surface-panel";

export interface BoardStatusProps {
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
}

/**
 * Loading and error states for a board being fetched
 * (IMPLEMENTATION_PLAN.md §51 — every async feature needs loading, error and
 * retry).
 *
 * Rendered as an overlay rather than replacing the board: the stores already
 * hold the last contents, so swapping them for a skeleton would make a
 * refetch look like the board had been wiped.
 */
export function BoardStatus({ loading, error, onRetry }: BoardStatusProps) {
  if (!loading && !error) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-height)+0.75rem)] z-[var(--z-overlay)] flex justify-center px-4"
      data-testid="board-status"
    >
      {loading ? (
        <SurfacePanel
          tone="base"
          border="soft"
          radius="lg"
          elevation="md"
          role="status"
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground"
        >
          <Loader2 size={13} aria-hidden="true" className="animate-spin" />
          Loading your board…
        </SurfacePanel>
      ) : (
        <SurfacePanel
          tone="base"
          border="strong"
          radius="lg"
          elevation="md"
          role="alert"
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-xs"
        >
          <TriangleAlert size={14} aria-hidden="true" className="text-danger" />
          <span>{error?.message ?? "Could not load this board."}</span>
          <ClayButton variant="ghost" size="sm" onClick={onRetry}>
            <RotateCcw size={13} aria-hidden="true" />
            Retry
          </ClayButton>
        </SurfacePanel>
      )}
    </div>
  );
}
