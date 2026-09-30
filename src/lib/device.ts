import type { LatLng } from './geo'
import { storage } from './storage'

export interface Position extends LatLng {
  accuracy: number | null
  at: string
  /** true nếu là vị trí cũ lưu trong máy, không phải vị trí vừa đo */
  stale?: boolean
}

const LAST_POS_KEY = 'last_pos'

export function lastKnownPosition(): Position | null {
  return storage.get<Position>(LAST_POS_KEY)
}

/** Lấy GPS một lần; lỗi hoặc quá lâu thì trả về vị trí cuối cùng đã lưu. */
export function getPosition(timeoutMs = 15000): Promise<Position | null> {
  return new Promise((resolve) => {
    const fallback = () => {
      const last = lastKnownPosition()
      resolve(last ? { ...last, stale: true } : null)
    }
    if (!('geolocation' in navigator)) return fallback()
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: Position = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
          at: new Date().toISOString(),
        }
        storage.set(LAST_POS_KEY, pos)
        resolve(pos)
      },
      fallback,
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
    )
  })
}

interface BatteryManager {
  level: number
}

/** % pin (chỉ có trên Chrome Android / desktop), null nếu không đọc được. */
export async function getBattery(): Promise<number | null> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }
  if (!nav.getBattery) return null
  try {
    const b = await nav.getBattery()
    return Math.round(b.level * 100)
  } catch {
    return null
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* không hỗ trợ */
  }
}

/** Tiếng bíp báo động ngắn (không cần file âm thanh). */
export function beep(times = 3) {
  try {
    const Ctx = window.AudioContext
    const ctx = new Ctx()
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      osc.connect(gain)
      gain.connect(ctx.destination)
      const t = ctx.currentTime + i * 0.35
      gain.gain.setValueAtTime(0.3, t)
      osc.start(t)
      osc.stop(t + 0.2)
    }
  } catch {
    /* không hỗ trợ */
  }
}
