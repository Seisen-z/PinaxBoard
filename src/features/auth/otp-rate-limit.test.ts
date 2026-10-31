import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
import { consumeOtpLimit } from "./otp-rate-limit";
const request = vi.fn();
beforeEach(() => { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.example"); vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture-service-key"); vi.stubGlobal("fetch", request); request.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("server verification rate checks", () => {
  it("sends a normalized digest, never raw email/password/code", async () => {
    request.mockResolvedValue(Response.json({ allowed: true, retryAfterSeconds: 0 }));
    await consumeOtpLimit(" Sam@Example.com ", "verify");
    const call = request.mock.calls[0]; const options = call?.[1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({ p_identifier_hash: createHash("sha256").update("sam@example.com").digest("hex"), p_kind: "verify" });
    expect(String(options.body)).not.toContain("sam@example.com");
  });
  it("returns the database cooldown", async () => {
    request.mockResolvedValue(Response.json({ allowed: false, retryAfterSeconds: 42 }));
    expect(await consumeOtpLimit("sam@example.com", "send")).toEqual({ allowed: false, retryAfterSeconds: 42 });
  });
  it("rejects missing credentials rather than skipping limits", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(consumeOtpLimit("sam@example.com", "verify")).rejects.toThrow(); expect(request).not.toHaveBeenCalled();
  });
  it("rejects failed and malformed database responses", async () => {
    request.mockResolvedValue(new Response("", { status: 503 }));
    await expect(consumeOtpLimit("sam@example.com", "verify")).rejects.toThrow();
    request.mockResolvedValue(Response.json({ allowed: true, retryAfterSeconds: -1 }));
    await expect(consumeOtpLimit("sam@example.com", "verify")).rejects.toThrow();
  });
});
