import { fromPlainText, isRichDocument, toPlainText, type DocumentNode, type RichDocument } from "@/lib/tiptap/document";
import { createId } from "@/lib/utils";
import type { Board } from "@/types/board";
import type { Lane } from "@/types/lane";
import type { Note } from "@/types/note";

export const BACKUP_FORMAT = "tackly-backup" as const;
export const BACKUP_VERSION = 1 as const;
export type ExportFormat = "json" | "markdown" | "txt" | "pdf" | "png" | "backup";
export type ImportKind = "json" | "markdown" | "text" | "csv" | "image";

export interface TacklyBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  scope: "note" | "board" | "workspace";
  board: Board | null;
  lanes: Array<Pick<Lane, "id" | "name" | "color" | "position">>;
  notes: Note[];
}

export interface ImportDraft {
  lanes: Array<Pick<Lane, "id" | "name" | "color">>;
  notes: Note[];
  source: string;
}

import { z } from "zod";
import { NOTE_COLORS, NOTE_STYLES } from "@/types/note";
import { PRIORITIES } from "@/types/common";
import { parseRepeatRule } from "@/features/reminders/schedule";
import { MAX_LANES } from "@/config/lanes";

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_IMPORT_NOTES = 5000;
const date = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date").nullable();
const appearance = z.object({ color: z.enum(NOTE_COLORS), style: z.enum(NOTE_STYLES), coverUrl: z.string().nullable() });
const transform = z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().min(80).max(10000), height: z.number().min(40).max(10000), rotation: z.number().finite(), zIndex: z.number().int() });
const importedNote = z.object({
  id: z.string().min(1), boardId: z.string(), ownerId: z.string(), laneId: z.string(), title: z.string().max(500),
  inbox: z.boolean().optional(), createdBy: z.string().nullable().optional(),
  content: z.unknown(), excerpt: z.string().max(50000), appearance, transform, priority: z.enum(PRIORITIES),
  completed: z.boolean(), completedAt: date.optional(), remindAt: date.optional(),
  repeatRule: z.unknown().optional(), recurrenceSourceId: z.string().nullable().optional(),
  pinned: z.boolean(), locked: z.boolean(), archived: z.boolean(), onCanvas: z.boolean(),
  subtasks: z.array(z.object({ id: z.string(), noteId: z.string(), title: z.string().max(5000), completed: z.boolean(), position: z.number().finite() })).max(1000),
  tagIds: z.array(z.string()).max(100), categoryId: z.string().nullable(), startAt: date, dueAt: date,
  createdAt: z.string(), updatedAt: z.string(), deletedAt: date,
});
const NODE_TYPES = new Set(["doc", "text", "paragraph", "heading", "bulletList", "orderedList", "listItem", "taskList", "taskItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule", "image"]);
function validDocument(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== "object" || depth > 30) return false;
  const node = value as Record<string, unknown>;
  if (typeof node.type !== "string" || !NODE_TYPES.has(node.type)) return false;
  if (node.type === "text" && (typeof node.text !== "string" || !node.text.length)) return false;
  const children = Array.isArray(node.content) ? node.content as Record<string, unknown>[] : [];
  const blocks = new Set(["paragraph", "heading", "bulletList", "orderedList", "taskList", "blockquote", "codeBlock", "horizontalRule", "image"]);
  const typeIs = (child: unknown, types: ReadonlySet<string>) => Boolean(child && typeof child === "object" && types.has(String((child as Record<string, unknown>).type)));
  if (node.type === "doc" && (!children.length || !children.every((child) => typeIs(child, blocks)))) return false;
  if ((node.type === "paragraph" || node.type === "heading") && !children.every((child) => typeIs(child, new Set(["text", "hardBreak"])))) return false;
  if (node.type === "heading" && ![1, 2, 3].includes(Number((node.attrs as Record<string, unknown>)?.level ?? 1))) return false;
  if (node.type === "codeBlock" && !children.every((child) => typeIs(child, new Set(["text"])))) return false;
  if ((node.type === "bulletList" || node.type === "orderedList") && (!children.length || !children.every((child) => typeIs(child, new Set(["listItem"]))))) return false;
  if (node.type === "taskList" && (!children.length || !children.every((child) => typeIs(child, new Set(["taskItem"]))))) return false;
  if ((node.type === "listItem" || node.type === "taskItem") && (children[0]?.type !== "paragraph" || !children.every((child) => typeIs(child, blocks)))) return false;
  if (node.type === "blockquote" && !children.every((child) => typeIs(child, blocks))) return false;
  if (["text", "image", "hardBreak", "horizontalRule"].includes(String(node.type)) && children.length) return false;
  const attrs = node.attrs as Record<string, unknown> | undefined;
  if (node.type === "image" && (!attrs || typeof attrs.src !== "string" || !/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(attrs.src))) return false;
  if (node.marks !== undefined && (!Array.isArray(node.marks) || !node.marks.every((mark: Record<string, unknown>) => mark && typeof mark === "object" && ["bold", "italic", "strike", "underline", "code", "link"].includes(String(mark.type)) && (mark.type !== "link" || /^(https?:|mailto:)/i.test(String((mark.attrs as Record<string, unknown>)?.href)))))) return false;
  return node.content === undefined || Array.isArray(node.content) && node.content.every((child) => validDocument(child, depth + 1));
}

