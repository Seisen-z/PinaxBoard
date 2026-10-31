"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { BackgroundSettings } from "@/types/board";
import { normalizeBackground } from "@/features/background/settings";
import { EMPTY_FILTERS, type BoardFilters } from "@/features/board/filter-notes";
import { DEFAULT_THEME_MODE, type ThemeMode } from "@/config/themes";

/**
 * User interface preferences.
 *
 * Milestone 19 expands this into full background and appearance customization
 * (IMPLEMENTATION_PLAN.md §25). For now it holds the colour mode and the
 * board's view settings.
 */
/**
 * How notes are ordered within a column (PRODUCT_SPEC.md → "Sorting").
 *
 * `manual` keeps the order notes were created in. Every other mode is a view
 * concern only — it never rewrites the stored order, so switching back to
 * `manual` restores exactly what the user arranged.
 */
export const BOARD_SORTS = [
  "manual",
  "created",
  "updated",
  "due",
  "priority",
  "title",
] as const;
export type BoardSort = (typeof BOARD_SORTS)[number];

/** How much breathing room a card gets. */
export const CARD_DENSITIES = ["comfortable", "compact"] as const;
export type CardDensity = (typeof CARD_DENSITIES)[number];

/** How the note editor opens: a panel on the right, a centred card, or the whole page. */
export const NOTE_PEEK_MODES = ["side", "center", "full"] as const;
export type NotePeekMode = (typeof NOTE_PEEK_MODES)[number];

export interface SettingsStoreState {
  localBackground: BackgroundSettings | null;
  setLocalBackground: (background: BackgroundSettings | null) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  /** Remembered across sessions: a user who prefers the full page keeps it. */
  notePeekMode: NotePeekMode;
  setNotePeekMode: (mode: NotePeekMode) => void;

  /**
   * Board-view settings. Kept separate from the canvas's own settings on
   * purpose: the two surfaces answer different questions — a column list cares
   * about sorting and density, an infinite canvas cares about grid and snap —
   * and sharing one settings blob would put irrelevant controls in both.
   */
  boardSort: BoardSort;
  boardShowCompleted: boolean;
  boardDensity: CardDensity;

  setBoardSort: (sort: BoardSort) => void;
  setBoardShowCompleted: (show: boolean) => void;
  setBoardDensity: (density: CardDensity) => void;

  /**
   * Which notes the board is showing (IMPLEMENTATION_PLAN.md §17).
   *
   * Persisted with the other view settings: a filter the user set is a view
   * they chose, and losing it on reload means re-picking three tags every
   * time. The flip side is that a board can open filtered, which is why the
   * toolbar shows an active count rather than a plain Filter label.
   */
  boardFilters: BoardFilters;
  setBoardFilters: (filters: BoardFilters) => void;
  clearBoardFilters: () => void;
}

/**
 * The values a fresh install starts with.
 *
 * Exported so `vitest.setup.ts` can restore them between tests. The store is a
 * module singleton, so a filter set in one test is still set in the next —
 * which makes an assertion on a note count pass or fail depending on file
 * order.
 */
export const SETTINGS_DEFAULTS = {
  localBackground: null,
  themeMode: DEFAULT_THEME_MODE,
  notePeekMode: "side",
  boardSort: "manual",
  boardShowCompleted: true,
  boardDensity: "comfortable",
  boardFilters: EMPTY_FILTERS,
} as const satisfies Partial<SettingsStoreState>;

export const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set, get) => ({
      ...SETTINGS_DEFAULTS,
      setLocalBackground: (background) => {
        const localBackground = background ? normalizeBackground(background) : null;
        // Preflight quota/access before publishing a state that appears saved.
        localStorage.setItem("tackly:settings", JSON.stringify({ state: { ...get(), localBackground }, version: 2 }));
        set({ localBackground });
      },
      setThemeMode: (themeMode) => set({ themeMode }),
      setNotePeekMode: (notePeekMode) => set({ notePeekMode }),

      setBoardSort: (boardSort) => set({ boardSort }),
      setBoardShowCompleted: (boardShowCompleted) => set({ boardShowCompleted }),
      setBoardDensity: (boardDensity) => set({ boardDensity }),

      setBoardFilters: (boardFilters) => set({ boardFilters }),
      clearBoardFilters: () => set({ boardFilters: EMPTY_FILTERS }),
    }),
    {
      name: "tackly:settings",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: migrateSettings,
      merge: (saved, current) => {
        if (!saved || typeof saved !== "object") return current;
        const data = saved as Partial<SettingsStoreState>;
        return {
          ...current,
          ...data,
          localBackground: data.localBackground ? normalizeBackground(data.localBackground) : null,
          notePeekMode: NOTE_PEEK_MODES.find((mode) => mode === data.notePeekMode) ?? current.notePeekMode,
        };
      },
      // The server cannot read localStorage; `useThemeSync` rehydrates in an
      // effect so the first paint is the server-rendered default theme.
      skipHydration: true,
    },
  ),
);

/** The modes the ten retired presets were built in, by id. */
const RETIRED_THEME_MODES: Readonly<Record<string, ThemeMode>> = {
  "workspace-light": "light",
  "cozy-dark": "dark",
  minimal: "light",
  dark: "dark",
  nature: "dark",
  pastel: "light",
  retro: "dark",
  cyber: "dark",
  "yellow-black": "dark",
  "green-beige": "light",
  "beige-blue": "light",
};

/**
 * Carries a saved v1 preset over to the two-mode world.
 *
 * Dropping `themeId` without this would silently flip anyone who had picked a
 * dark preset back to light on their next visit. The preset itself is gone —
 * that was the point — but which *mode* they were working in is still a real
 * preference, so it is the one thing worth keeping.
 */
function migrateSettings(persisted: unknown, version: number): unknown {
  if (version >= 2 || persisted === null || typeof persisted !== "object") {
    return persisted;
  }

  const { themeId, ...rest } = persisted as Record<string, unknown>;
  if (typeof themeId !== "string") return rest;

  return { ...rest, themeMode: RETIRED_THEME_MODES[themeId] ?? DEFAULT_THEME_MODE };
}
