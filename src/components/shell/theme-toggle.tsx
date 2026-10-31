"use client";

import { Moon, Sun } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { oppositeMode } from "@/config/themes";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * The light/dark toggle.
 *
 * This replaced a ten-preset picker. With two modes a menu is the wrong shape:
 * it costs a click to reach a list whose every row but one is the thing you
 * already have. A toggle states where you will land, which is also what makes
 * it announce correctly — the label is the destination, not the current state,
 * so a screen reader user hears the action rather than having to infer it.
 */
export function ThemeToggle() {
  const mode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);

  const next = oppositeMode(mode);

  return (
    <IconButton
      label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
      icon={mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      variant="ghost"
      size="sm"
      onClick={() => setThemeMode(next)}
    />
  );
}
