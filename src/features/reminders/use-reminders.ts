"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { dueReminders } from "./schedule";
import type { Note } from "@/types/note";

export interface ReminderReceipt { key: string; noteId: string; title: string; remindAt: string; read: boolean; browser: "pending" | "sent" | "failed" }
function readJournal(key: string): ReminderReceipt[] {
  const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
  if (!Array.isArray(value)) throw new Error("Reminder journal needs repair. Use Retry reminders to start a fresh journal.");
  return value.filter((item): item is ReminderReceipt => Boolean(item && typeof item.key === "string" && typeof item.noteId === "string" && typeof item.title === "string" && typeof item.remindAt === "string" && typeof item.read === "boolean" && ["pending", "sent", "failed"].includes(item.browser)));
}

/** Page-open reminders. Browser receipts are separate from in-app delivery. */
export function useReminders(notes: readonly Note[], scope: string, onOpenNote: (id: string) => void) {
  const key = `tackly:reminders:${scope}`;
  const active = useRef("");
  const memory = useRef<{ key: string; items: ReminderReceipt[] }>({ key: "", items: [] });
  const notifications = useRef<Notification[]>([]);
  const [state, setState] = useState<{ key: string; items: ReminderReceipt[]; error: string | null }>({ key: "", items: [], error: null });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  const sweep = useCallback(async () => {
    await Promise.resolve();
    if (active.current !== key) return;
    const run = () => {
      if (active.current !== key) return;
      let error: string | null = null;
      let stored: ReminderReceipt[] = [];
      try { stored = readJournal(key); } catch (caught) { error = caught instanceof Error ? caught.message : "Reminder storage is unavailable."; }
      const previous = memory.current.key === key ? memory.current.items : [];
      const byKey = new Map(stored.map((receipt) => [receipt.key, receipt]));
      for (const receipt of previous) {
        const stored = byKey.get(receipt.key);
        byKey.set(receipt.key, stored ? { ...receipt, read: stored.read || receipt.read, browser: stored.browser === "sent" || receipt.browser === "sent" ? "sent" : receipt.browser } : receipt);
      }
      const due = dueReminders(notes, Date.now());
      const dueKeys = new Set(due.map((note) => `${note.id}:${note.remindAt}`));
      for (const note of due) {
        const receiptKey = `${note.id}:${note.remindAt}`;
        if (!byKey.has(receiptKey)) byKey.set(receiptKey, { key: receiptKey, noteId: note.id, title: note.title || "Untitled note", remindAt: note.remindAt!, read: false, browser: "pending" });
      }
      const items = [...byKey.values()];
      memory.current = { key, items };
      const persist = () => {
        try { localStorage.setItem(key, JSON.stringify(items)); }
        catch { error = "Reminder history was not saved on this device. In-app reminders are visible; retry storage."; }
      };
      persist();
      const currentPermission = typeof Notification !== "undefined" && window.isSecureContext !== false ? Notification.permission : "unsupported";
      setPermission(currentPermission);
      if (currentPermission === "granted") {
        for (const receipt of items) {
          if (receipt.read || receipt.browser !== "pending" || !dueKeys.has(receipt.key)) continue;
          try {
            const notification = new Notification("Tackly reminder", { body: receipt.title, tag: receipt.key });
            notification.onclick = () => { notification.close(); if (active.current === key) { window.focus(); onOpenNote(receipt.noteId); } };
            notifications.current.push(notification);
            receipt.browser = "sent";
          } catch { receipt.browser = "failed"; }
        }
        persist();
      }
      setState({ key, items: items.map((item) => ({ ...item })), error });
    };
    if (navigator.locks?.request) {
      try { await navigator.locks.request(key, { ifAvailable: true }, (lock) => { if (lock) run(); }); }
      catch { run(); } // Restricted/unsupported lock contexts still receive in-app reminders.
    } else run();
  }, [key, notes, onOpenNote]);

  useEffect(() => {
    active.current = key;
    return () => {
      active.current = "";
      notifications.current.forEach((notification) => notification.close()); notifications.current = [];
    };
  }, [key]);

  useEffect(() => {
    void sweep();
    const timer = window.setInterval(() => void sweep(), 15_000);
    const refresh = () => void sweep();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh); window.removeEventListener("storage", refresh);
    };
  }, [sweep]);

  const requestPermission = async () => {
    if (typeof Notification === "undefined" || window.isSecureContext === false) return;
    try { setPermission(await Notification.requestPermission()); await sweep(); }
    catch { setState((current) => ({ ...current, error: "Browser permission request failed. In-app reminders remain available." })); }
  };
  const markRead = (receiptKey: string) => {
    if (memory.current.key !== key) return;
    memory.current.items = memory.current.items.map((item) => item.key === receiptKey ? { ...item, read: true } : item);
    try { localStorage.setItem(key, JSON.stringify(memory.current.items)); } catch { /* sweep publishes the storage error */ }
    void sweep();
  };
  const retry = () => {
    try { readJournal(key); } catch { try { localStorage.removeItem(key); } catch { /* sweep exposes unavailable storage */ } }
    if (memory.current.key === key) memory.current.items.forEach((item) => { if (item.browser === "failed") item.browser = "pending"; });
    // Persist the explicit retry transition; automatic sweeps do not repeat failed alerts.
    try { if (memory.current.key === key) localStorage.setItem(key, JSON.stringify(memory.current.items)); } catch { /* reported by sweep */ }
    void sweep();
  };
  const items = state.key === key ? state.items.filter((item) => notes.some((note) => note.id === item.noteId && !note.completed && !note.archived && !note.deletedAt && note.remindAt === item.remindAt)) : [];
  return { items, unread: items.filter((item) => !item.read).length, permission, requestPermission, markRead, retry, error: state.key === key ? state.error : null };
}
