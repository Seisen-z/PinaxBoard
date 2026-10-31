import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { DEFAULT_THEME_MODE, THEMES, applyTheme, getTheme } from "@/config/themes";
import { useSettingsStore } from "@/stores/settings-store";

beforeEach(() => {
  useSettingsStore.setState({ themeMode: DEFAULT_THEME_MODE });
  document.documentElement.removeAttribute("data-theme");
});

describe("light/dark toggle", () => {
  it("offers exactly two modes and nothing to pick between", () => {
    // The ten-preset picker is gone; a third mode would mean the toggle is
    // the wrong control again.
    expect(THEMES.map((theme) => theme.id)).toEqual(["light", "dark"]);
  });

  it("names the mode it will switch to, not the one in use", async () => {
    render(<ThemeToggle />);

    // Starting in light, so the button offers dark.
    const button = screen.getByRole("button", { name: "Switch to dark mode" });

    await userEvent.click(button);

    expect(useSettingsStore.getState().themeMode).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toBeInTheDocument();
  });

  it("switches back", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    await userEvent.click(screen.getByRole("button", { name: "Switch to light mode" }));

    expect(useSettingsStore.getState().themeMode).toBe("light");
  });
});

describe("applying a mode", () => {
  it("sets data-theme and writes no inline variables", () => {
    const root = document.createElement("html");

    applyTheme(root, getTheme("dark"));
    expect(root.dataset.theme).toBe("dark");

    applyTheme(root, getTheme("light"));
    expect(root.dataset.theme).toBe("light");

    // The presets used to write their overrides inline, and had to clear the
    // previous set to switch. Both modes now live in tokens.css, so an inline
    // property here would be a colour that no stylesheet can override.
    expect(root.getAttribute("style")).toBeNull();
  });

  it("falls back to the default for an unknown or retired id", () => {
    expect(getTheme("yellow-black").id).toBe(DEFAULT_THEME_MODE);
    expect(getTheme("no-such-theme").id).toBe(DEFAULT_THEME_MODE);
  });
});

describe("neutral discipline", () => {
  /**
   * Pure black and pure white are banned: every neutral carries a slight warm
   * or cool cast so surfaces read as material rather than as a void.
   */
  const PURE = [
    /hsl\(\s*\d+\s+0%\s+100%\s*\)/,
    /hsl\(\s*\d+\s+\d+%\s+100%\s*\)/,
    /hsl\(\s*0\s+0%\s+0%\s*\)/,
    /#fff(?![0-9a-f])/i,
    /#ffffff/i,
    /#000(?![0-9a-f])/i,
    /#000000/i,
    /\brgb\(\s*255\s+255\s+255\s*[/)]/,
    /\brgb\(\s*0\s+0\s+0\s*[/)]/,
  ];

  it("keeps every mode's background free of pure black or white", () => {
    for (const theme of THEMES) {
      const source = theme.background.source ?? "";

      for (const pattern of PURE) {
        expect(
          pattern.test(source),
          `${theme.id} uses a pure neutral matching ${pattern}`,
        ).toBe(false);
      }
    }
  });
});