export function makeBackup(scope: TacklyBackup["scope"], board: Board | null, lanes: readonly Lane[], notes: readonly Note[]): TacklyBackup {
  return {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), scope,
    board: board ? structuredClone(board) : null,
    lanes: lanes.map(({ id, name, color, position }) => ({ id, name, color, position })),
    notes: notes.map((note) => structuredClone(note)),
  };
}

export function serializeExport(format: Exclude<ExportFormat, "png" | "pdf">, backup: TacklyBackup): { mime: string; extension: string; text: string } {
  const notes = backup.notes;
  if (format === "backup") return { mime: "application/json", extension: "tackly-backup.json", text: JSON.stringify(backup, null, 2) };
  if (format === "json") return { mime: "application/json", extension: "json", text: JSON.stringify(notes, null, 2) };
  if (format === "markdown") return { mime: "text/markdown;charset=utf-8", extension: "md", text: notes.map(noteToMarkdown).join("\n\n---\n\n") };
  if (format === "txt") return { mime: "text/plain;charset=utf-8", extension: "txt", text: notes.map(noteToText).join("\n\n") };
  throw new Error("Unsupported text export format.");
}

export function parseImport(text: string, kind: Exclude<ImportKind, "image">, fileName = "Imported note"): ImportDraft {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error("Import files must be 10 MB or smaller.");
  if (kind === "json") return parseJson(text);
  if (kind === "csv") return parseCsv(text);
  if (kind === "markdown") {
    const content = markdownDocument(text); const note = plainDraft(markdownTitle(text, fileName), toPlainText(content));
    return { lanes: [], notes: [{ ...note, content }], source: "Markdown" };
  }
  return { lanes: [], notes: [plainDraft(titleFromFile(fileName), text)], source: "Text" };
}

export function imageImportDraft(fileName: string, dataUrl: string): ImportDraft {
  if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(dataUrl)) throw new Error("Choose an image file to import.");
  const title = titleFromFile(fileName);
  const content: RichDocument = { type: "doc", content: [{ type: "image", attrs: { src: dataUrl, alt: title, title } }] };
  return { lanes: [], notes: [{ ...plainDraft(title, ""), content }], source: "Image" };
}

export function materializeImport(draft: ImportDraft, boardId: string, ownerId: string, currentLanes: readonly Lane[], currentNotes: readonly Note[], actorId = ownerId): { lanes: Lane[]; notes: Note[] } {
  if (!draft.notes.length) throw new Error("This file does not contain any importable notes.");
  if (draft.notes.length > MAX_IMPORT_NOTES) throw new Error(`Import at most ${MAX_IMPORT_NOTES} notes at a time.`);
  const now = new Date().toISOString();
  const lanes = [...currentLanes];
  const laneMap = new Map<string, string>();
  for (const existing of lanes) laneMap.set(existing.id, existing.id);
  const claimed = new Set<string>();
  for (const imported of draft.lanes) {
    const existing = lanes.find((lane) => !claimed.has(lane.id) && (lane.id === imported.id || lane.name.trim().toLocaleLowerCase() === imported.name.trim().toLocaleLowerCase()));
    if (existing) { laneMap.set(imported.id, existing.id); claimed.add(existing.id); continue; }
    const lane: Lane = { id: createId(), boardId, name: imported.name, color: imported.color, position: lanes.length, createdAt: now, updatedAt: now };
    lanes.push(lane); laneMap.set(imported.id, lane.id); claimed.add(lane.id);
  }
  const fallback = lanes[0]?.id;
  if (!fallback) throw new Error("Create a column before importing notes.");
  if (lanes.length > MAX_LANES) throw new Error(`Import would exceed ${MAX_LANES} columns. Rename matching columns or import fewer boards.`);
  const ids = new Map(draft.notes.map((note) => [note.id, createId()]));
  const notes = draft.notes.map((source): Note => {
    const id = ids.get(source.id)!;
    const laneId = laneMap.get(source.laneId) ?? fallback;
    const content = isRichDocument(source.content) ? source.content : fromPlainText(source.excerpt);
    const rule = parseRepeatRule(source.repeatRule);
    if (rule?.nextId) { const nextId = ids.get(rule.nextId); if (nextId) rule.nextId = nextId; else delete rule.nextId; }
    return { ...source, id, boardId, ownerId, createdBy: actorId, laneId, content, excerpt: toPlainText(content),
      subtasks: source.subtasks.map((task) => ({ ...task, id: createId(), noteId: id })),
      recurrenceSourceId: source.recurrenceSourceId ? ids.get(source.recurrenceSourceId) ?? null : null,
      repeatRule: rule,
      createdAt: now, updatedAt: now,
    };
  });
  return { lanes, notes: [...currentNotes, ...notes] };
}

