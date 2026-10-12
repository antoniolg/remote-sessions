// Caches the app shell so the PWA opens without the computer; API calls always go to the network.
const CACHE = "remote-sessions-v2";
const SHELL = [
  "./", "app.js", "app.css", "jsqr.js", "manifest.webmanifest", "icon-192.png", "apple-touch-icon.png",
  "js/api.js", "js/create.js", "js/diagnostics.js", "js/dom.js", "js/nav.js", "js/pair.js", "js/scanner.js", "js/sessions.js", "js/token.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || !url.pathname.startsWith("/app/")) return;
  // Network first: the shell follows the server's version, and the cache covers the computer being away.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
