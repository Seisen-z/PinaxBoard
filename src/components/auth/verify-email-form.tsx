"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ClayButton } from "@/components/ui/clay-button";
import { SurfacePanel } from "@/components/ui/surface-panel";
import { IDLE_AUTH_STATE, type AuthFormState } from "@/features/auth/schemas";
import type { AuthAction } from "./auth-form";

interface VerifyEmailFormProps {
  email: string;
  initialRetryAfterSeconds: number;
  verifyAction: AuthAction;
  resendAction: AuthAction;
  changeEmailAction: () => Promise<void>;
}

export function VerifyEmailForm({ email, initialRetryAfterSeconds, verifyAction, resendAction, changeEmailAction }: VerifyEmailFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [remaining, setRemaining] = useState(initialRetryAfterSeconds);
  const [verified, verify, verifying] = useActionState(verifyAction, IDLE_AUTH_STATE);
  const [resent, resend, resending] = useActionState(async (previous: AuthFormState, form: FormData) => {
    const result = await resendAction(previous, form);
    setRemaining(result.retryAfterSeconds ?? 60);
    return result;
  }, IDLE_AUTH_STATE);
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const busy = verifying || resending;
  const codeError = verified.fieldErrors?.code;
  function focusDigit(index: number) {
    inputs.current[Math.max(0, Math.min(5, index))]?.focus();
  }
  function enterDigits(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "").slice(0, 6);
    if (raw && !clean) return;
    const start = clean.length === 6 ? 0 : index;
    setDigits(previous => {
      const next = [...previous];
      if (!clean) next[index] = "";
      else Array.from(clean).forEach((digit, offset) => {
        if (start + offset < 6) next[start + offset] = digit;
      });
      return next;
    });
    if (clean) focusDigit(Math.min(start + clean.length, 5));
  }


  return <SurfacePanel tone="base" border="soft" radius="xl" elevation="md" className="w-full max-w-sm p-6">
    <p className="text-xs font-medium text-muted-foreground">VERIFY YOUR EMAIL</p>
    <h1 className="mt-2 text-xl font-semibold tracking-tight">Check your inbox</h1>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Enter the six-digit code sent to <strong className="break-all font-medium text-foreground">{email}</strong>.</p>
    {verified.message ? <p role="alert" className="mt-4 text-sm text-danger">{verified.message}</p> : null}
    <form action={verify} className="mt-6 flex flex-col gap-4">
      <fieldset disabled={busy} className="min-w-0">
        <legend className="text-xs font-medium text-muted-foreground">Verification code</legend>
        <input type="hidden" name="code" value={digits.join("")} />
        <div className="mt-2 grid grid-cols-6 gap-2" dir="ltr">
          {digits.map((digit, index) => <input key={index}
            ref={element => { inputs.current[index] = element; }}
            type="text" inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${index + 1} of 6`} pattern="[0-9]" maxLength={index === 0 ? 6 : 1}
            required autoFocus={index === 0} value={digit}
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? "signup-code-error signup-code-hint" : "signup-code-hint"}
            onFocus={event => event.currentTarget.select()}
            onChange={event => enterDigits(index, event.target.value)}
            onPaste={event => { event.preventDefault(); enterDigits(index, event.clipboardData.getData("text")); }}
            onKeyDown={event => {
              if (event.key === "Backspace" && !digit && index > 0) {
                event.preventDefault();
                setDigits(previous => previous.map((value, slot) => slot === index - 1 ? "" : value));
                focusDigit(index - 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault(); focusDigit(index + (event.key === "ArrowLeft" ? -1 : 1));
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault(); focusDigit(event.key === "Home" ? 0 : 5);
              }
            }}
            className="h-14 min-w-0 w-full rounded-md border border-border bg-surface-sunken p-0 text-center font-mono text-2xl text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" />)}
        </div>
        {codeError ? <p id="signup-code-error" className="mt-2 text-xs text-danger">{codeError}</p> : null}
        <p id="signup-code-hint" className="mt-2 text-xs text-muted-foreground">The code expires 10 minutes after it is sent.</p>
      </fieldset>
      <ClayButton type="submit" size="lg" disabled={busy} className="w-full">
        {verifying ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" />Verifying…</> : "Verify email"}
      </ClayButton>
    </form>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <form action={resend}><button type="submit" disabled={busy || remaining > 0} className="min-h-11 text-xs font-medium underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline">
        {resending ? "Sending…" : remaining > 0 ? `Resend code in ${remaining}s` : "Resend code"}
      </button></form>
      <form action={changeEmailAction}><button type="submit" disabled={busy} className="min-h-11 text-xs font-medium underline underline-offset-4 disabled:text-muted-foreground">Change email</button></form>
    </div>
    {resent.message ? <p role={resent.status === "error" ? "alert" : "status"} className="mt-2 text-xs text-muted-foreground">{resent.message}</p> : null}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">No email? Check your spam folder, or check the address above.</p>
  </SurfacePanel>;
}
