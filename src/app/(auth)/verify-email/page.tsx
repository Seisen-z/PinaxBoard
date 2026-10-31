import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { verifySignupCodeAction, resendSignupCodeAction, changeSignupEmailAction } from "@/features/auth/actions";
import { getPendingSignup } from "@/features/auth/pending-signup";
import { getSessionUser } from "@/features/auth/session";

export const metadata: Metadata = { title: "Verify your email · Pinax Board" };

export default async function VerifyEmailPage() {
  if (await getSessionUser()) redirect("/");
  const pending = await getPendingSignup();
  if (!pending) redirect("/register");
  return <div className="flex w-full max-w-sm flex-col items-center gap-4">
    <VerifyEmailForm email={pending.email} initialRetryAfterSeconds={pending.retryAfterSeconds}
      verifyAction={verifySignupCodeAction} resendAction={resendSignupCodeAction} changeEmailAction={changeSignupEmailAction} />
    <p className="text-xs text-muted-foreground">Already verified? <Link href="/login" className="font-medium text-foreground underline">Sign in</Link></p>
    <Link href="/" className="text-xs text-muted-foreground underline">Continue without an account</Link>
  </div>;
}
