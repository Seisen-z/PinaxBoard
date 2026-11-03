import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Marks an image whose `src` is a private storage object, not a URL. */
export const STORAGE_IMAGE_PREFIX = "tackly-storage://";

const SIGNED_TTL_SECONDS = 60 * 60;
const cache = new Map<string, { url: Promise<string | null>; at: number }>();

export function storageImageSource(bucket: string, path: string): string {
  return `${STORAGE_IMAGE_PREFIX}${bucket}/${path}`;
}

/** Signs a `tackly-storage://bucket/path` source. Cached a little under the TTL. */
export function resolveStorageImage(src: string): Promise<string | null> {
  const hit = cache.get(src);
  if (hit && Date.now() - hit.at < (SIGNED_TTL_SECONDS - 300) * 1000) return hit.url;

  const rest = src.slice(STORAGE_IMAGE_PREFIX.length);
  const slash = rest.indexOf("/");
  if (slash < 1) return Promise.resolve(null);

  const url = (async () => {
    try {
      const { data, error } = await getSupabaseBrowserClient().storage
        .from(rest.slice(0, slash))
        .createSignedUrl(rest.slice(slash + 1), SIGNED_TTL_SECONDS);
      if (error || !data) { cache.delete(src); return null; }
      return data.signedUrl;
    } catch {
      cache.delete(src);
      return null;
    }
  })();
  cache.set(src, { url, at: Date.now() });
  return url;
}
