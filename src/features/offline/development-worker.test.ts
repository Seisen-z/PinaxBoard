import { describe, expect, it, vi } from "vitest";
import { clearDevelopmentWorker } from "./development-worker";
const origin = "http://localhost:3000";
function registration(scriptURL: string, stage: "active" | "waiting" | "installing" = "active") {
  return { active: null, waiting: null, installing: null, [stage]: { scriptURL }, unregister: vi.fn(async () => true) };
}
describe("development offline cache cleanup", () => {
  it("unregisters only the same-origin Tackly worker and removes only its CacheStorage entries", async () => {
    const own = registration(origin + "/offline-worker.js"), other = registration(origin + "/other-worker.js");
    const storage = { keys: async () => ["tackly-static-v1", "tackly-shell-local", "tackly-meta-v1", "other-cache"], delete: vi.fn(async (name: string) => Boolean(name)) };
    await clearDevelopmentWorker({ getRegistrations: async () => [own, other] }, storage, origin);
    expect(own.unregister).toHaveBeenCalledOnce(); expect(other.unregister).not.toHaveBeenCalled();
    expect(storage.delete.mock.calls.map(call => call[0])).toEqual(["tackly-static-v1", "tackly-shell-local", "tackly-meta-v1"]);
  });
  it("handles a waiting worker and an installing worker", async () => {
    const waiting = registration(origin + "/offline-worker.js?v=2", "waiting"), installing = registration(origin + "/offline-worker.js", "installing");
    await clearDevelopmentWorker({ getRegistrations: async () => [waiting, installing] }, undefined, origin);
    expect(waiting.unregister).toHaveBeenCalledOnce(); expect(installing.unregister).toHaveBeenCalledOnce();
  });
  it("does not unregister a foreign-origin lookalike", async () => {
    const foreign = registration("https://elsewhere.example/offline-worker.js");
    await clearDevelopmentWorker({ getRegistrations: async () => [foreign] }, undefined, origin);
    expect(foreign.unregister).not.toHaveBeenCalled();
  });
  it("works without CacheStorage support", async () => {
    const own = registration(origin + "/offline-worker.js");
    await clearDevelopmentWorker({ getRegistrations: async () => [own] }, undefined, origin); expect(own.unregister).toHaveBeenCalledOnce();
  });
  it("cleans orphaned Tackly shell caches without an existing registration", async () => {
    const storage = { keys: async () => ["tackly-static-v1", "unrelated"], delete: vi.fn(async (name: string) => Boolean(name)) };
    await clearDevelopmentWorker({ getRegistrations: async () => [] }, storage, origin);
    expect(storage.delete).toHaveBeenCalledExactlyOnceWith("tackly-static-v1");
  });
  it("surfaces cleanup failure for the hook to report without clearing note data", async () => {
    await expect(clearDevelopmentWorker({ getRegistrations: async () => { throw new Error("Unavailable"); } }, undefined, origin)).rejects.toThrow("Unavailable");
    expect(localStorage.getItem("tackly:notes")).not.toBeNull();
  });
});
