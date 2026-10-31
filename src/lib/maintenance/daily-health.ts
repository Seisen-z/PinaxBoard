/** UTC+8 midnight: one attempt on startup, then hourly retries/day rollover. */
export const HEALTH_INTERVAL_MS = 60 * 60 * 1000;

export function shanghaiDay(now: Date): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function createDailyHealthRunner(
  probe: () => Promise<void>,
  now: () => Date = () => new Date(),
) {
  let lastDay: string | undefined;
  let running = false;
  return async function run(): Promise<void> {
    const day = shanghaiDay(now());
    if (running || lastDay === day) return;
    running = true;
    try {
      await probe();
      lastDay = day;
    } finally {
      running = false;
    }
  };
}
