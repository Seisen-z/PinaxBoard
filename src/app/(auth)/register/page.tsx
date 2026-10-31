import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { signUpAction } from "@/features/auth/actions";
import { getSessionUser } from "@/features/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Create an account · Pinax Board" };

const NOT_CONFIGURED =
  "This instance has no Supabase project connected yet, so accounts are " +
  "unavailable. The board still works — it saves to this browser.";

export default async function RegisterPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <AuthForm
        mode="sign-up"
        action={signUpAction}
        {...(isSupabaseConfigured() ? {} : { disabledReason: NOT_CONFIGURED })}
      />

      <p className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>

      <Link href="/" className="text-xs text-muted-foreground underline">
        Continue without an account
      </Link>
      <p className="text-xs text-muted-foreground">
        <Link href="/privacy" className="underline">Privacy</Link>
      </p>
    </div>
  );
}
