"use client";

import {
  Check,
  CloudOff,
  Loader2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { ClayButton } from "@/components/ui/clay-button";
import { cn } from "@/lib/utils";
import { useSyncStore } from "@/stores/sync-store";

export interface SyncIndicatorProps {
  /** Re-attempts a failed write. */
  onRetry: () => void;
  /** Hidden entirely when the app is running on local state. */
  visible: boolean;
}

/**
 * The autosave status readout (PRODUCT_SPEC.md → "Auto Save").
 *
 * Deliberately quiet when everything is fine: "Saved" is small and muted, and
 * there is no toast per save (FRONTEND_SPEC.md §61 — "Do not show a toast for
 * every autosave"). Only a failure earns attention, and when it does it comes
 * with a way to act on it rather than just an apology.
 */
export function SyncIndicator({ onRetry, visible }: SyncIndicatorProps) {
  const status = useSyncStore((state) => state.status);
  const pendingCount = useSyncStore((state) => state.pendingCount);
  const error = useSyncStore((state) => state.error);

  if (!visible) return null;

  if (status === "error") {
    return (
      <ClayButton
        variant="ghost"
        size="sm"
        onClick={onRetry}
        title={error ?? undefined}
        className="text-danger"
        data-testid="sync-indicator"
        data-sync-status={status}
      >
        <TriangleAlert size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Not saved</span>
        <RotateCcw size={13} aria-hidden="true" />
        <span className="sr-only">
          {error ?? "Could not save"}. Retry now.
        </span>
      </ClayButton>
    );
  }

  const { icon, label } = describe(status, pendingCount);

  return (
    <span
      // `status`, not `alert`: the polite live region announces a change when
      // the user is idle instead of interrupting them mid-edit.
      role="status"
      data-testid="sync-indicator"
      data-sync-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 text-xs",
        status === "offline" ? "text-warning" : "text-muted-foreground",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function describe(
  status: string,
  pendingCount: number,
): { icon: React.ReactNode; label: string } {
  switch (status) {
    case "saving":
      return {
        icon: <Loader2 size={13} aria-hidden="true" className="animate-spin" />,
        label: pendingCount > 1 ? `Saving ${pendingCount} changes…` : "Saving…",
      };
    case "syncing":
      return {
        icon: <Loader2 size={13} aria-hidden="true" className="animate-spin" />,
        label: "Syncing…",
      };
    case "offline":
      return {
        icon: <CloudOff size={13} aria-hidden="true" />,
        label: "Offline — saved on this device",
      };
    default:
      return {
        icon: <Check size={13} aria-hidden="true" />,
        label: "Saved",
      };
  }
}
