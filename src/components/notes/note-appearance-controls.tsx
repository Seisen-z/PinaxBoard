"use client";

import { NoteColorPicker } from "@/components/notes/note-color-picker";
import { NoteStylePicker } from "@/components/notes/note-style-picker";
import { ClayButton } from "@/components/ui/clay-button";
import { getNoteStyle, NOTE_SIZE_PRESETS } from "@/config/note-styles";
import { useNoteStore } from "@/stores/note-store";
import { NOTE_SIZES, type Note } from "@/types/note";
import type { ReactNode } from "react";

/** Existing-note customization; never part of the blank-note creation flow. */
export function NoteAppearanceControls({ note, children }: { note: Note; children?: ReactNode }) {
  const setColor = useNoteStore((state) => state.setColor);
  const setStyle = useNoteStore((state) => state.setStyle);
  const setTransform = useNoteStore((state) => state.setTransform);
  const togglePin = useNoteStore((state) => state.togglePin);
  const toggleLock = useNoteStore((state) => state.toggleLock);
  const forcedColor = getNoteStyle(note.appearance.style).forcedColor;
  const size = NOTE_SIZES.find((id) => {
    const preset = NOTE_SIZE_PRESETS[id];
    return preset.width === note.transform.width && preset.height === note.transform.height;
  }) ?? "custom";

  return (
    <details className="shrink-0 rounded-[var(--radius-sm)] border border-current/20 p-3">
      <summary className="cursor-pointer text-sm font-medium">Note appearance</summary>
      <div className="mt-3 flex flex-col gap-3">
        <fieldset disabled={note.locked} className="grid gap-3 sm:grid-cols-2">
          <div>
            <fieldset disabled={Boolean(forcedColor)}>
              <legend className="text-sm">Paper color</legend>
              <NoteColorPicker value={forcedColor ?? note.appearance.color} onChange={(color) => setColor(note.id, color)} />
            </fieldset>
            {forcedColor ? <p className="text-xs text-current/60">This paper style sets its own color. Choose another style to change color.</p> : null}
            <label className="mt-3 flex flex-col gap-1 text-sm">
              Canvas size
              <select aria-label="Canvas size" value={size}
                className="rounded-[var(--radius-sm)] border border-current/20 bg-surface px-2 py-1 text-foreground"
                onChange={(event) => {
                  const preset = NOTE_SIZES.find((id) => id === event.target.value);
                  if (preset) setTransform(note.id, NOTE_SIZE_PRESETS[preset]);
                }}>
                {size === "custom" ? <option value="custom">Custom ({note.transform.width} ? {note.transform.height})</option> : null}
                {NOTE_SIZES.map((id) => <option key={id} value={id}>{id[0]?.toUpperCase()}{id.slice(1)} ({NOTE_SIZE_PRESETS[id].width} ? {NOTE_SIZE_PRESETS[id].height})</option>)}
              </select>
            </label>
            <p className="mt-1 text-xs text-current/60">Canvas footprint only; other views keep their layout.</p>
          </div>
          <div>
            <p className="text-sm">Paper style &amp; texture</p>
            <NoteStylePicker value={note.appearance.style} color={note.appearance.color} onChange={(style) => setStyle(note.id, style)} />
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <ClayButton size="sm" variant="ghost" aria-pressed={note.pinned} onClick={() => togglePin(note.id)}>{note.pinned ? "Unpin note" : "Pin note"}</ClayButton>
          <ClayButton size="sm" variant="ghost" aria-pressed={note.locked} onClick={() => toggleLock(note.id)}>{note.locked ? "Unlock note" : "Lock note"}</ClayButton>
        </div>
        {children}
      </div>
    </details>
  );
}
