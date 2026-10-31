"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export type TacklySupabaseClient = SupabaseClient<Database>;

/**
 * The browser Supabase client.
 *
 * Cached per tab. `createBrowserClient` sets up auth listeners and a realtime
 * connection, so creating one per component would multiply both — and two
 * clients disagreeing about the session is a classic source of random logouts.
 *
 * Safe to call during render; it does not touch cookies until used.
 */
let browserClient: TacklySupabaseClient | null = null;

export function getSupabaseBrowserClient(): TacklySupabaseClient {
  if (browserClient) return browserClient;

  const env = getSupabaseEnv();

  browserClient = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  return browserClient;
}

/**
 * Drops the cached client.
 *
 * For tests, and for sign-out flows that need the next call to start from a
 * clean session rather than a listener bound to the old one.
 */
export function resetSupabaseBrowserClient(): void {
  browserClient = null;
}
