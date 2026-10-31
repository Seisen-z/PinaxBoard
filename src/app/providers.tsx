"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { createQueryClient } from "@/lib/query-client";

export interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers mounted once at the root.
 *
 * The QueryClient is created in state rather than at module scope: a module
 * singleton is shared across requests on the server, which would leak one
 * user's cached data into another's render.
 *
 * Nothing fetches through TanStack Query yet — Supabase arrives in Milestone 5 —
 * but the provider is in place so feature hooks can be added without touching
 * the root layout.
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
