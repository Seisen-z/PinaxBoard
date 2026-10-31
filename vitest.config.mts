import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Resolves the `@/*` alias from tsconfig.json natively — no extra plugin.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    // Fresh worker/environment per file, without forked-process startup pressure.
    pool: "threads",
    isolate: true,
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    css: false,
    restoreMocks: true,
    /*
     * Integration tests drive the whole shell through userEvent, which is slow
     * in jsdom — a single click can take a second or two under load. The 5s
     * default turns that into flake that looks like a product bug. The shell
     * integration tests take ~20s each when the whole suite runs in parallel.
     */
    testTimeout: 60_000,
  },
});
