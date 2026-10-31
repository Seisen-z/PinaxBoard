import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { NOTE_COLOR_DEFINITIONS } from "@/config/note-styles";
import { DEFAULT_LANE_SEEDS } from "@/config/lanes";
import { PRIORITY_DEFINITIONS } from "@/config/priorities";

/**
 * Foundation-layer tests: the design tokens exist and are defined exactly once.
 *
 * These read the stylesheet as text rather than mounting it, because jsdom does
 * not compute custom properties from an imported CSS file. The value here is
 * catching a token that a config module references but `tokens.css` never
 * defines — a mismatch that renders as an invisible or default-colored element
 * rather than an error.
 */

const TOKENS_CSS = readFileSync(
  join(process.cwd(), "src/styles/tokens.css"),
  "utf8",
);

/** Collects every `--name:` declaration in the `:root` blocks. */
function declaredTokens(css: string): Set<string> {
  const names = new Set<string>();
  const pattern = /^\s*(--[a-z0-9-]+)\s*:/gim;

  let match = pattern.exec(css);
  while (match !== null) {
    if (match[1]) names.add(match[1]);
    match = pattern.exec(css);
  }

  return names;
}

const DECLARED = declaredTokens(TOKENS_CSS);

describe("design tokens", () => {
  it("keeps portalled menus above sidebar headers and dialog overlays", () => {
    const layer = (name: string) => {
      const value = TOKENS_CSS.match(new RegExp(`--z-${name}:\\s*(\\d+)`))?.[1];
      expect(value, `missing z-index token: ${name}`).toBeDefined();
      return Number(value);
    };
    expect(layer("menu")).toBeGreaterThan(layer("header"));
    expect(layer("menu")).toBeGreaterThan(layer("overlay"));
  });

  it("defines the core surface and semantic colors from FRONTEND_SPEC §6", () => {
    const required = [
      "--background",
      "--foreground",
      "--surface",
      "--surface-raised",
      "--surface-panel",
      "--surface-panel-soft",
      "--border",
      "--border-strong",
      "--muted",
      "--muted-foreground",
      "--primary",
      "--primary-foreground",
      "--success",
      "--warning",
      "--danger",
      "--info",
    ];

    for (const token of required) {
      expect(DECLARED, `missing token ${token}`).toContain(token);
    }
  });

  it("defines the full radius scale from FRONTEND_SPEC §6", () => {
    for (const token of [
      "--radius-sm",
      "--radius-md",
      "--radius-lg",
      "--radius-xl",
      "--radius-2xl",
    ]) {
      expect(DECLARED).toContain(token);
    }
  });

  it("keeps the note radius inside the 12–18px band from FRONTEND_SPEC §14", () => {
    const match = /--radius-note:\s*(\d+)px/.exec(TOKENS_CSS);
    expect(match).not.toBeNull();

    const radius = Number(match?.[1]);
    expect(radius).toBeGreaterThanOrEqual(12);
    expect(radius).toBeLessThanOrEqual(18);
  });

  it("keeps completed-note opacity inside the 78–90% band from FRONTEND_SPEC §19", () => {
    const match = /--note-completed-opacity:\s*([\d.]+)/.exec(TOKENS_CSS);
    expect(match).not.toBeNull();

    const opacity = Number(match?.[1]);
    expect(opacity).toBeGreaterThanOrEqual(0.78);
    expect(opacity).toBeLessThanOrEqual(0.9);
  });

  it("defines every claymorphism token from FRONTEND_SPEC §7", () => {
    for (const token of [
      "--clay-shadow-outer",
      "--clay-shadow-highlight",
      "--clay-shadow-depth",
      "--clay-shadow-pressed",
    ]) {
      expect(DECLARED).toContain(token);
    }
  });

  it("defines a paper surface, ink and edge for every note color", () => {
    for (const color of NOTE_COLOR_DEFINITIONS) {
      expect(DECLARED, `${color.id} surface`).toContain(color.surfaceVar);
      expect(DECLARED, `${color.id} ink`).toContain(color.inkVar);
      expect(DECLARED, `${color.id} edge`).toContain(color.edgeVar);
    }
  });

  it("defines an accent color for every seeded column", () => {
    for (const seed of DEFAULT_LANE_SEEDS) {
      expect(DECLARED, `${seed.id} accent`).toContain(seed.colorVar);
    }
  });

  it("defines a color for every priority level", () => {
    for (const priority of PRIORITY_DEFINITIONS) {
      expect(DECLARED, `${priority.id} color`).toContain(priority.colorVar);
    }
  });

  it("keeps lane widths in the 280–360px range from FRONTEND_SPEC §9", () => {
    expect(TOKENS_CSS).toMatch(/--lane-min-width:\s*280px/);
    expect(TOKENS_CSS).toMatch(/--lane-max-width:\s*360px/);
  });

  /**
   * FRONTEND_SPEC §10 sized the header at 70–80px because it carried the
   * primary navigation. That moved to the sidebar, so the bar above the
   * surface now only names a location — and two slim bands (breadcrumb plus
   * toolbar) must still cost less than the one tall header they replaced,
   * or the redesign has simply taken height from the board.
   */
  it("keeps the two chrome bands no taller than the header they replaced", () => {
    const header = Number(/--header-height:\s*(\d+)px/.exec(TOKENS_CSS)?.[1]);
    const toolbar = Number(/--toolbar-height:\s*(\d+)px/.exec(TOKENS_CSS)?.[1]);

    expect(header).toBeGreaterThan(0);
    expect(toolbar).toBeGreaterThan(0);
    expect(header + toolbar).toBeLessThanOrEqual(110);
  });

  it("defines the sidebar width and the column tint ratios", () => {
    for (const token of [
      "--sidebar-width",
      "--surface-sidebar",
      "--lane-tint-panel",
      "--lane-tint-header",
      "--lane-gap",
    ]) {
      expect(DECLARED, `missing token ${token}`).toContain(token);
    }
  });
});

