import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { signInAction } from "@/features/auth/actions";
import { getSessionUser } from "@/features/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in · Pinax Board" };

const NOT_CONFIGURED =
  "This instance has no Supabase project connected yet, so accounts are " +
  "unavailable. The board still works — it saves to this browser.";

export default async function LoginPage() {
  // Someone already signed in has no business on the sign-in page.
  if (await getSessionUser()) redirect("/");

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <AuthForm
        mode="sign-in"
        action={signInAction}
        {...(isSupabaseConfigured() ? {} : { disabledReason: NOT_CONFIGURED })}
      />

      <p className="text-xs text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-medium text-foreground underline">
          Create an account
        </Link>
      </p>

      <Link href="/app" className="text-xs text-muted-foreground underline">
        Continue without an account
      </Link>
      <p className="text-xs text-muted-foreground">
        <Link href="/privacy" className="underline">Privacy</Link>
      </p>
    </div>
  );
}
