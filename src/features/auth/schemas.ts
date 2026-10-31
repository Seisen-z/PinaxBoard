import { z } from "zod";

/**
 * Credential validation (PRODUCT_SPEC.md → Zod: "Never trust client input").
 *
 * The same schemas run in the browser for instant feedback and again in the
 * server action, because the browser check is a convenience and the server
 * check is the actual guard.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .email("That does not look like an email address");

/**
 * Supabase enforces a minimum of 6 by default; 8 is required here because the
 * default is short enough to be guessable and the cost to the user is one
 * extra character. No composition rules — length beats a symbol requirement,
 * and arbitrary rules push people towards `Password1!`.
 */
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Passwords are limited to 72 characters");

export const signInSchema = z.object({
  email,
  // Existing accounts may predate the 8-character rule, so sign-in only checks
  // that something was typed. Rejecting a valid password at the door would be
  // both wrong and impossible for the user to act on.
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  email,
  password,
  displayName: z
    .string()
    .trim()
    .max(80, "Names are limited to 80 characters")
    .optional(),
});

export const otpEmailSchema = email.transform((value) => value.toLowerCase());
export const verifyEmailSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code from your email"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/** The result a form receives back from an auth action. */
export interface AuthFormState {
  status: "idle" | "error" | "success";
  /** Message shown above the form. */
  message?: string;
  retryAfterSeconds?: number;
  /** Per-field messages, keyed by input name. */
  fieldErrors?: Partial<Record<"email" | "password" | "displayName" | "code", string>>;
}

export const IDLE_AUTH_STATE: AuthFormState = { status: "idle" };

type FieldErrors = NonNullable<AuthFormState["fieldErrors"]>;

/** Collapses a Zod error into the per-field shape the form renders. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "email" || field === "password" || field === "displayName" || field === "code") {
      // First message per field only — a stack of messages under one input is
      // noise, and the first is the one the user hits.
      fieldErrors[field] ??= issue.message;
    }
  }

  return fieldErrors;
}