describe("neutral discipline", () => {
  /**
   * Pure black and pure white are banned across the token layer: every neutral
   * carries a slight warm cast, including shadow and highlight alphas, so
   * surfaces read as material rather than as a void.
   */
  it.each([
    ["pure white (hsl)", /hsl\([^)]*\s100%\s*\)/],
    ["pure black (hsl)", /hsl\(\s*0\s+0%\s+0%\s*\)/],
    ["pure white (rgb)", /\brgb\(\s*255\s+255\s+255\s*[/)]/],
    ["pure black (rgb)", /\brgb\(\s*0\s+0\s+0\s*[/)]/],
    ["pure white (hex)", /#ffffff\b|#fff\b/i],
    ["pure black (hex)", /#000000\b|#000\b/i],
  ])("contains no %s", (_label, pattern) => {
    expect(pattern.test(TOKENS_CSS)).toBe(false);
  });

  it("keeps a note's body height capped so one card cannot fill a lane", () => {
    const match = /--note-content-max-height:\s*(\d+)px/.exec(TOKENS_CSS);
    expect(match).not.toBeNull();

    const height = Number(match?.[1]);
    expect(height).toBeGreaterThan(0);
    expect(height).toBeLessThanOrEqual(320);
  });
});

describe("no pure neutrals in components", () => {
  /**
   * The ban on pure black and white applies to components too, not only to the
   * token layer.
   *
   * This exists because `surface-panel.tsx` carried
   * `shadow-[0_2px_8px_rgb(0_0_0/0.18)]` for eight milestones: the token test
   * above only reads `tokens.css`, so a literal written straight into a
   * component was invisible to it. That one also failed on its own terms — a
   * pure-black shadow is invisible against a near-black board.
   */
  // Filtered in JS rather than through glob's `ignore`: on Windows the matched
  // paths come back with backslashes, which never match a "/" pattern — the
  // ignore list silently does nothing and the tests flag themselves.
  const SOURCE_FILES = globSync("src/**/*.{ts,tsx}", { cwd: process.cwd() })
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => !/\.test\.tsx?$/.test(file) && !file.startsWith("src/test/"));

  const PURE_VALUES = [
    ["pure black (rgb)", /\brgb\(\s*0[\s_]+0[\s_]+0\s*[/)]/],
    ["pure white (rgb)", /\brgb\(\s*255[\s_]+255[\s_]+255\s*[/)]/],
    ["pure black (hex)", /#000000\b|#000(?![0-9a-f])/i],
    ["pure white (hex)", /#ffffff\b|#fff(?![0-9a-f])/i],
  ] as const;

  it("finds source files to check", () => {
    // A glob that silently matches nothing would make this suite vacuously green.
    expect(SOURCE_FILES.length).toBeGreaterThan(50);
  });

  it.each(PURE_VALUES)("uses no %s", (label, pattern) => {
    const offenders = SOURCE_FILES.filter((file) =>
      pattern.test(readFileSync(join(process.cwd(), file), "utf8")),
    );

    expect(offenders, `${label} in: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("token discipline", () => {
  it("applies filters only to the background layer (FRONTEND_SPEC §53)", () => {
    const globals = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );

    // No foreground surface may frost itself.
    expect(globals).not.toMatch(/backdrop-filter/i);

    // The single permitted `filter` declaration belongs to the background layer.
    const filterRules = globals.match(/^\s*filter:/gim) ?? [];
    expect(filterRules).toHaveLength(1);
    expect(globals).toMatch(/\.tk-background-layer\s*\{[^}]*filter:/);
  });
});
