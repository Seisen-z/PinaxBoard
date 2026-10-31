import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => mock }));
import { clearPendingSignup, getPendingSignup, setPendingSignup } from "./pending-signup";
beforeEach(() => { vi.clearAllMocks(); });
describe("pending signup cookies", () => {
  it("stores only normalized email/navigation timestamps with HTTP-only options", async () => {
    await setPendingSignup(" Sam@Example.com ");
    expect(mock.set).toHaveBeenCalledWith("tackly-signup-email", "sam@example.com", expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 1800 }));
    expect(mock.set.mock.calls.some(call => String(call[0]).includes("password"))).toBe(false);
  });
  it("does not invent a resend cooldown when signing in to an unconfirmed account", async () => {
    await setPendingSignup("sam@example.com", false);
    expect(mock.set).toHaveBeenCalledWith("tackly-signup-sent-at", "0", expect.anything());
  });
  it("rejects missing or malformed pending addresses", async () => {
    mock.get.mockReturnValue(undefined); expect(await getPendingSignup()).toBeNull();
    mock.get.mockReturnValue({ value: "not-email" }); expect(await getPendingSignup()).toBeNull();
  });
  it("caps an untrusted timestamp to a UI hint of sixty seconds", async () => {
    mock.get.mockImplementation((name: string) => ({ value: name === "tackly-signup-email" ? "sam@example.com" : String(Date.now() + 1000000) }));
    expect(await getPendingSignup()).toMatchObject({ email: "sam@example.com", retryAfterSeconds: 60 });
  });
  it("clears both cookies", async () => {
    await clearPendingSignup(); expect(mock.delete).toHaveBeenCalledWith("tackly-signup-email"); expect(mock.delete).toHaveBeenCalledWith("tackly-signup-sent-at");
  });
});
