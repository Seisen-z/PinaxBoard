import { patternSize } from "@/config/background-presets";
import type { BackgroundSettings } from "@/types/board";

/**
 * Light and dark mode.
 *
 * Tackly used to ship ten presets, including three duo-tone palettes. The user
 * removed that choice: there are now two modes and nothing else to pick (see
 * "Decisions made" in docs/HANDOFF.md, which supersedes FRONTEND_SPEC.md §34
 * and PRODUCT_SPEC.md → "Theme Presets").
 *
 * The consequence for this file is that it holds almost nothing. A mode is a
 * `data-theme` value plus a background; every colour lives in
 * `src/styles/tokens.css`, where `:root` is dark and `:root[data-theme="light"]`
 * overrides it. Components never branch on the mode — they read tokens.
 *
 * Backgrounds are flat washes rather than remote images, so the shell renders
 * identically offline and in tests. Uploaded and built-in images are offered by
 * Milestone 19; video remains later work.
 */

export type ThemeMode = "light" | "dark";

export const THEME_MODES = ["light", "dark"] as const satisfies readonly ThemeMode[];

export interface ThemeDefinition {
  id: ThemeMode;
  label: string;
  mode: ThemeMode;
  background: BackgroundSettings;
}

/** Shared background geometry; only the gradient differs per mode. */
const FLAT_BACKGROUND = {
  type: "gradient",
  blur: 0,
  brightness: 1,
  saturation: 1,
  contrast: 1,
  opacity: 1,
  overlay: 0,
  vignette: 0,
  grain: 0,
  tint: null,
} as const satisfies Omit<BackgroundSettings, "source">;

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: "light",
    label: "Light",
    mode: "light",
    background: {
      ...FLAT_BACKGROUND,
      source: "linear-gradient(180deg, #f7f5f1 0%, #f2efe9 100%)",
    },
  },
  {
    id: "dark",
    label: "Dark",
    mode: "dark",
    background: {
      ...FLAT_BACKGROUND,
      source: "linear-gradient(180deg, #141210 0%, #0d0c0b 100%)",
    },
  },
] as const;

export const DEFAULT_THEME_MODE: ThemeMode = "light";

/** The background the server renders before `localStorage` has been read. */
export const DEFAULT_BACKGROUND: BackgroundSettings =
  THEMES[0]?.background ?? {
    ...FLAT_BACKGROUND,
    source: "linear-gradient(180deg, #f7f5f1 0%, #f2efe9 100%)",
  };

const THEME_BY_ID = new Map<string, ThemeDefinition>(
  THEMES.map((theme) => [theme.id, theme]),
);

/** The mode a stored value names, falling back to the default. */
export function getTheme(id: string): ThemeDefinition {
  const theme = THEME_BY_ID.get(id);
  if (theme) return theme;

  return THEME_BY_ID.get(DEFAULT_THEME_MODE) as ThemeDefinition;
}

/** The other mode — what a toggle switches to. */
export function oppositeMode(mode: ThemeMode): ThemeMode {
  return mode === "dark" ? "light" : "dark";
}

/**
 * Applies a mode by setting `data-theme` on an element (normally
 * `document.documentElement`).
 *
 * Nothing is written inline any more. The preset system wrote each theme's
 * variable overrides onto the element and had to clear the previous set first;
 * with two modes the overrides live in the stylesheet, so switching is one
 * attribute and the browser recomputes the rest.
 *
 * @param root  The element to theme; pass `document.documentElement`.
 * @param theme The mode to apply.
 */
export function applyTheme(root: HTMLElement, theme: ThemeDefinition): void {
  root.dataset.theme = theme.mode;
}

/**
 * Maps background settings onto the custom properties consumed by
 * `.tk-background-layer`. Returned as a style object so the caller can apply
 * it declaratively.
 */
export function backgroundToCssVariables(
  background: BackgroundSettings,
): Record<string, string> {
  return {
    "--bg-image": background.type === "solid" ? "none"
      : background.type === "image" ? (background.source ? `url(${JSON.stringify(background.source)})` : "none")
      : background.source ?? "none",
    "--bg-size": background.type === "pattern" ? patternSize(background.source) : "cover",
    "--bg-color": background.type === "solid" ? background.source ?? "transparent" : "transparent",
    "--bg-blur": `${background.blur}px`,
    "--bg-brightness": String(background.brightness),
    "--bg-saturation": String(background.saturation),
    "--bg-contrast": String(background.contrast),
    "--bg-opacity": String(background.opacity),
    "--bg-overlay": String(background.overlay),
    "--bg-vignette": String(background.vignette),
    "--bg-grain": String(background.grain),
    "--bg-tint": background.tint ?? "transparent",
  };
}
