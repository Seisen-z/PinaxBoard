import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_BACKGROUND, backgroundToCssVariables, getTheme } from "@/config/themes";
import { useSettingsStore } from "@/stores/settings-store";
import { EFFECTS, GRADIENTS, PATTERNS, BUILTIN_BACKGROUNDS, normalizeBackground, customGradient, gradientControls, resolvedBackground } from "./settings";

describe("background settings", () => {
  it("repairs invalid and partial data without losing defaults", () => {
    expect(normalizeBackground(null)).toEqual(DEFAULT_BACKGROUND);
    expect(normalizeBackground({ blur: 8 }).blur).toBe(8);
    expect(normalizeBackground({ type: "video", source: "javascript:bad", blur: NaN, tint: "invalid" })).toEqual(DEFAULT_BACKGROUND);
  });
  it("clamps every numeric effect and rejects non-finite values", () => {
    for (const effect of EFFECTS) {
      expect(normalizeBackground({ [effect.key]: 99 })[effect.key]).toBe(effect.max);
      expect(normalizeBackground({ [effect.key]: -99 })[effect.key]).toBe(effect.min);
      expect(normalizeBackground({ [effect.key]: Infinity })[effect.key]).toBe(DEFAULT_BACKGROUND[effect.key]);
    }
  });
  it("accepts all built-in images, gradients and patterns", () => {
    for (const image of BUILTIN_BACKGROUNDS) {
      const asset = readFileSync(join(process.cwd(), "public", image.source.slice(1)), "utf-8");
      const svg = new DOMParser().parseFromString(asset, "image/svg+xml");
      expect(svg.querySelector("parsererror")).toBeNull();
      expect(svg.documentElement.getAttribute("viewBox")).toBe("0 0 1600 1000");
    }
    for (const [type, items] of [["image", BUILTIN_BACKGROUNDS], ["gradient", GRADIENTS], ["pattern", PATTERNS]] as const) {
      for (const item of items) expect(normalizeBackground({ type, source: item.source }).source).toBe(item.source);
    }
  });
  it("renders solid colors as color, never as background-image", () => {
    const css = backgroundToCssVariables(normalizeBackground({ type: "solid", source: "#123456" }));
    expect(css["--bg-color"]).toBe("#123456");
    expect(css["--bg-image"]).toBe("none");
  });
  it("wraps image sources as quoted CSS URLs without modifying stored values", () => {
    const note = normalizeBackground({ type: "image", source: "https://example.test/bg.png" });
    expect(backgroundToCssVariables(note)["--bg-image"]).toBe('url("https://example.test/bg.png")');
    expect(note.source).toBe("https://example.test/bg.png");
  });
  it("rejects executable URLs and embedded URLs in CSS gradients", () => {
    expect(normalizeBackground({ type: "image", source: "javascript:alert(1)" })).toEqual(DEFAULT_BACKGROUND);
    expect(normalizeBackground({ type: "gradient", source: "linear-gradient(red, url(https://x.test))" }).source).toBe(DEFAULT_BACKGROUND.source);
  });
  it("builds and restores editable custom gradients", () => {
    const source = customGradient("#123456", "#abcdef", 90);
    expect(gradientControls(source)).toEqual({ start: "#123456", end: "#abcdef", angle: 90 });
    expect(customGradient("#123456", "#abcdef", 999)).toContain("360deg");
    expect(() => customGradient("invalid", "#abcdef", 90)).toThrow();
  });
  it("follows light/dark for empty and reset backgrounds but retains custom choices", () => {
    const dark = getTheme("dark").background;
    expect(resolvedBackground(null, dark)).toEqual(dark);
    expect(resolvedBackground(DEFAULT_BACKGROUND, dark)).toEqual(dark);
    expect(resolvedBackground({ ...DEFAULT_BACKGROUND, source: null, blur: 3 }, dark)).toEqual({ ...DEFAULT_BACKGROUND, source: dark.source, blur: 3 });
    const solid = normalizeBackground({ type: "solid", source: "#123456" });
    expect(resolvedBackground(solid, dark)).toBe(solid);
  });
  it("persists local backgrounds and theme through rehydration", async () => {
    const settings = normalizeBackground({ type: "solid", source: "#123456", grain: 0.2 });
    useSettingsStore.getState().setThemeMode("dark");
    useSettingsStore.getState().setLocalBackground(settings);
    const raw = localStorage.getItem("tackly:settings");
    expect(raw).toContain("#123456");
    useSettingsStore.setState({ localBackground: null, themeMode: "light" });
    localStorage.setItem("tackly:settings", raw ?? "");
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().localBackground).toEqual(settings);
    expect(useSettingsStore.getState().themeMode).toBe("dark");
  });
  it("does not publish a false saved state if browser storage rejects the write", () => {
    const before = useSettingsStore.getState().localBackground;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
    try {
      expect(() => useSettingsStore.getState().setLocalBackground(DEFAULT_BACKGROUND)).toThrow();
      expect(useSettingsStore.getState().localBackground).toBe(before);
    } finally { spy.mockRestore(); }
  });
});
