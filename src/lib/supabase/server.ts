import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";
import type { TacklySupabaseClient } from "@/lib/supabase/client";

/**
 * A Supabase client for Server Components, Route Handlers and Server Actions.
 *
 * **Create a new one per request.** Caching it across requests would leak one
 * user's session into another's render — the reason this is a function and not
 * a module-level singleton.
 *
 * `server-only` makes an accidental import from a Client Component a build
 * error rather than a runtime leak.
 */
export async function createSupabaseServerClient(): Promise<TacklySupabaseClient> {
  const env = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. That is expected: the
            // proxy (src/proxy.ts) refreshes the session and writes the
            // cookies back, so swallowing this is safe *only* while the proxy
            // is in place. If sessions start expiring early, check it first.
          }
        },
      },
    },
  );
}

/**
 * The signed-in user, or `null`.
 *
 * Uses `getUser()`, not `getSession()`. `getSession()` reads the cookie
 * without verifying it, so on the server it will happily report a user from a
 * forged cookie. `getUser()` validates the token with the auth server.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user;
}
