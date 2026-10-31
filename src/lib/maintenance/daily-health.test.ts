import { describe, expect, it, vi } from "vitest";
import { createDailyHealthRunner, shanghaiDay } from "./daily-health";

describe("daily health scheduler", () => {
  it("uses Shanghai midnight", () => {
    expect(shanghaiDay(new Date("2026-10-30T15:59:59Z"))).toBe("2026-10-30");
    expect(shanghaiDay(new Date("2026-10-30T16:00:00Z"))).toBe("2026-10-31");
  });
  it("checks once per day and checks again after rollover", async () => {
    let now = new Date("2026-10-30T16:00:00Z");
    const probe = vi.fn(async () => {});
    const run = createDailyHealthRunner(probe, () => now);
    await run(); await run();
    expect(probe).toHaveBeenCalledTimes(1);
    now = new Date("2026-10-31T16:00:00Z");
    await run(); expect(probe).toHaveBeenCalledTimes(2);
  });
  it("retries failures instead of marking the day complete", async () => {
    const probe = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined);
    const run = createDailyHealthRunner(probe);
    await expect(run()).rejects.toThrow("offline");
    await run(); await run(); expect(probe).toHaveBeenCalledTimes(2);
  });
  it("prevents overlapping requests", async () => {
    let release: (() => void) | undefined;
    const probe = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const run = createDailyHealthRunner(probe);
    const first = run(); await run();
    expect(probe).toHaveBeenCalledTimes(1); release?.(); await first;
  });
});
