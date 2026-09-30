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
