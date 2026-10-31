interface Registration {
  active: { scriptURL: string } | null;
  waiting: { scriptURL: string } | null;
  installing: { scriptURL: string } | null;
  unregister: () => Promise<boolean>;
}

/** Remove only Tackly app-shell caches in development, never notes or other workers. */
export async function clearDevelopmentWorker(
  workers: { getRegistrations: () => Promise<readonly Registration[]> },
  cacheStorage: Pick<CacheStorage, "keys" | "delete"> | undefined,
  origin: string,
): Promise<boolean> {
  const registrations = await workers.getRegistrations();
  const owned = registrations.filter(registration => [registration.active, registration.waiting, registration.installing]
    .some(worker => {
      if (!worker) return false;
      const url = new URL(worker.scriptURL, origin);
      return url.origin === origin && url.pathname === "/offline-worker.js";
    }));
  const removed = (await Promise.all(owned.map(registration => registration.unregister()))).some(Boolean);
  if (!cacheStorage) return removed;
  const names = await cacheStorage.keys();
  await Promise.all(names.filter(name => ["tackly-static-", "tackly-shell-", "tackly-meta-"].some(prefix => name.startsWith(prefix)))
    .map(name => cacheStorage.delete(name)));
  return removed;
}
