/*
 * Service worker SOS vùng lũ — để lúc MẤT MẠNG vẫn mở được app và bấm SOS (SOS vào hàng đợi
 * trong máy, có sóng tự gửi; xem src/lib/queue.ts).
 *
 *  - Trang "/" : mạng trước, mất mạng thì lấy bản đã cất.
 *  - /_next/static/* , ảnh, manifest : cất trước (tên tệp có mã băm, không bao giờ cũ).
 *  - /api/* : KHÔNG BAO GIỜ cất — dữ liệu có SĐT, vị trí, hồ sơ sức khoẻ; và phải luôn mới.
 *  - Ô bản đồ (tile) của nhà cung cấp ngoài: không cất (nặng, và điều khoản của họ).
 */
const BAN = 'sos-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(BAN).then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== BAN).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname === '/') {
            const copy = res.clone()
            caches.open(BAN).then((c) => c.put('/', copy))
          }
          return res
        })
        .catch(() => caches.match('/').then((r) => r || Response.error())),
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/') || /\.(svg|png|webmanifest|css|js|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(BAN).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})

/*
 * THÔNG BÁO ĐẨY: máy chủ báo "có SOS" cho cứu hộ / chỉ huy → hiện thông báo + rung, kể cả khi app đóng
 * hoặc màn hình tắt. Tin không chứa tên / SĐT / vị trí (đi qua máy chủ Google, Apple) — bấm vào mới mở app.
 */
self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch (_) {
    /* tin không phải JSON */
  }
  e.waitUntil(
    self.registration.showNotification(d.title || '🆘 SOS vùng lũ', {
      body: d.body || 'Có yêu cầu cứu hộ mới. Mở app để xem.',
      tag: d.tag || 'sos',
      renotify: true,
      requireInteraction: true,
      vibrate: [400, 200, 400, 200, 400],
      icon: '/favicon.svg',
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ds) => {
      const mo = ds.find((c) => 'focus' in c)
      return mo ? mo.focus() : self.clients.openWindow('/')
    }),
  )
})
