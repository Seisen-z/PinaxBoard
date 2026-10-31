import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTE_COLOR,
  DEFAULT_NOTE_STYLE,
  NOTE_COLOR_DEFINITIONS,
  NOTE_SIZE_PRESETS,
  NOTE_STYLE_DEFINITIONS,
  getNoteColor,
  getNoteStyle,
} from "@/config/note-styles";
import {
  DEFAULT_LANE_SEEDS,
  LANE_COLOR_OPTIONS,
  MAX_LANES,
} from "@/config/lanes";
import { PRIORITY_DEFINITIONS, getPriority } from "@/config/priorities";
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_STOPS,
} from "@/config/layouts";
import { DEFAULT_THEME_MODE, THEMES, applyTheme, getTheme } from "@/config/themes";
import { NOTE_COLORS, NOTE_SIZES, NOTE_STYLES } from "@/types/note";
import { PRIORITIES } from "@/types/common";

describe("lane seeds", () => {
  it("ships five familiar starting columns", () => {
    expect(DEFAULT_LANE_SEEDS.map((seed) => seed.name)).toEqual([
      "To Do",
      "In Progress",
      "Review",
      "Done",
      "Ideas",
    ]);
  });

  it("gives every seed a distinct id", () => {
    const ids = DEFAULT_LANE_SEEDS.map((seed) => seed.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves room to add columns beyond the seeds", () => {
    // The seeds are a starting point, not a ceiling — the whole reason lanes
    // are records rather than an enum.
    expect(MAX_LANES).toBeGreaterThan(DEFAULT_LANE_SEEDS.length);
  });

  it("offers a colour palette with no duplicates", () => {
    const values = LANE_COLOR_OPTIONS.map((option) => option.value);
    expect(new Set(values).size).toBe(values.length);
    expect(values.length).toBeGreaterThanOrEqual(5);
  });
});

describe("priorities", () => {
  it("covers every Priority with a strictly increasing rank", () => {
    expect(PRIORITY_DEFINITIONS.map((p) => p.id)).toEqual([...PRIORITIES]);

    const ranks = PRIORITY_DEFINITIONS.map((p) => p.rank);
    for (let index = 1; index < ranks.length; index += 1) {
      expect(ranks[index]).toBeGreaterThan(ranks[index - 1] as number);
    }
  });

  it("falls back to None on an unknown priority", () => {
    expect(getPriority("critical" as never).id).toBe("none");
  });
});

describe("note appearance catalogue", () => {
  it("covers every note color and style id", () => {
    expect(NOTE_COLOR_DEFINITIONS.map((c) => c.id).sort()).toEqual(
      [...NOTE_COLORS].sort(),
    );
    expect(NOTE_STYLE_DEFINITIONS.map((s) => s.id).sort()).toEqual(
      [...NOTE_STYLES].sort(),
    );
  });

  it("falls back to the defaults on unknown ids", () => {
    expect(getNoteColor("neon" as never).id).toBe(DEFAULT_NOTE_COLOR);
    expect(getNoteStyle("papyrus" as never).id).toBe(DEFAULT_NOTE_STYLE);
  });

  it("defines the size presets from FRONTEND_SPEC §14", () => {
    expect(Object.keys(NOTE_SIZE_PRESETS).sort()).toEqual([...NOTE_SIZES].sort());
    expect(NOTE_SIZE_PRESETS.small).toEqual({ width: 220, height: 180 });
    expect(NOTE_SIZE_PRESETS.medium).toEqual({ width: 280, height: 240 });
    expect(NOTE_SIZE_PRESETS.large).toEqual({ width: 340, height: 320 });
    expect(NOTE_SIZE_PRESETS.wide).toEqual({ width: 420, height: 260 });
    expect(NOTE_SIZE_PRESETS.tall).toEqual({ width: 280, height: 420 });
  });
});

describe("zoom configuration", () => {
  it("keeps the stops ascending and inside the zoom bounds", () => {
    for (let index = 1; index < ZOOM_STOPS.length; index += 1) {
      expect(ZOOM_STOPS[index]).toBeGreaterThan(ZOOM_STOPS[index - 1] as number);
    }

    expect(Math.min(...ZOOM_STOPS)).toBeGreaterThanOrEqual(MIN_ZOOM);
    expect(Math.max(...ZOOM_STOPS)).toBeLessThanOrEqual(MAX_ZOOM);
    expect(ZOOM_STOPS).toContain(DEFAULT_ZOOM);
  });
});

describe("colour modes", () => {
  it("resolves the default mode and falls back on unknown ids", () => {
    expect(getTheme(DEFAULT_THEME_MODE).id).toBe(DEFAULT_THEME_MODE);
    expect(getTheme("no-such-theme").id).toBe(DEFAULT_THEME_MODE);
  });

  it("gives every mode a background source", () => {
    for (const theme of THEMES) {
      expect(theme.background.source, `${theme.id} background`).toBeTruthy();
    }
  });

  it("names each mode after itself, so data-theme and the id cannot diverge", () => {
    for (const theme of THEMES) {
      expect(theme.mode).toBe(theme.id);
    }
  });

  it("switches the root element's mode", () => {
    const root = document.createElement("html");

    applyTheme(root, getTheme("dark"));
    expect(root.dataset.theme).toBe("dark");

    applyTheme(root, getTheme("light"));
    expect(root.dataset.theme).toBe("light");
  });
});
