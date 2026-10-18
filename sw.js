const CACHE = "swing-signal-3491ab1d";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
const CHART_LIB = "https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js";

self.addEventListener("install", (e) => {
  const withTimeout = (p) => Promise.race([p, new Promise((r) => setTimeout(r, 10000))]);
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).then(() => withTimeout(c.add(CHART_LIB)).catch(() => {})))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // price data always comes from the network so signals are never stale
  if (url.hostname.includes("binance")) return;
  if (e.request.method !== "GET") return;
  // app files: try the network first (to get updates), fall back to the cache when offline
  e.respondWith(
    // "no-cache" makes the browser check GitHub for a newer file instead of reusing its own copy for up to 10 minutes
    fetch(e.request, url.origin === self.location.origin ? { cache: "no-cache" } : {})
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((cs) => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
