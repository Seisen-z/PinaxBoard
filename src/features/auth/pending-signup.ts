import "server-only";
import { cookies } from "next/headers";
import { otpEmailSchema } from "./schemas";

const EMAIL_COOKIE = "tackly-signup-email";
const SENT_COOKIE = "tackly-signup-sent-at";
const options = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 60,
};

/** Pending email is navigation state, never proof of identity/authorization. */
export async function setPendingSignup(email: string, sent = true) {
  const store = await cookies();
  store.set(EMAIL_COOKIE, otpEmailSchema.parse(email), options);
  store.set(SENT_COOKIE, sent ? String(Date.now()) : "0", options);
}

export async function getPendingSignup() {
  const store = await cookies();
  const parsed = otpEmailSchema.safeParse(store.get(EMAIL_COOKIE)?.value);
  if (!parsed.success) return null;
  const sent = Number(store.get(SENT_COOKIE)?.value ?? 0);
  return {
    email: parsed.data,
    retryAfterSeconds: Number.isFinite(sent)
      ? Math.max(0, Math.min(60, Math.ceil((sent + 60_000 - Date.now()) / 1000)))
      : 0,
  };
}

export async function clearPendingSignup() {
  const store = await cookies();
  store.delete(EMAIL_COOKIE);
  store.delete(SENT_COOKIE);
}
