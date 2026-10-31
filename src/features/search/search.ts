import type { Board } from "@/types/board";
import type { Category, Note, Tag } from "@/types/note";
import type { Workspace } from "@/types/workspace";

/**
 * Workspace search (IMPLEMENTATION_PLAN.md §18).
 *
 * Pure and synchronous, over data the client already holds. §18 asks for
 * titles, note text, tags, categories, board names and workspace names — all
 * of which are in memory, so a round trip would make search slower without
 * making it better. Full-text search at the database belongs with the scale
 * that needs it.
 *
 * Note text is matched against `Note.excerpt`, the maintained plain-text
 * projection of the Tiptap document, so nothing here walks a document tree.
 */

export type SearchResultKind = "note" | "board" | "workspace";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  /** What the row shows. */
  title: string;
  /** Second line: the match's context, or where the thing lives. */
  subtitle: string;
  /** Higher sorts first. */
  score: number;
}

export interface SearchInput {
  notes: readonly Note[];
  tags: readonly Tag[];
  categories: readonly Category[];
  boards: readonly Board[];
  workspaces: readonly Workspace[];
}

/** Results returned for one query. Enough to scan, not enough to scroll. */
export const SEARCH_RESULT_LIMIT = 20;

/**
 * Scores by *where* the term matched, not how often.
 *
 * A title match is what the searcher almost always means; body text is the
 * fallback. Counting occurrences instead would rank a long note that mentions
 * a word five times above the note actually called that word.
 */
const SCORE = {
  titleExact: 120,
  titlePrefix: 100,
  title: 80,
  tag: 60,
  category: 50,
  body: 30,
  container: 70,
} as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** A short window of body text around the match, for the result's subtitle. */
function excerptAround(text: string, needle: string): string {
  const index = text.toLowerCase().indexOf(needle);
  if (index === -1) return text.slice(0, 80);

  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + needle.length + 56);

  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${
    end < text.length ? "…" : ""
  }`;
}

/**
 * Searches everything the client holds.
 *
 * Archived and deleted notes are excluded: search is for finding what you are
 * working on. Trash gets its own surface in Milestone 24.
 */
export function search(query: string, input: SearchInput): SearchResult[] {
  const needle = normalize(query);
  if (!needle) return [];

  const results: SearchResult[] = [];

  const tagsById = new Map(input.tags.map((tag) => [tag.id, tag]));
  const categoriesById = new Map(
    input.categories.map((category) => [category.id, category]),
  );

  for (const note of input.notes) {
    if (note.archived || note.deletedAt) continue;

    const result = scoreNote(note, needle, tagsById, categoriesById);
    if (result) results.push(result);
  }

  for (const board of input.boards) {
    if (!normalize(board.name).includes(needle)) continue;

    results.push({
      kind: "board",
      id: board.id,
      title: board.name,
      subtitle: "Board",
      score: SCORE.container,
    });
  }

  for (const workspace of input.workspaces) {
    if (!normalize(workspace.name).includes(needle)) continue;

    results.push({
      kind: "workspace",
      id: workspace.id,
      title: workspace.name,
      subtitle: "Workspace",
      score: SCORE.container,
    });
  }

  return results
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, SEARCH_RESULT_LIMIT);
}

function scoreNote(
  note: Note,
  needle: string,
  tagsById: ReadonlyMap<string, Tag>,
  categoriesById: ReadonlyMap<string, Category>,
): SearchResult | null {
  const title = note.title || "Untitled note";
  const normalizedTitle = normalize(title);

  if (normalizedTitle === needle) {
    return { kind: "note", id: note.id, title, subtitle: "Note", score: SCORE.titleExact };
  }

  if (normalizedTitle.startsWith(needle)) {
    return { kind: "note", id: note.id, title, subtitle: "Note", score: SCORE.titlePrefix };
  }

  if (normalizedTitle.includes(needle)) {
    return { kind: "note", id: note.id, title, subtitle: "Note", score: SCORE.title };
  }

  const matchedTag = note.tagIds
    .map((tagId) => tagsById.get(tagId))
    .find((tag) => tag && normalize(tag.name).includes(needle));

  if (matchedTag) {
    return {
      kind: "note",
      id: note.id,
      title,
      // Says *why* this note came back, which an unexplained title match on a
      // note whose title does not contain the term would not.
      subtitle: `Tagged “${matchedTag.name}”`,
      score: SCORE.tag,
    };
  }

  const category = note.categoryId ? categoriesById.get(note.categoryId) : undefined;
  if (category && normalize(category.name).includes(needle)) {
    return {
      kind: "note",
      id: note.id,
      title,
      subtitle: `In “${category.name}”`,
      score: SCORE.category,
    };
  }

  if (note.excerpt && normalize(note.excerpt).includes(needle)) {
    return {
      kind: "note",
      id: note.id,
      title,
      subtitle: excerptAround(note.excerpt, needle),
      score: SCORE.body,
    };
  }

  return null;
}
