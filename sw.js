/* Offline shell. Data lives in localStorage, never in this cache. */
const CACHE = "mainichi-v0.32.9";
const ASSETS = [
  "./",
  "./index.html",
  "./ui-v2.css?v=0.32.9",
  "./ui-analog.css?v=0.32.9",
  "./ui-paper-baseline.css?v=0.32.9",
  "./ui-v2.js?v=0.32.9",
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

// サーバーから届くWeb Pushは、アプリが閉じている状態でもここで通知へ変換する。
self.addEventListener("push", e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(data.title || "予定のお知らせ", {
    body: data.body || "",
    tag: data.tag || "mainichi-schedule",
    icon: data.icon || "icons/icon-192.png",
    data: { url: data.url || "./index.html", date: data.date || "" }
  }));
});

// 通知をタップしたら、予定を確認できる画面へ戻す。
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const targetUrl=e.notification.data?.url || "./index.html";
  e.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
    const existing = list.find(client => client.url.includes("/index.html"));
    if(existing && "focus" in existing) return existing.focus();
    if(clients.openWindow) return clients.openWindow(targetUrl);
    return undefined;
  }));
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
