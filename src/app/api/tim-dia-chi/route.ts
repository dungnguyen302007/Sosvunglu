import { headers } from 'next/headers'
import { z } from 'zod'

import { ipNguoiGoi, quaHanMuc } from '@/lib/may-chu/han-muc'
import { docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * Tìm toạ độ theo ĐỊA CHỈ GÕ TAY (người dân không bắt được GPS, không rành dò bản đồ).
 * Công khai (khách bấm SOS khẩn cũng dùng) → có hạn mức theo IP.
 *
 * Gọi dịch vụ tìm địa chỉ miễn phí của OpenStreetMap (Nominatim) TỪ MÁY CHỦ, không gọi thẳng từ điện thoại:
 *  - giữ được CSP `connect-src 'self'`;
 *  - OSM không thấy IP của người dân;
 *  - tuân luật dùng của họ: tối đa 1 lượt/giây cho cả app, có User-Agent nhận diện, có cất kết quả.
 * Dùng POST để địa chỉ không nằm trong đường dẫn / nhật ký proxy.
 * Dữ liệu OSM ở nông thôn thường chỉ tới thôn / đường, hiếm khi tới số nhà → giao diện đưa bản đồ tới
 * đó rồi người dùng chạm chỉnh cho đúng nhà.
 */

const mau = z.object({
  q: z.string().trim().min(3).max(150),
  near: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullish(),
})

type KetQua = { name: string; lat: number; lng: number }

const cat = new Map<string, { luc: number; ds: KetQua[] }>()
const CAT_MS = 6 * 3600 * 1000
let luotKe = 0 // mốc sớm nhất được gọi OSM lượt kế tiếp (giữ nhịp ≥ 1,1 giây/lượt)

export const POST = xuLy(async (req: Request) => {
  const ip = ipNguoiGoi(await headers())
  if (quaHanMuc(`tim-dia-chi:${ip}`, 30, 600)) throw new LoiNguoiDung('Tìm quá nhiều lần. Hãy chạm chọn trên bản đồ.', 429)
  const f = await docJson(req, mau)

  const gan = f.near ? `${f.near.lat.toFixed(1)},${f.near.lng.toFixed(1)}` : ''
  const khoa = `${f.q.toLowerCase()}|${gan}`
  const daCat = cat.get(khoa)
  if (daCat && Date.now() - daCat.luc < CAT_MS) return ok(daCat.ds)

  const cho = Math.max(0, luotKe - Date.now())
  if (cho > 4000) throw new LoiNguoiDung('Đang có nhiều người tìm. Thử lại sau vài giây hoặc chạm chọn trên bản đồ.', 503)
  luotKe = Date.now() + cho + 1100
  if (cho) await new Promise((r) => setTimeout(r, cho))

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('q', f.q)
  url.searchParams.set('countrycodes', 'vn')
  url.searchParams.set('limit', '5')
  url.searchParams.set('accept-language', 'vi')
  if (f.near) {
    // Ưu tiên (không bắt buộc) kết quả quanh vị trí đang xem, ~50 km.
    const { lat, lng } = f.near
    url.searchParams.set('viewbox', `${lng - 0.5},${lat + 0.5},${lng + 0.5},${lat - 0.5}`)
  }

  let ds: KetQua[]
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'sos-vung-lu/0.2 (app cuu ho lu; github.com/dungnguyen302007/Sosvunglu)' },
      signal: AbortSignal.timeout(7000),
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`nominatim ${res.status}`)
    const data = (await res.json()) as { display_name?: string; lat?: string; lon?: string }[]
    ds = data
      .map((d) => ({ name: String(d.display_name ?? '').slice(0, 200), lat: Number(d.lat), lng: Number(d.lon) }))
      .filter((d) => d.name && Number.isFinite(d.lat) && Number.isFinite(d.lng))
  } catch (e) {
    console.error('[tim-dia-chi]', e)
    throw new LoiNguoiDung('Chưa tìm được địa chỉ lúc này. Hãy chạm chọn trên bản đồ.', 502)
  }

  if (cat.size > 2000) cat.clear()
  cat.set(khoa, { luc: Date.now(), ds })
  return ok(ds)
})
