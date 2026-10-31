"use client";
import { useDialogFocusReturn } from "@/hooks/use-dialog-focus-return";
import { Dialog } from "radix-ui";
import { ClayButton } from "@/components/ui/clay-button";
import type { ReminderReceipt } from "@/features/reminders/use-reminders";

export interface ReminderCenterProps {
  open: boolean; onClose: () => void; items: ReminderReceipt[];
  permission: NotificationPermission | "unsupported";
  error: string | null; onRetry: () => void; onEnableBrowser: () => void;
  onRead: (key: string) => void; onOpenNote: (id: string) => void;
}
export function ReminderCenter(props: ReminderCenterProps) {
  const focusReturn = useDialogFocusReturn();
  return <Dialog.Root open={props.open} onOpenChange={(open) => { if (!open) props.onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-surface-sunken/70" />
    <Dialog.Content {...focusReturn} aria-describedby="reminders-description" className="fixed inset-x-4 top-16 z-[var(--z-overlay)] mx-auto max-h-[80dvh] max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <Dialog.Title className="text-lg font-semibold">Reminders</Dialog.Title>
      <p id="reminders-description" className="mt-1 text-xs text-muted-foreground">Current-board reminders are checked while Tackly is open. Closed-page push and email are not enabled.</p>
      <p className="my-3 text-sm">{props.permission === "granted" ? "Browser notifications enabled." : props.permission === "denied" ? "Browser notifications blocked. Change this site's browser settings to enable them." : props.permission === "unsupported" ? "Browser notifications are unavailable here. In-app reminders still work." : "Browser notifications are off until you enable them."}</p>
      {props.permission === "default" ? <ClayButton size="sm" onClick={props.onEnableBrowser}>Enable browser notifications</ClayButton> : null}
      {props.error ? <p role="alert" className="mt-3 text-sm">{props.error} <button type="button" onClick={props.onRetry}>Retry reminders</button></p> : null}
      {props.items.length === 0 ? <p className="my-4 text-sm text-muted-foreground">No due reminders on this board. Set a reminder in the note editor.</p> : <ul className="my-4 divide-y divide-border">{[...props.items].reverse().map((item) => <li key={item.key} className="py-3">
        <button type="button" className="text-left text-sm font-medium" onClick={() => { props.onRead(item.key); props.onClose(); props.onOpenNote(item.noteId); }}>{item.title}</button>
        <p className="mt-1 text-xs text-muted-foreground">{new Date(item.remindAt).toLocaleString()} / {item.read ? "Read" : "Unread"} / {item.browser === "sent" ? "Browser alert requested" : item.browser === "failed" ? "Browser alert failed" : "In-app reminder"}</p>
        {!item.read ? <button type="button" className="mt-1 text-xs" onClick={() => props.onRead(item.key)}>Mark read: {item.title}</button> : null}
        {item.browser === "failed" ? <button type="button" className="ml-2 text-xs" onClick={props.onRetry}>Retry browser alert</button> : null}
      </li>)}</ul>}
      <Dialog.Close asChild><ClayButton size="sm" variant="ghost">Close reminders</ClayButton></Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
