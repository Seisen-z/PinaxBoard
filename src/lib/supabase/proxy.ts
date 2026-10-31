import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase session on every request.
 *
 * IMPLEMENTATION_PLAN.md §11 calls this file `middleware.ts`. Next 16
 * deprecated that convention and renamed it to `proxy`
 * (`node_modules/next/dist/docs/.../proxy.md`), so the helper follows the
 * framework's name. The role is unchanged.
 *
 * Why it has to exist: Server Components cannot set cookies. When an access
 * token expires mid-render, the refreshed token has nowhere to be written and
 * the user is silently signed out on the next request. Running the refresh
 * here — where the response is still writable — is what keeps sessions alive.
 */
export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  // Nothing to refresh before a project is provisioned. Returning early keeps
  // the app usable against local state instead of erroring on every request.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Written to the request first so anything later in this pass reads
          // the new token, then to a fresh response so the browser receives
          // it. Mutating only one of the two is the classic cause of "signed
          // out at random" bugs.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // `getUser()` validates the token with the auth server and triggers the
  // refresh. Do not replace it with `getSession()`, which trusts the cookie.
  const { data } = await supabase.auth.getUser();

  // A signed-in user has no business on the sign-in pages. The reverse —
  // gating the board behind a session — deliberately does *not* happen yet:
  // the board runs on local state, so a visitor can use it before signing up.
  // Milestone 7 adds the gate along with real cloud data.
  if (data.user && isAuthRoute(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

const AUTH_ROUTES = ["/login", "/register"];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
