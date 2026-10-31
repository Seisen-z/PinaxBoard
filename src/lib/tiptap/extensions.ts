import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Placeholder } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";

/**
 * The editor's block vocabulary (IMPLEMENTATION_PLAN.md §15).
 *
 * One list, shared by the card editor, the focus editor and the read-only
 * renderer. They must agree: a block the card can create but the renderer
 * cannot draw would show as a blank gap, and a document is the same document
 * wherever it is opened.
 *
 * StarterKit supplies paragraph, heading, bullet/ordered list, blockquote,
 * horizontal rule, code and code block, plus history and the list keymap.
 * Added here: links, images and the checklist.
 *
 * Tables, file blocks and video embeds from §15 are **not** included — each
 * needs an upload or an embed pipeline, which is Milestone 10's work. They are
 * left out rather than half-wired so nothing offers a block it cannot store.
 */
export function noteExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // A note is not a document with a title inside it — the card already has
      // one — so the biggest heading available is a section break.
      link: false,
    }),

    Link.configure({
      openOnClick: false,
      autolink: true,
      // Anything but http(s) and mailto is a vector, not a link. `protocols`
      // is additive to Tiptap's allowlist, so this stays conservative.
      protocols: ["mailto"],
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
    }),

    Image.configure({
      inline: false,
      // Uploads arrive in Milestone 10; until then an image is a URL the user
      // pastes, so remote sources have to be allowed.
      allowBase64: true,
    }),

    TaskList,
    TaskItem.configure({ nested: true }),

    Placeholder.configure({ placeholder }),
  ];
}
