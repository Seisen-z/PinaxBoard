import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import type { SessionUser } from "@/features/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads the signed-in user and their profile.
 *
 * Safe to call when Supabase is unconfigured — it returns `null` rather than
 * throwing, which is what lets the app run locally before Milestone 7.
 *
 * @example
 * const user = await getSessionUser();        // in a Server Component
 * <AppShell user={user} />
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createSupabaseServerClient();

    // `getUser()` validates the token with the auth server. `getSession()`
    // trusts the cookie, so on the server it would accept a forged one.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", data.user.id)
      .maybeSingle();

    const displayName =
      profile?.display_name ?? deriveName(data.user.email ?? null);

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      displayName,
      avatarUrl: profile?.avatar_url ?? null,
      initials: toInitials(displayName, data.user.email ?? null),
    };
  } catch {
    // A network failure reaching Supabase must not blank the whole page. The
    // board renders signed-out; the proxy will bounce the user if the session
    // really is gone.
    return null;
  }
}

/** Falls back to the local part of an email when there is no profile name. */
function deriveName(email: string | null): string | null {
  if (!email) return null;
  return email.split("@")[0] ?? null;
}

/**
 * Two initials for the avatar chip.
 *
 * Uses code points rather than `charAt`, so a name starting with an emoji or
 * an astral character does not produce half a surrogate pair.
 */
function toInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";

  const words = source.split(/[\s._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => [...word][0] ?? "");
  const initials = letters.join("");

  return (initials || [...source][0] || "?").toUpperCase();
}

export type { SessionUser } from "@/features/auth/types";
