import { z } from "zod";

/**
 * Environment validation (PRODUCT_SPEC.md → Zod: "Never trust client input").
 *
 * Validation is **lazy**. Parsing at module scope would crash the whole app on
 * import whenever Supabase is not configured — which is exactly the state the
 * project is in until a project is provisioned, and the state every fresh
 * clone starts in. Instead, a missing variable fails at the point a Supabase
 * client is actually constructed, with a message that says what to do.
 */

const supabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, "is empty")
    .url("must be a URL, e.g. https://abc.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "is empty"),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

/**
 * Reads the Supabase variables.
 *
 * They are referenced as full literals rather than through a dynamic key,
 * because Next.js inlines `process.env.NEXT_PUBLIC_*` at build time by
 * matching the literal text — `process.env[name]` would come back undefined in
 * the browser bundle.
 */
function readRawEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/**
 * Whether Supabase is configured.
 *
 * Lets a caller degrade gracefully — run against local state, hide an auth
 * button — instead of throwing.
 */
export function isSupabaseConfigured(): boolean {
  return supabaseEnvSchema.safeParse(readRawEnv()).success;
}

/**
 * Returns the validated Supabase environment.
 *
 * @throws If a variable is missing or malformed. The message names the file to
 *         fix, because "Invalid URL" three frames deep into a client library is
 *         not an actionable error.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse(readRawEnv());

  if (!parsed.success) {
    // The variable name comes from the issue path, not from a custom message:
    // when a variable is absent entirely Zod reports a type error first
    // ("expected string, received undefined") and any `min(1)` message never
    // runs — leaving an error that does not say which variable is missing.
    const problems = parsed.error.issues
      .map((issue) => {
        const name = issue.path.join(".") || "environment";
        return `  - ${name}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(
      `Supabase is not configured.\n${problems}\n\n` +
        "Copy .env.local.example to .env.local and fill in the values from " +
        "your Supabase dashboard (Project Settings → API), then restart the " +
        "dev server.",
    );
  }

  return parsed.data;
}
