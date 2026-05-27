const CACHE_VERSION = "vendorhub-pwa-v14";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const APP_SHELL = [
  "/",
  "/search",
  "/orders",
  "/tracking",
  "/wishlist",
  "/offline",
  "/offline.html",
  "/icon.svg",
];

const CACHEABLE_ROUTE = /^(\/|\/home|\/search|\/product\/|\/orders|\/tracking|\/wishlist|\/seller\/dashboard|\/seller\/orders|\/seller\/inventory|\/admin\/dashboard)/;
const STATIC_ASSET = /\.(?:js|css|woff2?|png|jpg|jpeg|webp|avif|svg|ico)$/i;
const IMAGE_ASSET = /\.(?:png|jpg|jpeg|webp|avif|svg)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (IMAGE_ASSET.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  if (STATIC_ASSET.test(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "VendorHub update";
  const options = {
    body: payload.body || "Your marketplace activity has a new update.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag || "vendorhub-commerce",
    data: { url: payload.url || "/orders", type: payload.type || "commerce" },
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Later" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const focused = clients.find((client) => client.url === targetUrl || client.url.endsWith(event.notification.data?.url || "/"));
      if (focused) return focused.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirstPage(request) {
  const url = new URL(request.url);
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok && CACHEABLE_ROUTE.test(url.pathname)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match("/offline.html");
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

function readPushPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return {};
  }
}
