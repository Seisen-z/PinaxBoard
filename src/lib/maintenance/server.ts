import "server-only";
import { createDailyHealthRunner, HEALTH_INTERVAL_MS } from "./daily-health";

const globalHealth = globalThis as typeof globalThis & {
  tacklyHealthTimer?: ReturnType<typeof setInterval>;
};

/** Only loaded by the Node server, never a client bundle or build worker. */
export function startDailyHealthCheck(): void {
  if (globalHealth.tacklyHealthTimer) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || process.env.TACKLY_DAILY_HEALTH_CHECK === "false") return;
  const run = createDailyHealthRunner(async () => {
    const response = await fetch(`${url}/rest/v1/rpc/run_daily_health_check`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error("Daily database health check failed");
    const result: unknown = await response.json();
    if (typeof result !== "object" || result === null || !("status" in result) ||
      (result.status !== "checked" && result.status !== "already_checked")) {
      throw new Error("Unexpected database health check result");
    }
  });
  const attempt = () => { void run().catch(() => {
    // Never log credentials, response bodies, or user data.
    console.error("[Tackly] Daily database health check failed; retrying in one hour.");
  }); };
  globalHealth.tacklyHealthTimer = setInterval(attempt, HEALTH_INTERVAL_MS);
  globalHealth.tacklyHealthTimer.unref();
  attempt();
}
