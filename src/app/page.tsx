import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import { AppShell } from "@/components/shell/app-shell";
import { signOutAction } from "@/features/auth/actions";
import { getSessionUser } from "@/features/auth/session";

export const metadata: Metadata = {
  title: "Pinax Board — notes, boards and a canvas",
  description:
    "Sticky notes on columns or a free canvas, with rich text, reminders and files. Share a board when someone else needs to see it.",
};

/**
 * Home.
 *
 * Signed-in users go straight to their workspace. Everyone else sees the
 * landing page; its "Try it without an account" link opens `/app`, where the
 * board runs on browser storage.
 *
 * A Server Component so the session is resolved before first paint — no
 * flash of the landing page for someone who is signed in.
 */
export default async function HomePage() {
  const user = await getSessionUser();

  if (!user) return <LandingPage />;

  return <AppShell user={user} onSignOut={signOutAction} />;
}
