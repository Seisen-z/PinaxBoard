import {
  Archive,
  Trash2,
  BarChart3,
  House,
  Calendar,
  Columns3,
  GanttChartSquare,
  Inbox,
  LayoutDashboard,
  Settings,
  StickyNote,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Sidebar destinations.
 *
 * Split into two groups because they answer different questions: the first is
 * "what is waiting for me", the second "how do I want to look at the board".
 * The sidebar draws a gap between them; nothing else depends on the split.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_PRIMARY = [
  { id: "dashboard", label: "Dashboard", icon: House },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "mine", label: "My Notes", icon: UserRound },
] as const satisfies readonly NavItem[];

export const NAV_VIEWS = [
  { id: "board", label: "Board", icon: Columns3 },
  { id: "canvas", label: "Canvas", icon: LayoutDashboard },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "timeline", label: "Timeline", icon: GanttChartSquare },
  { id: "notes", label: "All Notes", icon: StickyNote },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const satisfies readonly NavItem[];

export const NAV_FOOTER = [
  { id: "archive", label: "Archive", icon: Archive },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "settings", label: "Settings", icon: Settings },
] as const satisfies readonly NavItem[];

/** Every destination, in the order the sidebar renders them. */
export const NAV_ITEMS = [
  ...NAV_PRIMARY,
  ...NAV_VIEWS,
  ...NAV_FOOTER,
] as const satisfies readonly NavItem[];

export type NavItemId = (typeof NAV_ITEMS)[number]["id"];
