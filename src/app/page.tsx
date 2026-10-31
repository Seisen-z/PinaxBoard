import { AppShell } from "@/components/shell/app-shell";
import { signOutAction } from "@/features/auth/actions";
import { getSessionUser } from "@/features/auth/session";

/**
 * The Board is the application's home surface.
 *
 * A Server Component so the session is resolved before the first paint — the
 * header renders the right account state immediately rather than flickering
 * from signed-out to signed-in.
 *
 * The route is **not** gated. Without a Supabase project the board runs on
 * local state, and even with one, a visitor can look around before signing up.
 * Gating arrives with real cloud data in Milestone 7.
 */
export default async function BoardPage() {
  const user = await getSessionUser();

  return <AppShell user={user} onSignOut={signOutAction} />;
}
