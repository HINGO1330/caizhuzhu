const CACHE = "caizhuzhu-pwa-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./favicon.svg",
  "./icon-192-v2.png",
  "./apple-touch-icon-v2.png",
  "./manifest.webmanifest",
  "./src/app.js",
  "./src/ai.js",
  "./src/ai-config.js",
  "./src/domain.js",
  "./src/images.js",
  "./src/install.js",
  "./src/state.js",
  "./src/storage.js",
  "./src/views.js",
  "./src/recipe-pack.js",
  "./src/recipe-discovery.js",
  "./src/shopping-share.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
