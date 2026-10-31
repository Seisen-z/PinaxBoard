import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional class names and resolves Tailwind conflicts
 * (later classes win, e.g. `cn("p-2", "p-4")` → `"p-4"`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Clamps `value` into the inclusive range `[min, max]`. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Formats a date for note metadata (e.g. "Sep 28").
 * Returns an empty string for missing or unparseable input so a bad timestamp
 * degrades to blank rather than rendering "Invalid Date" on a card.
 */
export function formatShortDate(
  value: string | null | undefined,
  locale = "en-US",
): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Generates a client-side id.
 *
 * Uses `crypto.randomUUID()` where available and falls back to a random string
 * otherwise, so note creation still works in older browsers and in non-secure
 * contexts (where `crypto.randomUUID` is undefined).
 */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `tk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
