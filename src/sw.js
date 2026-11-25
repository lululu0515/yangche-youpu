const scope = self.registration.scope;
const prefix = `yangche-shell:${new URL(scope).pathname}:`;
const cacheName = `${prefix}crystal-dock-9-6`;
const shell = ["./", "index.html", "styles.css", "dock-material.js", "cars.js", "webdav.js", "dock-refraction.png", "app.js",
  "dock-body-map.png", "dock-body-light.png", "dock-lens-light.png",
  "manifest.webmanifest", "icons/icon-180.png", "icons/brand-192.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];
const shellUrls = new Set(shell.map((asset) => new URL(asset, scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName)
    .then((cache) => cache.addAll(shell.map((asset) => new Request(new URL(asset, scope), { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key !== cacheName && (key.startsWith(prefix) || key === "yangche-v1"))
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(scope)) return;
  if (!shellUrls.has(event.request.url) && event.request.mode !== "navigate") return;
  event.respondWith(caches.open(cacheName).then(async (cache) => {
    const hit = await cache.match(event.request);
    if (hit) return hit;
    try { return await fetch(event.request); } catch (error) {
      if (event.request.mode === "navigate") return await cache.match(new URL("index.html", scope)) || Response.error();
      throw error;
    }
  }));
});
