import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

/**
 * Runs before every matched request (Next 16's replacement for `middleware`).
 *
 * Its only job today is refreshing the Supabase session. Route protection
 * arrives with authentication in Milestone 6.
 */
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    /*
     * Every path except static assets and images.
     *
     * A session refresh on a favicon request is wasted work, and refreshing on
     * requests that cannot carry auth cookies only adds latency.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
