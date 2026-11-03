"use client";
import { Bell, X } from "lucide-react";

import { ClayButton } from "@/components/ui/clay-button";
import type { ReminderReceipt } from "@/features/reminders/use-reminders";

export interface ReminderToastsProps {
  items: ReminderReceipt[];
  onRead: (key: string) => void;
  onOpenNote: (id: string) => void;
}

/** In-app popup for reminders that have come due and are still unread. */
export function ReminderToasts({ items, onRead, onOpenNote }: ReminderToastsProps) {
  const unread = items.filter((item) => !item.read).slice(-3).reverse();
  if (!unread.length) return null;

  return (
    <div aria-live="assertive" className="pointer-events-none fixed right-4 top-16 z-[var(--z-overlay)] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {unread.map((item) => (
        <div key={item.key} role="alert" className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-lg)] border border-border-strong bg-surface p-3 shadow-panel-md">
          <Bell size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Reminder · {new Date(item.remindAt).toLocaleString()}</p>
            <p className="truncate text-sm font-medium">{item.title}</p>
            <ClayButton size="sm" className="mt-2" onClick={() => { onRead(item.key); onOpenNote(item.noteId); }}>Open note</ClayButton>
          </div>
          <button type="button" aria-label={`Dismiss reminder: ${item.title}`} className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => onRead(item.key)}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
