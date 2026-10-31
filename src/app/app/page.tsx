import { AppShell } from "@/components/shell/app-shell";
import { signOutAction } from "@/features/auth/actions";
import { getSessionUser } from "@/features/auth/session";

/**
 * The workspace for anyone, signed in or not.
 *
 * Signed-out visitors land here from "Try it without an account": the board
 * runs on browser storage until they sign in. `/` shows the landing page to
 * signed-out visitors and this same workspace to signed-in ones.
 */
export default async function WorkspacePage() {
  const user = await getSessionUser();

  return <AppShell user={user} onSignOut={signOutAction} />;
}
