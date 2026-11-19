// Mudar a versão aqui descarta o cache anterior no evento `activate`.
const CACHE_NAME = "mock-studio-v2";
const APP_SHELL_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ),
  );
  self.clients.claim();
});

function isCacheableResponse(response) {
  return Boolean(response && response.status === 200 && response.type === "basic");
}

function storeInCache(request, response) {
  if (!isCacheableResponse(response)) {
    return;
  }

  const copy = response.clone();
  void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Só a própria origem em http(s): evita tentar cachear extensões do
  // navegador (`chrome-extension:`), blobs e requisições de terceiros.
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/")),
    );
    return;
  }

  // Bundles em `/_next/static/` levam hash no nome (são imutáveis): cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          storeInCache(event.request, networkResponse);
          return networkResponse;
        });
      }),
    );
    return;
  }

  // Demais arquivos da própria origem (modelos, stickers, fontes, manifest)
  // têm URL fixa: busca na rede primeiro para não prender versões antigas, e
  // cai no cache quando estiver offline.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        storeInCache(event.request, networkResponse);
        return networkResponse;
      })
      .catch(() => caches.match(event.request)),
  );
});
