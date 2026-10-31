import type { ComponentType, ReactNode } from "react";

import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * A menu family's component set.
 *
 * Radix ships dropdown menus and context menus as two separate families with
 * matching APIs but no shared types. Every menu in Tackly is reachable both
 * ways — from a button and from a right-click — so rendering each one twice
 * would mean two copies of the same list drifting apart.
 *
 * A component takes `ui: MenuPrimitives` and renders once. The only cost is
 * the cast below, which is contained in this file.
 */

interface MenuItemProps {
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  variant?: "default" | "destructive";
  inset?: boolean;
  onSelect?: (event: Event) => void;
}

interface MenuSlotProps {
  children?: ReactNode;
  className?: string;
}

export interface MenuPrimitives {
  Item: ComponentType<MenuItemProps>;
  Label: ComponentType<MenuSlotProps>;
  Separator: ComponentType<MenuSlotProps>;
  Sub: ComponentType<{ children?: ReactNode }>;
  SubTrigger: ComponentType<MenuSlotProps>;
  SubContent: ComponentType<MenuSlotProps>;
}

/*
 * The casts narrow each family's props to the subset used here. They are safe
 * because both families accept every prop in `MenuItemProps` with the same
 * meaning — that is precisely why the two are interchangeable — but TypeScript
 * has no way to know the two unrelated prop types line up.
 */
export const DROPDOWN_MENU_PRIMITIVES: MenuPrimitives = {
  Item: DropdownMenuItem as ComponentType<MenuItemProps>,
  Label: DropdownMenuLabel as ComponentType<MenuSlotProps>,
  Separator: DropdownMenuSeparator as ComponentType<MenuSlotProps>,
  Sub: DropdownMenuSub as ComponentType<{ children?: ReactNode }>,
  SubTrigger: DropdownMenuSubTrigger as ComponentType<MenuSlotProps>,
  SubContent: DropdownMenuSubContent as ComponentType<MenuSlotProps>,
};

export const CONTEXT_MENU_PRIMITIVES: MenuPrimitives = {
  Item: ContextMenuItem as ComponentType<MenuItemProps>,
  Label: ContextMenuLabel as ComponentType<MenuSlotProps>,
  Separator: ContextMenuSeparator as ComponentType<MenuSlotProps>,
  Sub: ContextMenuSub as ComponentType<{ children?: ReactNode }>,
  SubTrigger: ContextMenuSubTrigger as ComponentType<MenuSlotProps>,
  SubContent: ContextMenuSubContent as ComponentType<MenuSlotProps>,
};
