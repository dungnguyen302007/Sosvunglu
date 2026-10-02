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

/** Sai số (m) tối đa coi là "đủ tốt": tới mức này thì dừng chờ. */
export const GOOD_ACCURACY_M = 30
/** Sai số (m) lớn hơn mức này thì cảnh báo người dùng vị trí có thể lệch. */
export const POOR_ACCURACY_M = 150

/** Vì sao lần lấy vị trí gần nhất hỏng — để báo người dùng đúng việc cần làm (null = không lỗi). */
let lyDoHongGps: 'tu-choi' | 'khong-co' | null = null
/** Nguyên văn lỗi trình duyệt trả (mã + câu) — hiện kèm để chụp màn hình là biết kẹt ở đâu. */
let chiTietLoiGps = ''

/** Mô tả lỗi định vị kèm mã: 1 = bị chặn quyền, 2 = không xác định được vị trí, 3 = hết giờ chờ. */
export function moTaLoiGps(e: GeolocationPositionError): string {
  return `mã ${e.code}${e.message ? ` — ${e.message}` : ''}`
}

/** Câu hướng dẫn theo lý do GPS hỏng lần gần nhất. */
export function loiGpsGanNhat(): string {
  return `${cauLoiGps()}${chiTietLoiGps ? ` [${chiTietLoiGps}]` : ' [hết 12 giây chưa có toạ độ]'}`
}

function cauLoiGps(): string {
  if (lyDoHongGps === 'tu-choi')
    return /iPhone|iPad/i.test(navigator.userAgent)
      ? 'Máy đang CHẶN quyền vị trí của trang này. iPhone: Cài đặt → Quyền riêng tư & Bảo mật → Dịch vụ định vị → bật, rồi chọn trình duyệt đang dùng (Trang web Safari) → "Khi dùng ứng dụng". Quay lại trang, tải lại và bấm Cho phép khi được hỏi.'
      : 'Trình duyệt đang CHẶN quyền vị trí của trang này. Bấm biểu tượng bên trái thanh địa chỉ → Quyền → Vị trí → Cho phép (nếu máy báo "không thể yêu cầu cấp quyền": tắt các app đang nổi trên màn hình rồi thử lại).'
  return 'Không bắt được GPS (trong nhà / sóng yếu?). Ra chỗ thoáng rồi thử lại.'
}

/**
 * Lấy vị trí: theo dõi GPS tối đa `timeoutMs` và lấy kết quả CHÍNH XÁC NHẤT
 * (lần đo đầu tiên thường là vị trí thô theo Wi-Fi/mạng, lệch hàng trăm mét đến vài km).
 * Dừng sớm khi sai số ≤ 30 m. Lỗi hoặc không đo được thì trả vị trí cũ (stale = true).
 */
export function getPosition(timeoutMs = 12000): Promise<Position | null> {
  return new Promise((resolve) => {
    const fallback = () => {
      const last = lastKnownPosition()
      resolve(last ? { ...last, stale: true } : null)
    }
    if (!('geolocation' in navigator)) return fallback()
    lyDoHongGps = null
    chiTietLoiGps = ''

    let best: Position | null = null
    let finished = false
    let watchId = -1
    let timer = 0
    const finish = () => {
      if (finished) return
      finished = true
      navigator.geolocation.clearWatch(watchId)
      window.clearTimeout(timer)
      if (best) {
        storage.set(LAST_POS_KEY, best)
        resolve(best)
      } else fallback()
    }

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const pos: Position = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
          at: new Date().toISOString(),
        }
        lyDoHongGps = null
        if (!best || (pos.accuracy ?? Infinity) < (best.accuracy ?? Infinity)) best = pos
        if ((pos.accuracy ?? Infinity) <= GOOD_ACCURACY_M) finish()
      },
      (e) => {
        lyDoHongGps = e.code === e.PERMISSION_DENIED ? 'tu-choi' : 'khong-co'
        chiTietLoiGps = moTaLoiGps(e)
        // Bị chặn quyền thì chờ thêm cũng vô ích → dừng ngay. Lỗi khác (chưa bắt được vệ tinh…) thường
        // chỉ thoáng qua, nhất là trên iPhone → cứ chờ tiếp tới hết giờ, có toạ độ thì vẫn lấy.
        if (e.code === e.PERMISSION_DENIED) finish()
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    )
    timer = window.setTimeout(finish, timeoutMs)
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
