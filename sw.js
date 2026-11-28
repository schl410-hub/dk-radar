/* 딮기 시그널 서비스 워커 · 오프라인 캐시 + 웹 푸시 */
const CACHE = 'dk-signal-v13';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './i18n.js',
  './data.js',
  './app.js',
  './manifest.webmanifest',
  './manifest.json',
  './logo/dpluskia.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/badge-96.png',
  './icons/favicon-32.png',
  './fonts/pretendard-subset.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
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

  /* 서버 API 는 항상 실시간 값을 씁니다(캐시 금지) */
  if (url.pathname.indexOf('/api/') > -1) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((hit) => hit || caches.match('./')))
    );
    return;
  }

  /* 앱 코드·데이터·스타일은 네트워크 우선: 새 버전이 바로 보이게. (실패하면 캐시) */
  const fresh = ['script', 'style', 'document', 'worker'].indexOf(req.destination) > -1;
  if (fresh) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});

/* ---------- 웹 푸시 ---------- */
/* 서버가 보내는 payload: {title, body, tag, url, kind, player} */
self.addEventListener('push', (event) => {
  let payload = { title: '딮기 시그널', body: '새 소식이 있어요.' };
  try { payload = Object.assign(payload, event.data.json()); } catch (e) {}

  const options = {
    body: payload.body,
    icon: './icons/icon-192.png',
    badge: './icons/badge-96.png',
    tag: payload.tag || 'dk-signal',
    renotify: true,
    lang: 'ko',
    data: { url: payload.url || './', kind: payload.kind || '' }
  };
  if (payload.kind === 'official') {
    options.actions = [{ action: 'open', title: '일정 보기' }];
  }
  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = data.url || './';

  /* 라이브 방송 알림처럼 외부 URL(SOOP·CHZZK)은 새 창으로 엽니다. */
  let external = false;
  try {
    const u = new URL(target, self.location.origin);
    external = u.origin !== self.location.origin;
  } catch (e) { external = false; }
  if (external && self.clients.openWindow) {
    event.waitUntil(self.clients.openWindow(target));
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.indexOf(self.registration.scope) === 0) {
          if ('navigate' in client && target) { try { client.navigate(target); } catch (e) {} }
          if ('focus' in client) return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

/* 브라우저가 구독을 갱신해야 할 때 서버에도 새 구독을 알립니다. */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const options = event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true };
      const sub = await self.registration.pushManager.subscribe(options);
      await fetch('./api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() })
      });
    } catch (e) { /* 앱을 다시 열면 재구독됩니다 */ }
  })());
});
