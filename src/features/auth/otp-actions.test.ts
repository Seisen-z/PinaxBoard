import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  configured: vi.fn(() => true), redirect: vi.fn((path: string): never => { throw new Error(`redirect:${path}`); }),
  revalidate: vi.fn(), pending: vi.fn(), setPending: vi.fn(), clearPending: vi.fn(), limit: vi.fn(),
  signUp: vi.fn(), signIn: vi.fn(), verify: vi.fn(), resend: vi.fn(), signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mock.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/lib/env", () => ({ isSupabaseConfigured: mock.configured }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: {
  signUp: mock.signUp, signInWithPassword: mock.signIn, verifyOtp: mock.verify, resend: mock.resend, signOut: mock.signOut,
} }) }));
vi.mock("./pending-signup", () => ({ getPendingSignup: mock.pending, setPendingSignup: mock.setPending, clearPendingSignup: mock.clearPending }));
vi.mock("./otp-rate-limit", () => ({ consumeOtpLimit: mock.limit }));
import { changeSignupEmailAction, resendSignupCodeAction, signInAction, signUpAction, verifySignupCodeAction } from "./actions";

const idle = { status: "idle" as const };
function form(values: Record<string, string>) { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; }
beforeEach(() => {
  vi.clearAllMocks(); mock.configured.mockReturnValue(true);
  mock.limit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  mock.pending.mockResolvedValue({ email: "sam@example.com", retryAfterSeconds: 0 });
  mock.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mock.verify.mockResolvedValue({ data: { session: { access_token: "fixture" } }, error: null });
  mock.resend.mockResolvedValue({ error: null });
});
describe("signup OTP actions", () => {
  it("advances signup to verification without placing password or email in URL", async () => {
    await expect(signUpAction(idle, form({ email: "sam@example.com", password: "long-password" }))).rejects.toThrow("redirect:/verify-email");
    expect(mock.limit).toHaveBeenCalledWith("sam@example.com", "send");
    expect(mock.setPending).toHaveBeenCalledWith("sam@example.com");
    expect(mock.verify).not.toHaveBeenCalled();
  });
  it("validates signup before charging send attempts", async () => {
    expect((await signUpAction(idle, form({ email: "bad", password: "short" }))).fieldErrors?.email).toBeTruthy();
    expect(mock.limit).not.toHaveBeenCalled(); expect(mock.signUp).not.toHaveBeenCalled();
  });
  it("stops rate-limited signup before sending an email", async () => {
    mock.limit.mockResolvedValue({ allowed: false, retryAfterSeconds: 40 });
    expect((await signUpAction(idle, form({ email: "sam@example.com", password: "long-password" }))).retryAfterSeconds).toBe(40);
    expect(mock.signUp).not.toHaveBeenCalled();
  });
  it("does not advance signup when mail delivery is rejected", async () => {
    mock.signUp.mockResolvedValue({ data: {}, error: { message: "Error sending confirmation email" } });
    expect((await signUpAction(idle, form({ email: "sam@example.com", password: "long-password" }))).message).toContain("couldn't send");
    expect(mock.setPending).not.toHaveBeenCalled();
  });
  it("rejects an unconfirmed password login without verification redirect or email", async () => {
    mock.signIn.mockResolvedValue({ error: { code: "email_not_confirmed", message: "Email not confirmed" } });
    const result = await signInAction(idle, form({ email: "sam@example.com", password: "long-password" }));
    expect(result.status).toBe("error"); expect(result.message).toContain("Create an account first");
    expect(mock.setPending).not.toHaveBeenCalled(); expect(mock.resend).not.toHaveBeenCalled();
  });
  it("ignores a submitted email and verifies only the server's pending address", async () => {
    await expect(verifySignupCodeAction(idle, form({ email: "other@example.com", code: "123456" }))).rejects.toThrow("redirect:/");
    expect(mock.verify).toHaveBeenCalledWith({ email: "sam@example.com", token: "123456", type: "email" });
    expect(mock.clearPending).toHaveBeenCalled(); expect(mock.revalidate).toHaveBeenCalledWith("/", "layout");
  });
  it("rejects malformed codes before consuming attempts or calling Auth", async () => {
    expect((await verifySignupCodeAction(idle, form({ code: "123" }))).fieldErrors?.code).toBeTruthy();
    expect(mock.limit).not.toHaveBeenCalled(); expect(mock.verify).not.toHaveBeenCalled();
  });
  it("rejects an expired pending session", async () => {
    mock.pending.mockResolvedValue(null);
    expect((await verifySignupCodeAction(idle, form({ code: "123456" }))).message).toContain("session expired");
    expect(mock.verify).not.toHaveBeenCalled();
  });
  it("denies verification when the durable attempt limit is exhausted", async () => {
    mock.limit.mockResolvedValue({ allowed: false, retryAfterSeconds: 500 });
    expect((await verifySignupCodeAction(idle, form({ code: "123456" }))).retryAfterSeconds).toBe(500);
    expect(mock.verify).not.toHaveBeenCalled();
  });
  it("fails closed when the rate-limit service is unavailable", async () => {
    mock.limit.mockRejectedValue(new Error("offline"));
    expect((await verifySignupCodeAction(idle, form({ code: "123456" }))).message).toContain("temporarily unavailable");
    expect(mock.verify).not.toHaveBeenCalled();
  });
  it("keeps pending signup on wrong, expired or reused codes", async () => {
    mock.verify.mockResolvedValue({ data: { session: null }, error: { message: "expired" } });
    expect((await verifySignupCodeAction(idle, form({ code: "123456" }))).message).toContain("invalid or has expired");
    expect(mock.clearPending).not.toHaveBeenCalled(); expect(mock.redirect).not.toHaveBeenCalled();
  });
  it("does not treat a missing session as successful verification", async () => {
    mock.verify.mockResolvedValue({ data: { session: null }, error: null });
    expect((await verifySignupCodeAction(idle, form({ code: "123456" }))).status).toBe("error");
    expect(mock.clearPending).not.toHaveBeenCalled();
  });
  it("resends signup codes only after the server-side send limit allows it", async () => {
    expect(await resendSignupCodeAction(idle, new FormData())).toMatchObject({ status: "success", retryAfterSeconds: 60 });
    expect(mock.limit).toHaveBeenCalledWith("sam@example.com", "send");
    expect(mock.resend).toHaveBeenCalledWith({ type: "signup", email: "sam@example.com" });
    expect(mock.setPending).toHaveBeenCalledWith("sam@example.com");
  });
  it("does not trust a client request to skip resend cooldown", async () => {
    mock.limit.mockResolvedValue({ allowed: false, retryAfterSeconds: 55 });
    expect((await resendSignupCodeAction(idle, form({ force: "true" }))).retryAfterSeconds).toBe(55);
    expect(mock.resend).not.toHaveBeenCalled();
  });
  it("clears pending email when choosing another address", async () => {
    await expect(changeSignupEmailAction()).rejects.toThrow("redirect:/register"); expect(mock.clearPending).toHaveBeenCalled();
  });
});
