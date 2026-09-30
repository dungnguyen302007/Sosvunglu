import { useEffect, useState } from 'react'

/** Khóa Google Maps (tùy chọn). Không có khóa thì app dùng nền bản đồ miễn phí, không gọi Google. */
export const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

/** off = không dùng Google (không khóa / lỗi khóa / lỗi mạng); loading = đang tải; ready = dùng được. */
export type GoogleStatus = 'off' | 'loading' | 'ready'

/** Sự kiện báo Google lỗi (khóa sai, sai tên miền, hết hạn mức...) → app quay về nền miễn phí. */
export const GOOGLE_FAILED_EVENT = 'google-maps-failed'

type GoogleWindow = Window & {
  google?: { maps?: { Map?: unknown } }
  gm_authFailure?: () => void
  __initGoogleMaps?: () => void
}

let loading: Promise<boolean> | null = null

/** Tải Google Maps JavaScript API một lần. Trả về true nếu tải được. */
export function loadGoogleMaps(key: string | undefined = GOOGLE_KEY, timeoutMs = 8000): Promise<boolean> {
  if (!key) return Promise.resolve(false)
  const w = window as GoogleWindow
  if (w.google?.maps?.Map) return Promise.resolve(true)
  if (loading) return loading
  loading = new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(false), timeoutMs)
    const done = (ok: boolean) => {
      window.clearTimeout(timer)
      resolve(ok)
    }
    // Google gọi hàm này khi khóa bị từ chối (sai khóa, sai tên miền, chưa bật thanh toán...)
    w.gm_authFailure = () => window.dispatchEvent(new Event(GOOGLE_FAILED_EVENT))
    w.__initGoogleMaps = () => done(true)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__initGoogleMaps&language=vi&region=VN`
    s.async = true
    s.onerror = () => done(false)
    document.head.appendChild(s)
  })
  return loading
}

export function useGoogleStatus(): GoogleStatus {
  const [status, setStatus] = useState<GoogleStatus>(GOOGLE_KEY ? 'loading' : 'off')
  useEffect(() => {
    if (!GOOGLE_KEY) return
    let alive = true
    void loadGoogleMaps().then((ok) => {
      if (alive) setStatus(ok ? 'ready' : 'off')
    })
    const onFail = () => setStatus('off')
    window.addEventListener(GOOGLE_FAILED_EVENT, onFail)
    return () => {
      alive = false
      window.removeEventListener(GOOGLE_FAILED_EVENT, onFail)
    }
  }, [])
  return status
}
