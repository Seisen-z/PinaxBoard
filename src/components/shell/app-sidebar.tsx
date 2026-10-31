"use client";
import { useCanEditBoard } from "@/features/collaboration/access";

import { PanelLeftClose, PanelLeftOpen, FolderInput, SquarePen } from "lucide-react";

import { useState } from "react";
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";
import {
  NAV_FOOTER,
  NAV_ITEMS,
  NAV_PRIMARY,
  NAV_VIEWS,
  type NavItemId,
} from "@/components/shell/nav-items";
import { TacklyMark } from "@/components/brand/tackly-mark";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface AppSidebarProps {
  /** Currently highlighted destination. */
  activeItem: NavItemId;
  /** Called when a destination is chosen. */
  onSelectItem: (id: NavItemId) => void;
  /** The signed-in user's id, or `null` when signed out. */
  ownerId: string | null;
  /** Creates a blank note in the first column â€” one action, no dialog (Â§23). */
  onCompose: () => void;
  /** Opens the validated data transfer dialog. */
  onOpenImportExport: () => void;
}

/**
 * The permanent left sidebar.
 *
 * This replaces the top navigation bar, and reverses FRONTEND_SPEC.md Â§11's
 * "no permanent sidebar" â€” see "Decisions made" in docs/HANDOFF.md. The
 * trade it makes: the board gives up ~236px of width and gets a destination
 * list that is always visible, rather than a row of buttons competing with the
 * workspace picker and the utilities for one 74px band.
 *
 * It is a quieter plane than the surface beside it (`--surface-sidebar`), so
 * the board still reads as the subject.
 */
export function AppSidebar({
  activeItem,
  onSelectItem,
  ownerId,
  onCompose,
  onOpenImportExport,
}: AppSidebarProps) {
  const canEdit=useCanEditBoard();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      aria-label="Workspace"
      data-testid="app-sidebar"
      className={cn("fixed inset-x-0 bottom-0 z-[var(--z-header)] flex h-14 w-full border-t border-border bg-surface-sidebar pb-[env(safe-area-inset-bottom)] md:static md:h-auto md:shrink-0 md:flex-col md:border-r md:border-t-0", collapsed ? "md:w-14" : "md:w-[var(--sidebar-width)]")}
    >
      {/* Workspace row â€” avatar, switcher, and the compose shortcut. */}
      <div
        className="flex w-20 shrink-0 items-center gap-1 overflow-hidden px-1 md:w-auto md:gap-2 md:px-3"
        style={{ height: "var(--header-height)" }}
      >
        <TacklyMark size={30} className="hidden md:block" />

        <WorkspaceSwitcher
          ownerId={ownerId}
          hideBoardOnTrigger
          triggerClassName="min-w-0 flex-1 justify-start px-1.5 font-semibold"
        />

        <IconButton
          disabled={!canEdit} label="New note"
          icon={<SquarePen size={16} />}
          variant="ghost"
          size="sm"
          onClick={onCompose}
        />
      </div>

      <button type="button" className="hidden min-h-11 items-center justify-center text-muted-foreground md:flex" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
      <div className="px-2 pb-2">
        <button type="button" data-import-export-trigger="true" onClick={onOpenImportExport} className="flex w-full items-center justify-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-surface-raised hover:text-foreground md:justify-start">
          <FolderInput size={16} aria-hidden="true" />
          <span className={collapsed ? "sr-only" : "sr-only md:not-sr-only"}>Import / Export</span>
        </button>
      </div>

      <nav
        aria-label="Primary"
        className="tk-scrollbar-thin flex min-w-0 flex-1 flex-row gap-1 overflow-x-auto px-2 py-1 md:min-h-0 md:flex-col md:gap-4 md:overflow-y-auto md:overflow-x-hidden md:pb-3"
      >
        <NavGroup
          items={NAV_PRIMARY}
          collapsed={collapsed}
          activeItem={activeItem}
          onSelectItem={onSelectItem}
        />
        <NavGroup
          items={NAV_VIEWS}
          collapsed={collapsed}
          activeItem={activeItem}
          onSelectItem={onSelectItem}
        />

        <div className="md:mt-auto">
          <NavGroup
            items={NAV_FOOTER}
            collapsed={collapsed}
          activeItem={activeItem}
            onSelectItem={onSelectItem}
          />
        </div>
      </nav>
    </aside>
  );
}

interface NavGroupProps {
  /**
   * A slice of the catalogue. Typed from `NAV_ITEMS` rather than the wider
   * `NavItem` so each `id` stays a literal and reaches `onSelectItem` without
   * a cast.
   */
  items: readonly (typeof NAV_ITEMS)[number][];
  collapsed: boolean;
  activeItem: NavItemId;
  onSelectItem: (id: NavItemId) => void;
}

/**
 * One block of destinations.
 *
 * The active item is *filled*, not raised â€” raising it would make a permanent
 * fixture of the sidebar look like a floating control (handoff decision 3).
 */
function NavGroup({ items, activeItem, onSelectItem, collapsed }: NavGroupProps) {
  return (
    <ul className="flex shrink-0 flex-row gap-0.5 md:flex-col">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeItem;

        return (
          <li key={item.id}>
            <button
              type="button"
              title={item.label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelectItem(item.id)}
              className={cn(
                "flex min-h-11 min-w-11 w-full items-center justify-center gap-2.5 rounded-md px-1 py-1.5 md:justify-start md:px-2.5",
                "text-left text-sm transition-colors",
                "duration-[var(--motion-fast)] ease-[var(--motion-ease)]",
                isActive
                  ? "bg-surface-raised font-medium text-foreground"
                  : "text-muted-foreground hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <Icon size={16} aria-hidden="true" className="shrink-0" />
              <span className={collapsed ? "sr-only" : "sr-only md:not-sr-only md:truncate"}>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}