function parseJson(text: string): ImportDraft {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("This JSON file is invalid. Nothing was imported."); }
  const object = isRecord(value) ? value : null;
  const rawNotes = Array.isArray(value) ? value : object?.format === BACKUP_FORMAT && object.version === BACKUP_VERSION && Array.isArray(object.notes) ? object.notes : null;
  if (!rawNotes) throw new Error("JSON must be a Pinax Board backup or an array of notes.");
  const lanes = object && Array.isArray(object.lanes) ? object.lanes.flatMap(validateLane) : [];
  if (new Set(lanes.map((lane) => lane.id)).size !== lanes.length) throw new Error("Duplicate column IDs in backup.");
  if (rawNotes.length > MAX_IMPORT_NOTES || !rawNotes.length) throw new Error("Import between 1 and 5000 notes at a time.");
  const seen = new Set<string>();
  const notes = rawNotes.map((item, index) => {
    const parsed = importedNote.safeParse(item);
    if (!parsed.success) throw new Error(`Note ${index + 1} is invalid: ${parsed.error.issues[0]?.message}. Nothing was imported.`);
    const note = parsed.data;
    if (seen.has(note.id)) throw new Error("Duplicate note IDs in import. Nothing was imported."); seen.add(note.id);
    if (note.content !== null && (!isRichDocument(note.content) || !validDocument(note.content))) throw new Error(`Note ${index + 1} has invalid or unsupported document blocks.`);
    if (note.repeatRule != null && !parseRepeatRule(note.repeatRule)) throw new Error(`Note ${index + 1} has an invalid repeat rule.`);
    return { ...note, laneId: note.laneId, repeatRule: parseRepeatRule(note.repeatRule) } as Note;
  });
  return { lanes, notes, source: "JSON backup" };
}

function validateLane(value: unknown): Array<Pick<Lane, "name" | "color"> & { id: string }> {
  if (!isRecord(value) || typeof value.name !== "string" || !value.name.trim() || typeof value.id !== "string" || typeof value.color !== "string" || !/^(var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([0-9.,% /]+\))$/i.test(value.color)) throw new Error("Invalid column in backup.");
  return [{ id: value.id, name: value.name.slice(0, 120), color: value.color }];
}

