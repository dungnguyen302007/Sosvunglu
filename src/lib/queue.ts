import type { GuestSosInput, NewSos } from '../types'
import { cauHinh } from './config'
import { storage } from './storage'

/**
 * Hàng đợi SOS khi mất mạng: lưu trong máy, có sóng là tự gửi lại.
 * Chỉ giữ 1 SOS chờ gửi (mỗi người chỉ có 1 SOS đang mở).
 */
export type PendingSos =
  | { kind: 'user'; input: NewSos; queuedAt: string; attempts: number }
  | { kind: 'guest'; input: GuestSosInput; queuedAt: string; attempts: number }

const KEY = 'sos_pending'

export function getPending(): PendingSos | null {
  return storage.get<PendingSos>(KEY)
}

export function enqueue(item: Omit<PendingSos, 'queuedAt' | 'attempts'>): PendingSos {
  const pending = { ...item, queuedAt: new Date().toISOString(), attempts: 0 } as PendingSos
  storage.set(KEY, pending)
  return pending
}

export function clearPending() {
  storage.remove(KEY)
}

/**
 * Thử gửi SOS đang chờ. Thành công → xóa khỏi hàng đợi và trả kết quả.
 * Thất bại → tăng số lần thử, giữ lại, trả null.
 */
export async function flush<T>(send: (p: PendingSos) => Promise<T>): Promise<T | null> {
  const pending = getPending()
  if (!pending) return null
  try {
    const result = await send(pending)
    clearPending()
    return result
  } catch (err) {
    storage.set(KEY, { ...pending, attempts: pending.attempts + 1 })
    if (!isNetworkError(err)) throw err
    return null
  }
}

/** Lỗi do mạng (nên thử lại) hay lỗi dữ liệu / quyền (không nên thử lại mãi). */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /fetch|network|timeout|offline|Load failed/i.test(msg)
}

/** Nội dung SMS dự phòng: không dấu, ngắn gọn để vừa 1 tin (160 ký tự). */
export function smsBody(p: { name: string; phone: string; lat: number; lng: number; people: number }): string {
  const name = p.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .slice(0, 40)
  return `SOS ${name} ${p.phone} ${p.lat.toFixed(5)},${p.lng.toFixed(5)} ${p.people} nguoi https://maps.google.com/?q=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
}

export function smsLink(body: string, number = cauHinh.soSms): string {
  return `sms:${number}?body=${encodeURIComponent(body)}`
}
