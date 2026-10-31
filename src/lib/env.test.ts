import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

const original = {
  url: process.env[URL_KEY],
  key: process.env[KEY_KEY],
};

function setEnv(url: string | undefined, key: string | undefined) {
  if (url === undefined) delete process.env[URL_KEY];
  else process.env[URL_KEY] = url;

  if (key === undefined) delete process.env[KEY_KEY];
  else process.env[KEY_KEY] = key;
}

beforeEach(() => {
  setEnv(undefined, undefined);
});

afterEach(() => {
  setEnv(original.url, original.key);
});

describe("isSupabaseConfigured", () => {
  it("is false with nothing set", () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is false with only one variable set", () => {
    setEnv("https://abc.supabase.co", undefined);
    expect(isSupabaseConfigured()).toBe(false);

    setEnv(undefined, "anon-key");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is false for a malformed URL", () => {
    setEnv("abc.supabase.co", "anon-key");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is false for empty strings", () => {
    // A blank line in .env.local produces "" rather than undefined, and an
    // empty key would otherwise reach the client library as a real value.
    setEnv("", "");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is true once both are valid", () => {
    setEnv("https://abc.supabase.co", "anon-key");
    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe("getSupabaseEnv", () => {
  it("returns the validated values", () => {
    setEnv("https://abc.supabase.co", "anon-key");

    expect(getSupabaseEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });
  });

  it("throws with an actionable message when unset", () => {
    // "Invalid URL" three frames into a client library is not actionable; the
    // error has to name the file to fix.
    expect(() => getSupabaseEnv()).toThrow(/\.env\.local/);
    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("names every missing variable, not just the first", () => {
    try {
      getSupabaseEnv();
      throw new Error("expected getSupabaseEnv to throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(message).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
  });
});
