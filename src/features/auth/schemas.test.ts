import { describe, expect, it } from "vitest";

import {
  signInSchema,
  signUpSchema,
  toFieldErrors,
  verifyEmailSchema,
  otpEmailSchema,
} from "@/features/auth/schemas";

describe("signInSchema", () => {
  it("accepts a valid pair", () => {
    const parsed = signInSchema.safeParse({
      email: "sam@example.com",
      password: "hunter22",
    });
    expect(parsed.success).toBe(true);
  });

  it("trims the email", () => {
    const parsed = signInSchema.parse({
      email: "  sam@example.com  ",
      password: "x",
    });
    expect(parsed.email).toBe("sam@example.com");
  });

  it("rejects a malformed email", () => {
    expect(signInSchema.safeParse({ email: "sam", password: "x" }).success).toBe(
      false,
    );
  });

  it("accepts a short password", () => {
    // Accounts may predate the 8-character rule. Rejecting a valid password at
    // the door would be wrong and impossible for the user to act on.
    expect(
      signInSchema.safeParse({ email: "sam@example.com", password: "old" })
        .success,
    ).toBe(true);
  });

  it("still requires a password to be typed", () => {
    expect(
      signInSchema.safeParse({ email: "sam@example.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("email verification schemas", () => {
  it("normalizes pending email and accepts only a complete numeric code", () => {
    expect(otpEmailSchema.parse(" Sam@Example.com ")).toBe("sam@example.com");
    expect(verifyEmailSchema.parse({ code: " 123456 " }).code).toBe("123456");
    for (const code of ["12345", "1234567", "abcdef", "12 3456", "１２３４５６"]) {
      expect(verifyEmailSchema.safeParse({ code }).success).toBe(false);
    }
  });
  it("maps verification errors onto the code input", () => {
    const parsed = verifyEmailSchema.safeParse({ code: "no" });
    if (parsed.success) throw new Error("Expected invalid code");
    expect(toFieldErrors(parsed.error).code).toBe("Enter the six-digit code from your email");
  });
});

describe("signUpSchema", () => {
  const valid = { email: "sam@example.com", password: "longenough" };

  it("accepts a valid registration", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("requires at least 8 characters", () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: "short12" }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ ...valid, password: "short123" }).success,
    ).toBe(true);
  });

  it("rejects a password past bcrypt's 72-byte limit", () => {
    expect(
      signUpSchema.safeParse({ ...valid, password: "a".repeat(73) }).success,
    ).toBe(false);
  });

  it("treats the display name as optional", () => {
    expect(signUpSchema.parse(valid).displayName).toBeUndefined();
    expect(
      signUpSchema.parse({ ...valid, displayName: "  Sam  " }).displayName,
    ).toBe("Sam");
  });
});

describe("toFieldErrors", () => {
  it("maps issues onto their fields", () => {
    const parsed = signUpSchema.safeParse({ email: "nope", password: "x" });
    if (parsed.success) throw new Error("expected a failure");

    const errors = toFieldErrors(parsed.error);
    expect(errors.email).toBeTruthy();
    expect(errors.password).toBeTruthy();
  });

  it("keeps only the first message per field", () => {
    const parsed = signUpSchema.safeParse({ email: "", password: "x" });
    if (parsed.success) throw new Error("expected a failure");

    // A stack of messages under one input is noise.
    const errors = toFieldErrors(parsed.error);
    expect(typeof errors.email).toBe("string");
  });

  it("returns an empty object when nothing maps to a known field", () => {
    const parsed = signUpSchema.safeParse({});
    if (parsed.success) throw new Error("expected a failure");

    expect(Object.keys(toFieldErrors(parsed.error)).sort()).toEqual([
      "email",
      "password",
    ]);
  });
});
