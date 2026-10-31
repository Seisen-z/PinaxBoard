import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";

const resultSchema = z.object({
  allowed: z.boolean(),
  retryAfterSeconds: z.number().int().min(0).max(900),
});

/** Durable application-flow limits; provider Auth endpoints retain their own limits. */
export async function consumeOtpLimit(email: string, kind: "send" | "verify") {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Verification service is not configured");
  const identifier = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const response = await fetch(`${url}/rest/v1/rpc/consume_signup_verification_limit`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_identifier_hash: identifier, p_kind: kind }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Verification rate check failed");
  return resultSchema.parse(await response.json());
}
