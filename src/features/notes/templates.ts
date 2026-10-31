import { toPlainText, type DocumentNode, type RichDocument } from "@/lib/tiptap/document";
import type { NoteColorId } from "@/types/note";

/**
 * Starting points offered next to "New note".
 *
 * A template is only a prefilled title, body and colour. Once created, the
 * note is an ordinary note: nothing links it back to the template, and every
 * property stays editable ("create first, customize afterward").
 */
export type TemplateGroup = "Lists" | "Planning" | "Writing";

export interface NoteTemplate {
  id: string;
  group: TemplateGroup;
  label: string;
  description: string;
  title: string;
  color: NoteColorId;
  content: RichDocument;
}

const text = (value: string): DocumentNode => ({ type: "text", text: value });
const paragraph = (value?: string): DocumentNode =>
  value ? { type: "paragraph", content: [text(value)] } : { type: "paragraph" };
const heading = (value: string): DocumentNode => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(value)],
});
const tasks = (items: readonly string[]): DocumentNode => ({
  type: "taskList",
  content: items.map((item) => ({
    type: "taskItem",
    attrs: { checked: false },
    content: [paragraph(item)],
  })),
});
const bullets = (items: readonly string[]): DocumentNode => ({
  type: "bulletList",
  content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
});
const doc = (...content: DocumentNode[]): RichDocument => ({ type: "doc", content });

export const NOTE_TEMPLATES: readonly NoteTemplate[] = [
  {
    id: "checklist",
    group: "Lists",
    label: "Checklist",
    description: "A list of tickable items",
    title: "Checklist",
    color: "yellow",
    content: doc(tasks(["", "", ""])),
  },
  {
    id: "meeting",
    group: "Writing",
    label: "Meeting notes",
    description: "Agenda, notes and action items",
    title: "Meeting notes",
    color: "blue",
    content: doc(
      paragraph("Date and attendees: "),
      heading("Agenda"),
      bullets(["", ""]),
      heading("Notes"),
      paragraph(),
      heading("Action items"),
      tasks(["", ""]),
    ),
  },
  {
    id: "weekly-plan",
    group: "Planning",
    label: "Weekly plan",
    description: "Priorities and a task list for the week",
    title: "Week of ",
    color: "mint",
    content: doc(
      heading("Top 3 priorities"),
      tasks(["", "", ""]),
      heading("Other tasks"),
      tasks(["", ""]),
      heading("Review"),
      paragraph("What went well, what to carry over:"),
    ),
  },
  {
    id: "shopping",
    group: "Lists",
    label: "Shopping list",
    description: "Items to buy",
    title: "Shopping list",
    color: "peach",
    content: doc(tasks(["", "", "", ""])),
  },
  {
    id: "project",
    group: "Planning",
    label: "Project brief",
    description: "Goal, scope, milestones and risks",
    title: "Project brief",
    color: "lavender",
    content: doc(
      heading("Goal"),
      paragraph("What does done look like?"),
      heading("Scope"),
      bullets(["In scope: ", "Out of scope: "]),
      heading("Milestones"),
      tasks(["", "", ""]),
      heading("Risks and open questions"),
      bullets([""]),
    ),
  },
  {
    id: "reading",
    group: "Lists",
    label: "Reading list",
    description: "Books and articles to get to",
    title: "Reading list",
    color: "pink",
    content: doc(
      heading("To read"),
      tasks(["", "", ""]),
      heading("Finished"),
      bullets(["Title, author: one-line takeaway"]),
    ),
  },
  {
    id: "trip",
    group: "Planning",
    label: "Trip plan",
    description: "Dates, bookings, packing and budget",
    title: "Trip to ",
    color: "blue",
    content: doc(
      paragraph("Dates and who is going: "),
      heading("Bookings"),
      tasks(["Flights", "Stay", "Transport"]),
      heading("Itinerary"),
      bullets(["Day 1: ", "Day 2: "]),
      heading("Packing"),
      tasks(["", "", ""]),
      heading("Budget"),
      paragraph("Total so far: "),
    ),
  },
  {
    id: "journal",
    group: "Writing",
    label: "Daily journal",
    description: "Gratitude, highlights and tomorrow",
    title: "Journal",
    color: "cream",
    content: doc(
      heading("Three good things"),
      bullets(["", "", ""]),
      heading("What happened"),
      paragraph(),
      heading("Tomorrow"),
      tasks(["", ""]),
    ),
  },
  {
    id: "study",
    group: "Writing",
    label: "Study notes",
    description: "Key ideas, questions and a summary",
    title: "Study notes: ",
    color: "mint",
    content: doc(
      paragraph("Topic and source: "),
      heading("Key ideas"),
      bullets(["", ""]),
      heading("Questions to follow up"),
      tasks(["", ""]),
      heading("Summary in my own words"),
      paragraph(),
    ),
  },
  {
    id: "brainstorm",
    group: "Writing",
    label: "Brainstorm",
    description: "Ideas first, then pick what to try",
    title: "Brainstorm: ",
    color: "yellow",
    content: doc(
      paragraph("The question: "),
      heading("Ideas"),
      bullets(["", "", "", ""]),
      heading("Best options"),
      tasks(["", ""]),
    ),
  },
];

export const TEMPLATE_GROUPS: readonly TemplateGroup[] = ["Lists", "Planning", "Writing"];

export function findNoteTemplate(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((template) => template.id === id);
}

/** The plain-text projection stored beside the rich document. */
export function templateExcerpt(template: NoteTemplate): string {
  return toPlainText(template.content);
}
