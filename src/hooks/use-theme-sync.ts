"use client";

import { useEffect } from "react";

import { applyTheme, getTheme, type ThemeDefinition } from "@/config/themes";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * Keeps `<html>` in step with the selected mode, and returns it so the caller
 * can drive the background layer from it.
 *
 * Restores the saved choice once on mount. Doing that in an effect rather than
 * during render is deliberate: the server has no `localStorage`, so reading it
 * while rendering would produce markup that disagrees with the client.
 *
 * @example
 * const theme = useThemeSync();
 * <AppBackground settings={theme.background} />
 */
export function useThemeSync(): ThemeDefinition {
  const themeMode = useSettingsStore((state) => state.themeMode);

  useEffect(() => {
    void useSettingsStore.persist.rehydrate();
  }, []);

  const theme = getTheme(themeMode);

  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  return theme;
}
