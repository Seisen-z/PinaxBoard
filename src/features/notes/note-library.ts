import type { Note } from "@/types/note";

export function libraryNotes(notes: readonly Note[], mode: "inbox" | "mine" | "all", actorId: string, search: string): Note[] {
  const term = search.trim().toLocaleLowerCase();
  return notes.filter(note => !note.archived && !note.deletedAt &&
    (mode === "inbox" ? note.inbox === true : mode === "all" || (note.createdBy ?? note.ownerId) === actorId) &&
    (!term || `${note.title} ${note.excerpt}`.toLocaleLowerCase().includes(term)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}
