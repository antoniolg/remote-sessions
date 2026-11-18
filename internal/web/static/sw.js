// Caches the app shell so the PWA opens without the computer; API calls always go to the network.
const CACHE = "remote-sessions-v14";
const SHELL = [
  "./", "app.js", "app.css", "jsqr.js", "manifest.webmanifest", "icon-192.png", "apple-touch-icon.png",
  "js/api.js", "js/ask.js", "js/computers.js", "js/create.js", "js/dom.js", "js/nav.js", "js/pair.js", "js/scanner.js", "js/sessions.js", "js/settings.js", "js/url.js", "js/i18n.js",
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
        if (response.ok) {
          const copy = response.clone();
          // One entry per file: the list's filters live in the query string.
          caches.open(CACHE).then((cache) => cache.put(url.pathname, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request, { ignoreSearch: true })) || Response.error()),
  );
});
