"use client";
import { useRef } from "react";
/** Controlled dialogs opened outside Radix Trigger still restore meaningful keyboard focus. */
export function useDialogFocusReturn(fallback?: () => HTMLElement | null) {
  const previous = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => { previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; },
    onCloseAutoFocus: (event: Event) => { event.preventDefault(); const candidate = previous.current; const target = candidate?.isConnected && candidate !== document.body ? candidate : fallback?.() ?? document.getElementById("main-content"); target?.focus(); },
  };
}
