import { describe, expect, it } from "vitest";

import { resolveNoteAppearance } from "@/lib/note-appearance";
import { clamp, cn, createId, formatShortDate } from "@/lib/utils";

describe("cn", () => {
  it("resolves conflicting Tailwind classes in favour of the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });
});

describe("clamp", () => {
  it("bounds the value at both ends", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("returns the minimum for NaN rather than propagating it", () => {
    // A NaN zoom would otherwise poison every later transform.
    expect(clamp(Number.NaN, 0.25, 3)).toBe(0.25);
  });
});

describe("formatShortDate", () => {
  it("formats an ISO date as month and day", () => {
    expect(formatShortDate("2026-09-28T12:00:00.000Z")).toBe("Sep 28");
  });

  it("returns an empty string for missing or unparseable input", () => {
    expect(formatShortDate(null)).toBe("");
    expect(formatShortDate(undefined)).toBe("");
    expect(formatShortDate("")).toBe("");
    expect(formatShortDate("not a date")).toBe("");
  });
});

describe("createId", () => {
  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 200 }, createId));
    expect(ids.size).toBe(200);
  });
});

describe("resolveNoteAppearance", () => {
  it("maps a color to its paper surface, ink and edge tokens", () => {
    const resolved = resolveNoteAppearance({
      color: "yellow",
      style: "sticky",
      coverUrl: null,
    });

    expect(resolved.paperStyle.backgroundColor).toBe("var(--paper-yellow)");
    expect(resolved.paperStyle.color).toBe("var(--paper-yellow-ink)");
    expect(resolved.paperStyle.borderColor).toBe("var(--paper-yellow-edge)");
  });

  it("lets a style that pins its own paper override the stored color", () => {
    const resolved = resolveNoteAppearance({
      color: "yellow",
      style: "kraft",
      coverUrl: null,
    });

    expect(resolved.color.id).toBe("kraft");
  });

  it("supplies the rule color consumed by the lined and grid textures", () => {
    const resolved = resolveNoteAppearance({
      color: "blue",
      style: "lined",
      coverUrl: null,
    });

    expect(resolved.textureClass).toBe("tk-paper-lined");
    expect(resolved.paperStyle["--paper-rule"]).toContain("--paper-blue-edge");
  });

  it("falls back to defaults for values persisted by a newer client", () => {
    const resolved = resolveNoteAppearance({
      color: "neon" as never,
      style: "papyrus" as never,
      coverUrl: null,
    });

    expect(resolved.style.id).toBe("sticky");
    expect(resolved.color.id).toBe("cream");
  });
});
