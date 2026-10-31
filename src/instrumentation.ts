export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startDailyHealthCheck } = await import("./lib/maintenance/server");
    startDailyHealthCheck();
  }
}
