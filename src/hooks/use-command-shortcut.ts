"use client";

import { useEffect } from "react";

/**
 * Binds Ctrl/Cmd+K to open the command palette.
 *
 * The breadcrumb bar's search button already advertises the shortcut with a
 * `kbd` and `aria-keyshortcuts`, so the binding has to exist or the button is
 * lying about it.
 *
 * Registered on `document` in the capture phase: the shortcut has to work
 * while the caret is inside the rich editor, and ProseMirror handles keys on
 * the editor's own element. Without capture, Tiptap would see it first.
 */
export function useCommandShortcut(onOpen: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "k" && event.key !== "K") return;
      if (!event.ctrlKey && !event.metaKey) return;

      // Ctrl+Shift+K is "delete line" in several editors; claiming it too
      // would break a reflex people bring with them.
      if (event.shiftKey || event.altKey) return;

      event.preventDefault();
      onOpen();
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [onOpen]);
}
