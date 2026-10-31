import type { Tag } from "@/types/note";
const catalogs = new WeakMap<ReadonlyMap<string, Tag>, WeakMap<readonly string[], Tag[]>>();
/** Reuse array identities so a title edit does not invalidate every memoized paper card. Weak keys avoid retaining old boards. */
export function resolveTags(ids: readonly string[], catalog: ReadonlyMap<string, Tag>): Tag[] {
  let cache = catalogs.get(catalog); if (!cache) { cache = new WeakMap(); catalogs.set(catalog, cache); }
  const previous = cache.get(ids); if (previous) return previous;
  const tags = ids.flatMap((id) => { const tag = catalog.get(id); return tag ? [tag] : []; }); cache.set(ids, tags); return tags;
}
