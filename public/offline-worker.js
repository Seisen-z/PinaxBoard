/* Same-origin app-shell cache only. Supabase/auth/API traffic is NEVER cached here. */
const ASSETS = "tackly-static-v1";
const META = "tackly-meta-v1";
let session = null;
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
async function owner() { if (session) return session; const response = await (await caches.open(META)).match("/active-owner"); return response ? response.text() : null; }
self.addEventListener("message", (event) => {
  if (event.data?.type !== "SESSION" || typeof event.data.owner !== "string") return;
  event.waitUntil((async () => {
    const previous = await owner(); const requestedOwner = event.data.owner; session = requestedOwner;
    if (previous && previous !== session) await caches.delete("tackly-shell-" + previous);
    await (await caches.open(META)).put("/active-owner", new Response(session));
    const assets = (event.data.assets ?? []).filter((url) => new URL(url).origin === self.location.origin && new URL(url).pathname.startsWith("/_next/static/"));
    const cache = await caches.open(ASSETS); await Promise.all(assets.map(async (url) => { try { const response = await fetch(url); if (response.ok) await cache.put(url, response); } catch { /* Retry warming on the next visit. */ } }));
    try { const response = await fetch("/", { credentials: "include", cache: "no-store" }); if (response.ok && session === requestedOwner) await (await caches.open("tackly-shell-" + requestedOwner)).put("/", response); } catch { /* Existing shell remains available. */ }
  })());
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url); if (url.origin !== self.location.origin || event.request.method !== "GET") return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => { const cache = await caches.open(ASSETS); const cached = await cache.match(event.request); if (cached) return cached; const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; })()); return;
  }
  if (event.request.mode === "navigate" && url.pathname === "/") {
    event.respondWith((async () => { const current = await owner(); try { const response = await fetch(event.request); if (response.ok && current) await (await caches.open("tackly-shell-" + current)).put("/", response.clone()); return response; }
      catch (error) { if (current) { const cached = await (await caches.open("tackly-shell-" + current)).match("/"); if (cached) return cached; } throw error; }
    })());
  }
});