function parseCsv(text: string): ImportDraft {
  const rows = readCsv(text);
  const headerRow = rows[0];
  if (rows.length < 2 || !headerRow) throw new Error("CSV needs a header row and at least one note.");
  const headers = headerRow.map((head) => head.trim().toLowerCase());
  const title = headers.indexOf("title"); const content = headers.findIndex((head) => head === "content" || head === "excerpt" || head === "text");
  if (title < 0 && content < 0) throw new Error("CSV needs a title, content, excerpt, or text column.");
  const notes = rows.slice(1).flatMap((row) => { const body = content < 0 ? "" : row[content] ?? ""; const noteTitle = title < 0 ? titleFromText(body) : row[title] ?? ""; return noteTitle.trim() || body.trim() ? [plainDraft(noteTitle || "Untitled", body)] : []; });
  if (!notes.length) throw new Error("CSV has no importable rows."); return { lanes: [], notes, source: "CSV" };
}
function plainDraft(title: string, text: string): Note {
  const now = new Date().toISOString();
  if (text.length > 50000 || title.length > 500) throw new Error("Note exceeds the import size limit.");
  return { id: createId(), boardId: "", ownerId: "", laneId: "", title, content: fromPlainText(text), excerpt: toPlainText(fromPlainText(text)),
    appearance: { color: "yellow", style: "sticky", coverUrl: null }, transform: { x: 0, y: 0, width: 280, height: 240, rotation: 0, zIndex: 1 }, priority: "none", completed: false, pinned: false, locked: false, archived: false, onCanvas: false, subtasks: [], tagIds: [], categoryId: null, startAt: null, dueAt: null, createdAt: now, updatedAt: now, deletedAt: null };
}
function readCsv(input: string): string[][] { const rows: string[][]=[]; let row:string[]=[];let cell="";let quote=false; for(let i=0;i<input.length;i++){const char=input[i];if(char==='"'){if(quote&&input[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(char===','&&!quote){row.push(cell);cell="";}else if((char==='\n'||char==='\r')&&!quote){if(char==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some((item)=>item.length))rows.push(row);row=[];cell="";}else cell+=char;} if(quote) throw new Error("CSV has an unclosed quoted cell.");row.push(cell);if(row.some((item)=>item.length))rows.push(row);return rows; }
function noteToMarkdown(note: Note): string {
  const body = isRichDocument(note.content) ? markdownNodes(note.content.content) : note.excerpt;
  return `# ${note.title || "Untitled"}\n\n${body}\n${note.subtasks.map((task) => `- [${task.completed ? "x" : " "}] ${task.title}`).join("\n")}`.trim();
}
function markdownNodes(nodes: readonly DocumentNode[]): string {
  return nodes.map((node) => {
    let body = node.text ?? markdownNodes(node.content ?? []);
    for (const mark of node.marks ?? []) { if (mark.type === "bold") body = `**${body}**`; else if (mark.type === "italic") body = `*${body}*`; else if (mark.type === "strike") body = `~~${body}~~`; else if (mark.type === "code") body = `\`${body}\``; else if (mark.type === "link") body = `[${body}](${String(mark.attrs?.href ?? "")})`; }
    if (node.type === "heading") return `${"#".repeat(Math.min(6, Math.max(1, Number(node.attrs?.level ?? 2))))} ${body}\n\n`;
    if (node.type === "paragraph") return `${body}\n\n`;
    if (node.type === "listItem") return `- ${body.trim()}\n`;
    if (node.type === "taskItem") return `- [${node.attrs?.checked ? "x" : " "}] ${body.trim()}\n`;
    if (node.type === "blockquote") return body.trim().split("\n").map((line) => `> ${line}`).join("\n") + "\n\n";
    if (node.type === "codeBlock") return `\`\`\`\n${body}\n\`\`\`\n\n`;
    if (node.type === "horizontalRule") return "---\n\n";
    if (node.type === "hardBreak") return "  \n";
    if (node.type === "image") return `![${String(node.attrs?.alt ?? "")}](${String(node.attrs?.src ?? "")})\n\n`;
    return body;
  }).join("").trimEnd();
}
function noteToText(note: Note): string { return `${note.title || "Untitled"}\n${note.excerpt || toPlainText(note.content)}`.trim(); }
function markdownTitle(markdown: string, fallback: string): string { return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || titleFromFile(fallback); }
function markdownDocument(text: string): RichDocument {
  const nodes: DocumentNode[] = []; let code: string[] | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("```")) { if (code) { nodes.push({ type: "codeBlock", content: code.length ? [{ type: "text", text: code.join("\n") }] : [] }); code = null; } else code = []; continue; }
    if (code) { code.push(line); continue; }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) { nodes.push({ type: "heading", attrs: { level: heading[1]!.length }, content: inlineMarkdown(heading[2]!) }); continue; }
    const task = /^[-*] \[([ xX])\] (.*)$/.exec(line);
    if (task) { nodes.push({ type: "taskList", content: [{ type: "taskItem", attrs: { checked: task[1]!.toLowerCase() === "x" }, content: [{ type: "paragraph", content: inlineMarkdown(task[2]!) }] }] }); continue; }
    const bullet = /^[-*] (.*)$/.exec(line);
    if (bullet) { nodes.push({ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: inlineMarkdown(bullet[1]!) }] }] }); continue; }
    nodes.push({ type: "paragraph", ...(line ? { content: inlineMarkdown(line) } : {}) });
  }
  if (code) nodes.push({ type: "codeBlock", content: code.length ? [{ type: "text", text: code.join("\n") }] : [] });
  return { type: "doc", content: nodes.length ? nodes : [{ type: "paragraph" }] };
}
function inlineMarkdown(text: string): DocumentNode[] {
  const result: DocumentNode[] = []; const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:[^)]+)\)/g; let cursor = 0;
  for (const match of text.matchAll(pattern)) { if (match.index! > cursor) result.push({ type: "text", text: text.slice(cursor, match.index) });
    result.push({ type: "text", text: match[1] ?? match[2] ?? match[3]!, marks: match[1] ? [{ type: "bold" }] : match[2] ? [{ type: "code" }] : [{ type: "link", attrs: { href: match[4]! } }] }); cursor = match.index! + match[0].length;
  }
  if (cursor < text.length) result.push({ type: "text", text: text.slice(cursor) }); return result;
}
function titleFromFile(name:string):string{return name.replace(/\.[^.]+$/, "").trim() || "Imported note";} function titleFromText(text:string):string{return text.trim().split(/\r?\n/)[0]?.slice(0,100)||"Untitled";}  function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value);}
