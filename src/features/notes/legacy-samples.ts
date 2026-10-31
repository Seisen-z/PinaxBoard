import { MOCK_BOARD_ID, MOCK_OWNER_ID } from "@/features/board/board-identity";
import type { Note } from "@/types/note";

export const LEGACY_SAMPLE_BACKUP_KEY = "tackly:legacy-samples-backup:v1";
const sampleIds = new Set([
  "note-project-planning", "note-groceries", "note-reading", "note-canvas-mode",
  "note-design-tokens", "note-copy-review", "note-a11y-pass", "note-shell",
  "note-scaffold", "note-focus-mode", "note-desk-objects",
]);
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isLegacySample(value: unknown): boolean {
  return isRecord(value) && typeof value.id === "string" && sampleIds.has(value.id)
    && value.boardId === MOCK_BOARD_ID && value.ownerId === MOCK_OWNER_ID;
}

/** Runs only on pre-v2 local persistence. Back up before removing known local fixtures. */
export function migrateLocalNotes(
  persisted: unknown, storage: Pick<Storage, "getItem" | "setItem">, version = 1,
): { notes: Note[]; legacySamplesPending: boolean } {
  if (version > 2 || !isRecord(persisted) || !Array.isArray(persisted.notes)) {
    throw new Error("Saved notes have an unsupported format. Existing browser data has been kept.");
  }
  const notes = persisted.notes as Note[];
  if (!notes.some(isLegacySample)) return { ...persisted, notes, legacySamplesPending: false };
  // If backup storage is full, load the original notes and expose a retryable notice.
  // A pending marker retries cleanup on later hydration, even after persistence upgrades.
  try {
    if (storage.getItem(LEGACY_SAMPLE_BACKUP_KEY) === null) {
      storage.setItem(LEGACY_SAMPLE_BACKUP_KEY, JSON.stringify({ state: persisted, version }));
    }
  } catch {
    return { ...persisted, notes, legacySamplesPending: true };
  }
  return { ...persisted, notes: notes.filter(note => !isLegacySample(note)), legacySamplesPending: false };
}
