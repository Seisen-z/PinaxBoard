"use client";

import { createPortal } from "react-dom";

import { SurfacePanel } from "@/components/ui/surface-panel";
import type { SlashCommand } from "@/lib/tiptap/slash-commands";
import { cn } from "@/lib/utils";

/** Viewport coordinates of the caret that opened the menu. */
export interface SlashMenuPosition {
  left: number;
  top: number;
}

export interface SlashMenuProps {
  commands: readonly SlashCommand[];
  /** Index of the keyboard-highlighted row. */
  activeIndex: number;
  position: SlashMenuPosition;
  onSelect: (command: SlashCommand) => void;
  /** Moves the highlight when the pointer does, so the two never disagree. */
  onHover: (index: number) => void;
}

const MENU_WIDTH = 248;
const MENU_MAX_HEIGHT = 288;

/**
 * The block menu opened by typing "/" (IMPLEMENTATION_PLAN.md §15).
 *
 * Rendered in a portal at viewport coordinates. A note card is a scrolling,
 * `overflow: hidden` box inside another scrolling box, so a menu positioned
 * within it would be clipped by the card it belongs to.
 *
 * Keyboard-driven, by design: the caret is already in the editor, so the list
 * never takes focus. Arrow keys and Enter are handled by the editor's own
 * keydown handler, which is why these rows are buttons that do not focus
 * themselves on mousedown.
 *
 * No "has mounted" guard, deliberately. The portal needs a DOM target, which
 * the server render has not got — but the caller only renders this once the
 * user has typed "/", which cannot happen on the server. A mount flag here
 * would be an effect that sets state purely to re-render into the same markup.
 */
export function SlashMenu({
  commands,
  activeIndex,
  position,
  onSelect,
  onHover,
}: SlashMenuProps) {
  const { left, top } = clampToViewport(position);

  const menu = (
    <SurfacePanel
      tone="raised"
      border="soft"
      radius="lg"
      elevation="md"
      role="listbox"
      aria-label="Insert block"
      data-testid="slash-menu"
      className="tk-scrollbar-thin fixed z-[var(--z-overlay)] overflow-y-auto p-1"
      style={{
        left,
        top,
        width: MENU_WIDTH,
        maxHeight: MENU_MAX_HEIGHT,
      }}
    >
      {commands.length === 0 ? (
        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
          No matching blocks
        </p>
      ) : (
        commands.map((command, index) => {
          const Icon = command.icon;
          const isActive = index === activeIndex;

          return (
            <button
              key={command.id}
              type="button"
              role="option"
              aria-selected={isActive}
              // The caret stays in the editor: focusing this button would
              // close the menu through the editor's blur handler before the
              // click ever lands.
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(command);
              }}
              onMouseEnter={() => onHover(index)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
                "transition-colors duration-[var(--motion-fast)]",
                isActive ? "bg-surface-sunken text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon size={15} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {command.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {command.hint}
                </span>
              </span>
            </button>
          );
        })
      )}
    </SurfacePanel>
  );

  return createPortal(menu, window.document.body);
}

/**
 * Keeps the menu on screen.
 *
 * A caret near the right edge or low in the viewport would otherwise open a
 * menu that is half off screen — and since the menu does not take focus, there
 * is no scroll-into-view to rescue it.
 */
function clampToViewport({ left, top }: SlashMenuPosition): SlashMenuPosition {
  const margin = 8;
  const { innerWidth, innerHeight } = window;

  const clampedLeft = Math.min(left, innerWidth - MENU_WIDTH - margin);

  // Flip above the caret when there is not room below. 24px is roughly a line,
  // so the menu clears the text it was triggered from.
  const fitsBelow = top + MENU_MAX_HEIGHT + margin <= innerHeight;
  const clampedTop = fitsBelow ? top + 4 : Math.max(margin, top - MENU_MAX_HEIGHT - 24);

  return { left: Math.max(margin, clampedLeft), top: clampedTop };
}
