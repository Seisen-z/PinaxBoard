"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { ClayButton } from "@/components/ui/clay-button";
import { SurfacePanel } from "@/components/ui/surface-panel";
import {
  IDLE_AUTH_STATE,
  type AuthFormState,
} from "@/features/auth/schemas";
import { cn } from "@/lib/utils";

export type AuthAction = (
  previous: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

export interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  action: AuthAction;
  /** Shown when the instance has no Supabase project connected. */
  disabledReason?: string;
}

/**
 * The sign-in and sign-up form.
 *
 * One component for both because the fields differ by exactly one input and
 * the error, pending and success handling are identical — two copies would
 * drift.
 *
 * Errors are rendered next to the field they belong to and referenced by
 * `aria-describedby`, so a screen reader announces the reason rather than just
 * "invalid" (FRONTEND_SPEC.md §62).
 */
export function AuthForm({ mode, action, disabledReason }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE_AUTH_STATE);

  const isSignUp = mode === "sign-up";
  const disabled = pending || Boolean(disabledReason);

  return (
    <SurfacePanel
      tone="base"
      border="soft"
      radius="xl"
      elevation="md"
      className="w-full max-w-sm p-6"
    >
      <h1 className="text-xl font-semibold tracking-tight">
        {isSignUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isSignUp
          ? "Your boards and notes sync across every device."
          : "Sign in to reach your workspace."}
      </p>

      {disabledReason ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-md border border-border bg-surface-raised p-3 text-xs text-muted-foreground"
        >
          <AlertCircle size={14} aria-hidden="true" className="mt-px shrink-0" />
          {disabledReason}
        </p>
      ) : null}

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-xs text-foreground"
        >
          <AlertCircle size={14} aria-hidden="true" className="mt-px shrink-0" />
          {state.message}
        </p>
      ) : null}

      {state.status === "success" && state.message ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-xs text-foreground"
        >
          <CheckCircle2 size={14} aria-hidden="true" className="mt-px shrink-0" />
          {state.message}
        </p>
      ) : null}

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        {isSignUp ? (
          <Field
            name="displayName"
            label="Name"
            type="text"
            autoComplete="name"
            placeholder="Optional"
            {...(state.fieldErrors?.displayName
              ? { error: state.fieldErrors.displayName }
              : {})}
          />
        ) : null}

        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          {...(state.fieldErrors?.email ? { error: state.fieldErrors.email } : {})}
        />

        <Field
          name="password"
          label="Password"
          type="password"
          // Tells a password manager to offer a new password rather than
          // autofilling the existing one.
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          {...(isSignUp ? { hint: "At least 8 characters" } : {})}
          {...(state.fieldErrors?.password
            ? { error: state.fieldErrors.password }
            : {})}
        />

        <ClayButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={disabled}
          className="mt-1 w-full"
        >
          {pending ? (
            <>
              <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              {isSignUp ? "Creating account…" : "Signing in…"}
            </>
          ) : (
            <>{isSignUp ? "Create account" : "Sign in"}</>
          )}
        </ClayButton>
      </form>
    </SurfacePanel>
  );
}

interface FieldProps {
  name: string;
  label: string;
  type: string;
  autoComplete: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
}

function Field({
  name,
  label,
  type,
  autoComplete,
  required = false,
  placeholder,
  hint,
  error,
}: FieldProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        {...(placeholder ? { placeholder } : {})}
        aria-invalid={error ? true : undefined}
        {...(describedBy ? { "aria-describedby": describedBy } : {})}
        className={cn(
          "h-10 rounded-md border bg-surface-sunken px-3 text-sm text-foreground",
          "placeholder:text-muted-foreground focus:outline-none",
          error ? "border-danger" : "border-border",
        )}
      />

      {error ? (
        <p id={`${name}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
