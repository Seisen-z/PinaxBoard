import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 *
 * Enforced. Next injects inline bootstrap scripts, so `script-src` keeps
 * 'unsafe-inline'; tightening it needs per-request nonces. If something stops
 * loading, check the browser console for "violates the Content Security
 * Policy" and add the specific origin. To debug, temporarily rename the header
 * to `Content-Security-Policy-Report-Only`.
 *
 * Supabase (REST, Auth, Storage, Realtime websocket) is allowed through the
 * configured project URL only.
 */
function supabaseOrigins(): { http: string; ws: string } | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { http: url.origin, ws: `wss://${url.host}` };
  } catch {
    return null;
  }
}

function contentSecurityPolicy(): string {
  const supabase = supabaseOrigins();
  const connect = ["'self'", ...(supabase ? [supabase.http, supabase.ws] : [])];
  const images = ["'self'", "data:", "blob:", "https:"];

  return [
    "default-src 'self'",
    // Next.js inlines bootstrap scripts; dev also needs eval for HMR.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${images.join(" ")}`,
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}${isDev ? " ws:" : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  // HSTS is only meaningful (and only honoured) over HTTPS.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
