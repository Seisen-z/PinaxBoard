import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Editor } from "@tiptap/react";

/**
 * The slash menu's commands (IMPLEMENTATION_PLAN.md §15).
 *
 * Each entry owns its own `run`, so the menu component stays a list renderer
 * and adding a block is one entry here rather than a new branch in the UI.
 *
 * `keywords` exist because people reach for the word they know: "todo" and
 * "checkbox" should both find the checklist. Matching on the label alone makes
 * the menu feel broken for anyone whose vocabulary differs from ours.
 */
export interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  keywords: readonly string[];
  run: (editor: Editor) => void;
}

/**
 * Prompts for a URL.
 *
 * `window.prompt` for the same reason the workspace picker uses it: it keeps
 * the flow to one step and is obviously temporary, rather than a half-built
 * dialog that looks finished. Replaced when the dialog work lands.
 */
function promptForUrl(message: string, initial = "https://"): string | null {
  const value = window.prompt(message, initial)?.trim();
  if (!value) return null;

  // Anything but http(s) is rejected here as well as by the Link extension:
  // `javascript:` in an href is a script the note's author hands every reader.
  if (!/^https?:\/\//i.test(value)) return null;

  return value;
}

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    id: "paragraph",
    label: "Text",
    hint: "Plain paragraph",
    icon: Type,
    keywords: ["text", "paragraph", "body", "plain"],
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading-1",
    label: "Heading 1",
    hint: "Section title",
    icon: Heading1,
    keywords: ["h1", "title", "heading", "big"],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    label: "Heading 2",
    hint: "Subsection",
    icon: Heading2,
    keywords: ["h2", "subtitle", "heading"],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3",
    label: "Heading 3",
    hint: "Minor heading",
    icon: Heading3,
    keywords: ["h3", "heading", "small"],
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list",
    label: "Bulleted list",
    hint: "Unordered items",
    icon: List,
    keywords: ["bullet", "list", "unordered", "ul", "point"],
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "Numbered list",
    hint: "Ordered steps",
    icon: ListOrdered,
    keywords: ["number", "ordered", "ol", "steps", "list"],
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task-list",
    label: "Checklist",
    hint: "Tickable items",
    icon: ListChecks,
    keywords: ["todo", "task", "check", "checkbox", "tick", "list"],
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    hint: "Set text apart",
    icon: Quote,
    keywords: ["quote", "blockquote", "cite"],
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code-block",
    label: "Code block",
    hint: "Monospaced block",
    icon: Code,
    keywords: ["code", "snippet", "pre", "mono"],
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "divider",
    label: "Divider",
    hint: "Horizontal rule",
    icon: Minus,
    keywords: ["divider", "rule", "hr", "line", "separator"],
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "link",
    label: "Link",
    hint: "Link the selection",
    icon: LinkIcon,
    keywords: ["link", "url", "href", "anchor"],
    run: (editor) => {
      const url = promptForUrl("Link to");
      if (!url) {
        editor.chain().focus().run();
        return;
      }

      // With nothing selected there is no text to carry the link, so the URL
      // becomes its own label rather than producing an invisible mark.
      if (editor.state.selection.empty) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: url,
            marks: [{ type: "link", attrs: { href: url } }],
          })
          .run();
        return;
      }

      editor.chain().focus().setLink({ href: url }).run();
    },
  },
  {
    id: "image",
    label: "Image",
    hint: "Embed by URL",
    icon: ImageIcon,
    keywords: ["image", "picture", "photo", "img", "embed"],
    run: (editor) => {
      const url = promptForUrl("Image URL");
      if (!url) {
        editor.chain().focus().run();
        return;
      }

      editor.chain().focus().setImage({ src: url }).run();
    },
  },
];

/**
 * The commands matching a query, in catalogue order.
 *
 * An empty query lists everything — the menu opens on a bare "/", and an empty
 * list there would read as broken.
 */
export function filterSlashCommands(query: string): readonly SlashCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter(
    (command) =>
      command.label.toLowerCase().includes(needle) ||
      command.keywords.some((keyword) => keyword.includes(needle)),
  );
}
