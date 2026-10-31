import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render as baseRender,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/**
 * Renders with the providers the app itself mounts.
 *
 * The header's workspace switcher reads server state, so anything containing
 * `AppShell` needs a `QueryClientProvider`. Wrapping here rather than in every
 * test keeps that a detail of the harness.
 *
 * A fresh client per render, with retries off and no cache carried between
 * tests: a retry turns an expected failure into a multi-second timeout, and a
 * shared cache lets one test's data leak into the next.
 *
 * Import `render` from here instead of `@testing-library/react`; everything
 * else (`screen`, `within`, `act`, `fireEvent`) comes from the library as
 * usual.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return baseRender(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react";
