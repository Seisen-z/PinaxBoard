"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clearDevelopmentWorker } from "./development-worker";
/** Persist only fetched workspace/board/vocabulary facts; never session tokens or in-flight mutations. */
export function useOfflineDirectory(ownerId: string | null) {
  const client = useQueryClient();
  useEffect(() => {
    if (!ownerId) return;
    const key = `tackly:directory:${ownerId}`;
    try { const entries = JSON.parse(localStorage.getItem(key) ?? "[]") as { key: readonly unknown[]; data: unknown }[];
      for (const entry of entries) if (Array.isArray(entry.key) && entry.key[0] === "workspaces" && !client.getQueryData(entry.key)) client.setQueryData(entry.key, entry.data);
    } catch { /* A corrupt directory is refetched; note journals remain independent. */ }
    const persist = () => {
      const entries = client.getQueryCache().getAll().filter((query) => query.queryKey[0] === "workspaces" && query.state.status === "success").map((query) => ({ key: query.queryKey, data: query.state.data }));
      try { localStorage.setItem(key, JSON.stringify(entries)); } catch { /* Note save status reports device quota errors. */ }
    };
    return client.getQueryCache().subscribe(persist);
  }, [client, ownerId]);
}
export function useOfflineShell(ownerId: string | null) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void clearDevelopmentWorker(navigator.serviceWorker, "caches" in window ? window.caches : undefined, location.origin)
        .catch(() => { console.warn("Development offline cache cleanup did not finish. Restart dev and reload the page."); });
      return;
    }
    let active = true;
    void navigator.serviceWorker.register("/offline-worker.js").then(async (registration) => {
      await navigator.serviceWorker.ready;
      if (!active) return;
      const worker = registration.active;
      const assets = performance.getEntriesByType("resource").map((entry) => entry.name).filter((url) => url.startsWith(location.origin + "/_next/static/"));
      worker?.postMessage({ type: "SESSION", owner: ownerId ?? "local", assets });
    }).catch(() => { /* Live-page offline editing still uses the durable journal. */ });
    return () => { active = false; };
  }, [ownerId]);
}
