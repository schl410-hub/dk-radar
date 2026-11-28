/* 딮기 관리자 전용 서비스 워커 — 범위는 /admin 만.
 * 메인 앱 sw.js(범위 /)와 분리되어, 관리자 앱은 메인 앱 캐시(index.html)를 쓰지 않습니다.
 * 실시간 값(/api/*)은 절대 캐시하지 않습니다.
 */
const CACHE = 'dk-admin-v2';
const ASSETS = [
  '/admin.html',
  '/admin.css',
  '/admin.js',
  '/manifest-admin.json',
  '/icons/admin-192.png',
  '/icons/admin-512.png',
  '/icons/admin-icon.svg',
  '/fonts/pretendard-subset.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return; /* 항상 실시간 */

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/admin.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/admin.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
