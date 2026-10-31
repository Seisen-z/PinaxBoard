"use client";

import { Users, Bell, ChevronRight, Search, Wallpaper } from "lucide-react";

import { AccountMenu } from "@/components/shell/account-menu";
import { SyncIndicator } from "@/components/shell/sync-indicator";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ClayButton } from "@/components/ui/clay-button";
import { IconButton } from "@/components/ui/icon-button";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { useActiveWorkspace } from "@/features/workspaces/use-active-workspace";
import type { SessionUser } from "@/features/auth/types";
import { cn } from "@/lib/utils";

/** Shown in place of a workspace name before a project is connected. */
const LOCAL_LABEL = "Local workspace";

export interface BreadcrumbBarProps {
  /** The trailing crumb — the section the user is looking at. */
  section: string;
  /** Opens the search / command palette. Wired up in Milestone 12. */
  onOpenSearch?: () => void;
  onOpenShare?: () => void;
  onOpenBackground?: () => void;
  onOpenNotifications?: () => void;
  /** Unread notification count; the badge is hidden when zero. */
  notificationCount?: number;
  /** `null` when signed out, or when no Supabase project is connected. */
  user?: SessionUser | null;
  /** The sign-out server action. Omitted when auth is not wired up. */
  onSignOut?: () => Promise<void>;
  /** Shows the autosave readout. False while running on local state. */
  syncVisible?: boolean;
  /** Re-attempts a failed autosave. */
  onRetrySync?: () => void;
}

/**
 * The slim bar above the surface: where you are on the left, utilities right.
 *
 * It names the location rather than offering navigation — that moved to
 * {@link AppSidebar} — which is what lets it be half the height of the old
 * header. Still opaque: no backdrop blur (FRONTEND_SPEC.md §53).
 */
export function BreadcrumbBar({
  section,
  onOpenSearch,
  onOpenShare,
  onOpenBackground,
  onOpenNotifications,
  notificationCount = 0,
  user = null,
  onSignOut,
  syncVisible = false,
  onRetrySync,
}: BreadcrumbBarProps) {
  const cloudEnabled = Boolean(user?.id);
  const { activeWorkspace, activeBoard } = useActiveWorkspace(cloudEnabled);

  // Workspace, then board when one is open, then the section. The board crumb
  // is skipped rather than faked while running on local state — an invented
  // board name in the breadcrumb would be a lie about where the data lives.
  const crumbs = [
    cloudEnabled ? (activeWorkspace?.name ?? LOCAL_LABEL) : LOCAL_LABEL,
    ...(activeBoard ? [activeBoard.name] : []),
    section,
  ];

  return (
    <SurfacePanel
      as="header"
      tone="base"
      radius="none"
      border="soft"
      className={cn(
        "z-[var(--z-header)] shrink-0 border-x-0 border-t-0",
        "flex items-center gap-3 px-4",
      )}
      style={{ height: "var(--header-height)" }}
    >
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;

            return (
              <li key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1">
                {index > 0 ? (
                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground"
                  />
                ) : null}
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "truncate",
                    isLast
                      ? "font-medium text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {crumb}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <ClayButton
          variant="secondary"
          size="sm"
          onClick={onOpenSearch}
          aria-keyshortcuts="Control+K"
          className="hidden w-56 justify-start text-muted-foreground xl:inline-flex"
        >
          <Search size={14} aria-hidden="true" />
          <span className="truncate">Search…</span>
          <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] font-medium">
            Ctrl K
          </kbd>
        </ClayButton>

        <IconButton
          label="Search"
          icon={<Search size={16} />}
          variant="ghost"
          size="sm"
          onClick={onOpenSearch}
          className="xl:hidden"
        />

        {onOpenShare ? <ClayButton data-share-trigger size="sm" onClick={onOpenShare}><Users size={15} aria-hidden="true" /><span className="hidden sm:inline">Share</span><span className="sr-only sm:hidden">Share board</span></ClayButton> : null}
        <SyncIndicator visible={syncVisible} onRetry={onRetrySync ?? (() => {})} />

        {onOpenBackground ? <IconButton label="Customize background" icon={<Wallpaper size={16} />} variant="ghost" size="sm" onClick={onOpenBackground} /> : null}
        <ThemeToggle />

        <div className="relative">
          <IconButton
            label={
              notificationCount > 0
                ? `Notifications, ${notificationCount} unread`
                : "Notifications"
            }
            onClick={onOpenNotifications}
            icon={<Bell size={16} />}
            variant="ghost"
            size="sm"
          />
          {notificationCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </div>

        <AccountMenu user={user} {...(onSignOut ? { onSignOut } : {})} />
      </div>
    </SurfacePanel>
  );
}
