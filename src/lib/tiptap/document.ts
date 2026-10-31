/**
 * Tiptap document helpers (IMPLEMENTATION_PLAN.md §15).
 *
 * `Note.content` is `unknown` because it is a `jsonb` column — the database
 * will hand back whatever was stored, including whatever shape an older build
 * wrote. Everything in this file therefore treats stored content as untrusted
 * and narrows it before use.
 *
 * Deliberately free of any `@tiptap/*` import: the store, the sync engine and
 * the server all need to read a document's text, and none of them should have
 * to load an editor to do it.
 */

/** A Tiptap JSON node, as stored. */
export interface DocumentNode {
  type?: string;
  text?: string;
  content?: DocumentNode[];
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

/** The root node of a Tiptap document. */
export interface RichDocument extends DocumentNode {
  type: "doc";
  content: DocumentNode[];
}

/** An empty document — one empty paragraph, which is Tiptap's own initial state. */
export function emptyDocument(): RichDocument {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Narrows stored `jsonb` to a document. Anything else is not one. */
export function isRichDocument(value: unknown): value is RichDocument {
  if (value === null || typeof value !== "object") return false;

  const candidate = value as DocumentNode;
  return candidate.type === "doc" && Array.isArray(candidate.content);
}

/**
 * One paragraph per line of plain text.
 *
 * This is the migration path for every note written before the rich editor:
 * their `content` is `null` and their body lives in `excerpt`. Blank lines
 * become empty paragraphs so the shape of what the user typed survives.
 */
export function fromPlainText(text: string): RichDocument {
  if (!text) return emptyDocument();

  return {
    type: "doc",
    content: text.split("\n").map((line) =>
      line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" },
    ),
  };
}

/**
 * The document to open in an editor for a note.
 *
 * Stored JSON wins; a note that predates the editor is converted from its
 * `excerpt`. Nothing is written back here — a note migrates when the user
 * edits it, not when it is rendered, so opening a board cannot rewrite every
 * note on it.
 */
export function resolveDocument(content: unknown, excerpt: string): RichDocument {
  if (isRichDocument(content)) return content;
  return fromPlainText(excerpt);
}

/** Block types whose content is a separate line of text. */
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem",
  "taskItem",
  "codeBlock",
  "tableRow",
]);

/**
 * The plain-text projection of a document.
 *
 * This is what `Note.excerpt` stores: card previews, search (Milestone 12) and
 * sorting all read text, and none of them should have to walk a document tree.
 * Keeping it derived rather than separately edited is what stops the two from
 * disagreeing about what a note says.
 */
export function toPlainText(value: unknown): string {
  if (!isRichDocument(value)) return "";

  const lines: string[] = [];
  collectLines(value.content, lines);

  // Trailing empty paragraphs are an artefact of editing, not content.
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  return lines.join("\n");
}

function collectLines(nodes: readonly DocumentNode[] | undefined, lines: string[]): void {
  for (const node of nodes ?? []) {
    if (node.type === "horizontalRule") {
      lines.push("---");
      continue;
    }

    if (node.type && BLOCK_TYPES.has(node.type)) {
      const text = inlineText(node);
      // A list item holds paragraphs, so its own text is the joined child
      // text; nested lists under it still need their own lines.
      lines.push(text);
      collectLines(nestedBlocks(node), lines);
      continue;
    }

    collectLines(node.content, lines);
  }
}

/** The text of a block's inline content, ignoring nested blocks. */
function inlineText(node: DocumentNode): string {
  let text = "";

  for (const child of node.content ?? []) {
    if (typeof child.text === "string") {
      text += child.text;
      continue;
    }
    if (child.type === "hardBreak") {
      text += " ";
      continue;
    }
    // A paragraph inside a list item is still this line's text.
    if (child.type === "paragraph" || child.type === "heading") {
      text += inlineText(child);
    }
  }

  return text;
}

/** Blocks nested under a block — a list inside a list item, say. */
function nestedBlocks(node: DocumentNode): DocumentNode[] {
  return (node.content ?? []).filter(
    (child) =>
      child.type === "bulletList" ||
      child.type === "orderedList" ||
      child.type === "taskList" ||
      child.type === "blockquote",
  );
}

/** True when a document holds no text and no media. */
export function isEmptyDocument(value: unknown): boolean {
  if (!isRichDocument(value)) return true;
  if (toPlainText(value).trim() !== "") return false;

  // Text is not the only content: an image-only note is not empty.
  return !containsNode(value.content, (node) =>
    node.type === "image" || node.type === "horizontalRule",
  );
}

function containsNode(
  nodes: readonly DocumentNode[] | undefined,
  predicate: (node: DocumentNode) => boolean,
): boolean {
  for (const node of nodes ?? []) {
    if (predicate(node)) return true;
    if (containsNode(node.content, predicate)) return true;
  }
  return false;
}
