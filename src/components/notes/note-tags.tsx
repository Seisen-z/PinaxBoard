import { TagPill } from "@/components/ui/tag-pill";
import type { Category, Tag } from "@/types/note";

export interface NoteTagsProps {
  tags: readonly Tag[];
  /**
   * The note's category, shown ahead of the tags.
   *
   * One row rather than two: a note usually has neither or one of each, and a
   * second row that is empty most of the time costs every card the space.
   */
  category?: Category | null;
  /** Pills shown before the row is truncated with a "+N" pill. */
  maxVisible?: number;
}

/** The tag and category row of a note card (FRONTEND_SPEC.md §17, §20). */
export function NoteTags({ tags, category = null, maxVisible = 3 }: NoteTagsProps) {
  if (tags.length === 0 && !category) return null;

  const visible = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - visible.length;

  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="Tags and category">
      {category ? (
        <li>
          {/*
            The emoji carries no meaning on its own — the name is right beside
            it — so it is hidden from assistive technology rather than read out
            as "folder emoji" before every category name.
          */}
          <span
            className="inline-flex items-center gap-1 rounded-full border border-current/15 px-1.5 py-0.5 text-[11px] font-medium"
            style={category.color ? { borderColor: category.color } : undefined}
          >
            {category.emoji ? (
              <span aria-hidden="true">{category.emoji}</span>
            ) : null}
            {category.name}
          </span>
        </li>
      ) : null}

      {visible.map((tag) => (
        <li key={tag.id}>
          <TagPill name={tag.name} color={tag.color} />
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li className="text-[11px] opacity-70">+{hiddenCount}</li>
      ) : null}
    </ul>
  );
}
