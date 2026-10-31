import { describe, expect, it } from "vitest";

import { NOTE_COLORS } from "@/types/note";
import { isRichDocument } from "@/lib/tiptap/document";
import { useNoteStore } from "@/stores/note-store";

import { NOTE_TEMPLATES, findNoteTemplate, templateExcerpt } from "./templates";

describe("note templates", () => {
  it("have unique ids, valid colours and rich documents", () => {
    const ids = NOTE_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const template of NOTE_TEMPLATES) {
      expect(NOTE_COLORS).toContain(template.color);
      expect(isRichDocument(template.content)).toBe(true);
      expect(template.title.length).toBeGreaterThan(0);
    }
  });

  it("can be found by id", () => {
    expect(findNoteTemplate("meeting")?.label).toBe("Meeting notes");
    expect(findNoteTemplate("missing")).toBeUndefined();
  });

  it("creates a note with the template's title, body, excerpt and colour", () => {
    const template = findNoteTemplate("meeting")!;
    const id = useNoteStore.getState().addNote("lane-todo", { template });
    const note = useNoteStore.getState().notes.find((candidate) => candidate.id === id)!;

    expect(note.title).toBe("Meeting notes");
    expect(note.appearance.color).toBe("blue");
    expect(note.excerpt).toBe(templateExcerpt(template));
    expect(note.excerpt).toContain("Agenda");
  });

  it("gives each note its own copy of the document", () => {
    const template = findNoteTemplate("checklist")!;
    const first = useNoteStore.getState().addNote("lane-todo", { template });
    const second = useNoteStore.getState().addNote("lane-todo", { template });
    const notes = useNoteStore.getState().notes;
    const a = notes.find((note) => note.id === first)!;
    const b = notes.find((note) => note.id === second)!;

    expect(a.content).not.toBe(b.content);
    expect(a.content).not.toBe(template.content);
  });
});
