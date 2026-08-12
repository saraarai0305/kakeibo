/* Offline shell. Data lives in localStorage, never in this cache. */
const CACHE = "mainichi-v0.31.10";
const ASSETS = [
  "./",
  "./index.html",
  "./ui-v2.css?v=0.31.10",
  "./ui-analog.css?v=0.31.10",
  "./ui-paper-baseline.css?v=0.31.10",
  "./ui-v2.js?v=0.31.10",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first so edits show up, cache as the offline fallback
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  // 版の確認だけは絶対にキャッシュを挟まない
  if (new URL(e.request.url).pathname.endsWith("/version.txt")) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
