import { describe, expect, it } from "vitest";

import { NOTE_STYLE_DEFINITIONS } from "@/config/note-styles";
import { NOTE_STYLES } from "@/types/note";

import { NOTE_PEEK_MODES, SETTINGS_DEFAULTS, useSettingsStore } from "./settings-store";

describe("how notes open", () => {
  it("defaults to a side peek and offers three modes", () => {
    expect(SETTINGS_DEFAULTS.notePeekMode).toBe("side");
    expect([...NOTE_PEEK_MODES]).toEqual(["side", "center", "full"]);
  });

  it("changes mode through the store", () => {
    useSettingsStore.getState().setNotePeekMode("full");
    expect(useSettingsStore.getState().notePeekMode).toBe("full");
  });
});

describe("note styles", () => {
  it("has a definition for every style id and no retired designs", () => {
    const defined = NOTE_STYLE_DEFINITIONS.map((style) => style.id).sort();
    expect(defined).toEqual([...NOTE_STYLES].sort());
    expect(NOTE_STYLES as readonly string[]).not.toContain("cloud");
  });

  it("marks every decorated design with its design class", () => {
    for (const style of NOTE_STYLE_DEFINITIONS.filter((item) => item.group === "design")) {
      expect(style.textureClass).toContain(`tk-design-${style.id}`);
    }
  });
});
