import { describe, expect, it } from "vitest";

import {
  emptyDocument,
  fromPlainText,
  isEmptyDocument,
  isRichDocument,
  resolveDocument,
  toPlainText,
  type RichDocument,
} from "@/lib/tiptap/document";

/**
 * Document helpers.
 *
 * The migration cases matter most: `Note.content` is `jsonb`, so these
 * functions are handed whatever any past or future build stored there. A
 * helper that throws on an unexpected shape takes the whole board down with
 * it, so every one of them has to narrow rather than assume.
 */

const doc = (content: unknown[]): RichDocument =>
  ({ type: "doc", content }) as RichDocument;

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("isRichDocument", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "hello"],
    ["a number", 7],
    ["an array", []],
    ["a bare object", {}],
    ["a node that is not a doc", { type: "paragraph", content: [] }],
    ["a doc with no content array", { type: "doc" }],
  ])("rejects %s", (_label, value) => {
    expect(isRichDocument(value)).toBe(false);
  });

  it("accepts a document", () => {
    expect(isRichDocument(emptyDocument())).toBe(true);
  });
});

describe("fromPlainText", () => {
  it("makes one paragraph per line", () => {
    expect(fromPlainText("first\nsecond")).toEqual(
      doc([paragraph("first"), paragraph("second")]),
    );
  });

  it("keeps blank lines as empty paragraphs", () => {
    // The spacing a user typed is part of what they wrote.
    expect(fromPlainText("a\n\nb")).toEqual(
      doc([paragraph("a"), { type: "paragraph" }, paragraph("b")]),
    );
  });

  it("turns empty text into an editable empty document", () => {
    expect(fromPlainText("")).toEqual(emptyDocument());
  });
});

describe("toPlainText", () => {
  it("returns nothing for a value that is not a document", () => {
    expect(toPlainText(null)).toBe("");
    expect(toPlainText("plain string")).toBe("");
  });

  it("joins blocks with newlines", () => {
    expect(toPlainText(doc([paragraph("one"), paragraph("two")]))).toBe("one\ntwo");
  });

  it("reads headings, quotes and code blocks", () => {
    const value = doc([
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
      { type: "blockquote", content: [paragraph("Quoted")] },
      { type: "codeBlock", content: [{ type: "text", text: "npm run verify" }] },
    ]);

    expect(toPlainText(value)).toBe("Title\nQuoted\nnpm run verify");
  });

  it("reads list and checklist items as their own lines", () => {
    const value = doc([
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [paragraph("milk")] },
          { type: "listItem", content: [paragraph("bread")] },
        ],
      },
      {
        type: "taskList",
        content: [
          { type: "taskItem", attrs: { checked: true }, content: [paragraph("done")] },
        ],
      },
    ]);

    expect(toPlainText(value)).toBe("milk\nbread\ndone");
  });

  it("reads a list nested inside a list item", () => {
    const value = doc([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              paragraph("parent"),
              {
                type: "bulletList",
                content: [{ type: "listItem", content: [paragraph("child")] }],
              },
            ],
          },
        ],
      },
    ]);

    expect(toPlainText(value)).toBe("parent\nchild");
  });

  it("keeps marked text, which is still text", () => {
    const value = doc([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "see " },
          {
            type: "text",
            text: "the docs",
            marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          },
        ],
      },
    ]);

    expect(toPlainText(value)).toBe("see the docs");
  });

  it("drops the trailing empty paragraph editing leaves behind", () => {
    expect(toPlainText(doc([paragraph("note"), { type: "paragraph" }]))).toBe("note");
  });
});

describe("resolveDocument — the migration path", () => {
  it("converts a note written before the rich editor", () => {
    // content `null`, body in `excerpt`: every note from Milestones 0–8.
    expect(resolveDocument(null, "Draft the plan")).toEqual(
      doc([paragraph("Draft the plan")]),
    );
  });

  it("prefers stored content over the excerpt", () => {
    const stored = doc([paragraph("the real body")]);

    expect(resolveDocument(stored, "a stale excerpt")).toBe(stored);
  });

  it("falls back to the excerpt when the stored value is not a document", () => {
    // A corrupt or foreign `jsonb` value must not lose the user's text.
    expect(resolveDocument({ unexpected: true }, "still here")).toEqual(
      doc([paragraph("still here")]),
    );
  });

  it("gives an empty note an editable empty document", () => {
    expect(resolveDocument(null, "")).toEqual(emptyDocument());
  });

  it("round-trips text through a document unchanged", () => {
    const text = "line one\n\nline three";

    expect(toPlainText(fromPlainText(text))).toBe(text);
  });
});

describe("isEmptyDocument", () => {
  it("treats a non-document and an empty document as empty", () => {
    expect(isEmptyDocument(null)).toBe(true);
    expect(isEmptyDocument(emptyDocument())).toBe(true);
    expect(isEmptyDocument(doc([paragraph("   ")]))).toBe(true);
  });

  it("is not empty once there is text", () => {
    expect(isEmptyDocument(doc([paragraph("x")]))).toBe(false);
  });

  it("is not empty for a note that is only an image", () => {
    // Text is not the only content a note can carry.
    const value = doc([{ type: "image", attrs: { src: "https://example.com/a.png" } }]);

    expect(isEmptyDocument(value)).toBe(false);
  });
});
