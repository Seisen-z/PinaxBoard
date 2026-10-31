import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Completes an email confirmation or magic-link sign-in.
 *
 * Supabase redirects here with a one-time `code`, which is exchanged for a
 * session. The exchange has to happen server-side so the session cookies are
 * set on a response the browser will actually keep.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // Only same-origin paths are honoured. Reflecting an arbitrary `next` value
  // into a redirect would make this an open redirect, handy for phishing.
  const requested = searchParams.get("next") ?? "/";
  const next = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/";

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The code is single-use and short-lived, so an expired link lands here.
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
