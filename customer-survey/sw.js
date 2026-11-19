// Customer Survey — service worker: mở được khi mạng yếu (trang + giao diện lưu sẵn, luôn thử mạng trước để lấy bản mới),
// nhận thông báo đẩy (push) khi có câu trả lời khảo sát mới, bấm thông báo ⇒ mở đúng khảo sát. Dữ liệu khảo sát KHÔNG lưu ở đây.
// Đổi quy tắc lưu ⇒ tăng V.
const V = 'cs-v1';
const SHELL = ['./', './app.css?v=2.6', './app.js?v=2.6', './manifest.webmanifest', './icons/icon-192.png', './icons/badge-96.png'];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('cs-') && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url), scope = new URL(self.registration.scope).pathname;
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(scope)) return;
  e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((ca) => ca.put(r, c)); } return res; })
    .catch(() => caches.match(r).then((m) => m || (r.mode === 'navigate' ? caches.match('./') : undefined))));
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'Customer Survey', { body: d.body || 'Có câu trả lời khảo sát mới', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
      tag: d.tag || 'customer-survey', renotify: true, data: { url: d.url || './' } }),
    self.clients.matchAll({ type: 'window' }).then((cs) => cs.forEach((c) => c.postMessage({ t: 'push' })))
  ]));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if (c.url.indexOf(new URL('./', self.registration.scope).href) === 0) { c.focus(); return c.navigate ? c.navigate(url) : null; } }
    return self.clients.openWindow(url);
  }));
});
