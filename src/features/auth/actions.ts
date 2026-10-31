"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  signInSchema,
  signUpSchema,
  verifyEmailSchema,
  toFieldErrors,
  type AuthFormState,
} from "@/features/auth/schemas";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearPendingSignup, getPendingSignup, setPendingSignup } from "./pending-signup";
import { consumeOtpLimit } from "./otp-rate-limit";

/**
 * Authentication server actions (IMPLEMENTATION_PLAN.md §12).
 *
 * Every action re-validates its input. The browser-side check exists to give
 * fast feedback, not to enforce anything — a form post can arrive from
 * anywhere.
 */

const NOT_CONFIGURED: AuthFormState = {
  status: "error",
  message:
    "Accounts are not available yet — this instance has no Supabase project connected.",
};

/**
 * Supabase error messages are written for developers, and some of them leak
 * whether an address is registered. These are the user-facing equivalents.
 *
 * "Invalid login credentials" stays deliberately vague: replying "no account
 * with that email" turns the sign-in form into an account-enumeration oracle.
 */
function toUserMessage(raw: string): string {
  const message = raw.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "That email and password do not match an account. New here? Create an account first.";
  }
  if (message.includes("email not confirmed")) {
    return "Check your inbox and confirm your email address first.";
  }
  if (message.includes("already registered") || message.includes("already exists")) {
    return "An account with that email already exists. Try signing in.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (message.includes("sending") || message.includes("not authorized")) {
    return "We couldn't send your verification email. Please try again shortly.";
  }

  return "Something went wrong. Please try again.";
}

async function checkOtpLimit(email: string, kind: "send" | "verify"): Promise<AuthFormState | null> {
  try {
    const limit = await consumeOtpLimit(email, kind);
    return limit.allowed ? null : {
      status: "error",
      message: kind === "send"
        ? "Please wait before requesting another code."
        : "Too many code attempts. Wait a few minutes, then try again.",
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  } catch {
    return { status: "error", message: "Verification is temporarily unavailable. Please try again shortly." };
  }
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      // An unverified account is not an account yet: no verification screen,
      // no session. Registering again with this email requests a fresh code.
      return {
        status: "error",
        message: "No verified account exists for that email. Create an account first.",
      };
    }
    return { status: "error", message: toUserMessage(error.message) };
  }

  // The layout renders auth-aware navigation, so its cache entry is stale the
  // moment a session appears.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const displayName = formData.get("displayName");

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: displayName === null || displayName === "" ? undefined : displayName,
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  }

  const limited = await checkOtpLimit(parsed.data.email, "send");
  if (limited) return limited;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Read by the `handle_new_user` trigger to seed the profile row.
      ...(parsed.data.displayName
        ? { data: { full_name: parsed.data.displayName } }
        : {}),
    },
  });

  if (error) {
    return { status: "error", message: toUserMessage(error.message) };
  }

  // With email confirmation enabled, Supabase returns a user but no session.
  // They are not signed in yet, so redirecting to the board would bounce them
  // straight back to the login page.
  if (!data.session) {
    await setPendingSignup(parsed.data.email);
    redirect("/verify-email");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function verifySignupCodeAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const pending = await getPendingSignup();
  if (!pending) return { status: "error", message: "Your signup session expired. Start again to request a code." };
  const parsed = verifyEmailSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  const limited = await checkOtpLimit(pending.email, "verify");
  if (limited) return limited;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: pending.email, token: parsed.data.code, type: "email",
  });
  if (error || !data.session) {
    return { status: "error", message: error?.status === 429
      ? "Too many code attempts. Please wait before trying again."
      : "That code is invalid or has expired. Check the latest email or request a new code." };
  }
  await clearPendingSignup();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resendSignupCodeAction(
  _previous: AuthFormState,
  _formData: FormData,
): Promise<AuthFormState> {
  void _previous;
  void _formData;
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const pending = await getPendingSignup();
  if (!pending) return { status: "error", message: "Your signup session expired. Start again to request a code." };
  const limited = await checkOtpLimit(pending.email, "send");
  if (limited) return limited;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: pending.email });
  if (error) return { status: "error", message: toUserMessage(error.message), retryAfterSeconds: 60 };
  await setPendingSignup(pending.email);
  return { status: "success", message: "A new code is on its way. Use the latest email.", retryAfterSeconds: 60 };
}

export async function changeSignupEmailAction(): Promise<void> {
  await clearPendingSignup();
  redirect("/register");
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
