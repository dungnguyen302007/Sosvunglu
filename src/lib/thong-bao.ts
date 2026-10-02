import { backend } from './backend'
import { cauHinh } from './config'

/**
 * Thông báo đẩy phía điện thoại: xin quyền, đăng ký với trình duyệt, gửi đăng ký về máy chủ.
 * Service worker (public/sw.js) là thứ nhận tin và hiện thông báo khi app đang đóng / màn hình tắt.
 */

export type TrangThaiDay =
  | 'bat' // đã bật trên máy này
  | 'hoi' // bật được, chưa xin quyền
  | 'tu-choi' // người dùng / máy đã chặn thông báo
  | 'ios-chua-cai' // iPhone: phải "Thêm vào MH chính" rồi mở từ biểu tượng đó
  | 'khong-ho-tro'
  | 'chua-cau-hinh' // máy chủ chưa có khoá VAPID

export function trangThaiDay(): TrangThaiDay {
  if (!cauHinh.vapid) return 'chua-cau-hinh'
  const laIos = /iPhone|iPad/i.test(navigator.userAgent)
  const daCai = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return laIos && !daCai ? 'ios-chua-cai' : 'khong-ho-tro'
  if (Notification.permission === 'denied') return 'tu-choi'
  return Notification.permission === 'granted' ? 'bat' : 'hoi'
}

function khoaSangBytes(base64: string): Uint8Array {
  const b = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0))
}

/**
 * Xin quyền (nếu chưa) + đăng ký + gửi về máy chủ. Gọi từ một lần BẤM của người dùng.
 * Gọi lại khi đã có quyền cũng được — dùng để làm mới đăng ký mỗi lần mở app.
 */
export async function batThongBaoDay(): Promise<TrangThaiDay> {
  const tt = trangThaiDay()
  if (tt !== 'hoi' && tt !== 'bat') return tt
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return trangThaiDay()
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return 'khong-ho-tro' // bản chạy thử trên máy lập trình không bật service worker
  const dk =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: khoaSangBytes(cauHinh.vapid) as BufferSource }))
  const j = dk.toJSON()
  if (!j.endpoint || !j.keys?.p256dh || !j.keys.auth) return 'khong-ho-tro'
  await backend.savePush({ endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } })
  return 'bat'
}

/** Đăng xuất: gỡ đăng ký trên máy này để người sau dùng máy không nhận tin của mình. */
export async function tatThongBaoDay() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    const dk = await reg?.pushManager.getSubscription()
    if (!dk) return
    await backend.removePush(dk.endpoint).catch(() => {})
    await dk.unsubscribe()
  } catch {
    /* bỏ qua */
  }
}
