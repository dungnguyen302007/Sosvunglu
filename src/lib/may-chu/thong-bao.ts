import 'server-only'

import type { DangKyThongBao, Prisma } from '@prisma/client'
import webpush from 'web-push'

import { distanceKm } from '@/lib/geo'
import { BAN_KINH_GAN_KM, VI_TRI_SONG_MS } from '@/lib/quyen-sos'
import { db } from './db'

/**
 * THÔNG BÁO ĐẨY (web push): điện thoại cứu hộ / chỉ huy kêu cả khi màn hình tắt hoặc đang mở app khác.
 *
 *  - Khoá VAPID nằm trong .env (`VAPID_PUBLIC`, `VAPID_PRIVATE`; tạo bằng scripts/tao-khoa-thong-bao.sh).
 *    Thiếu khoá thì mọi hàm ở đây lặng lẽ không làm gì — app vẫn chạy như chưa có thông báo đẩy.
 *  - Nội dung tin đi qua máy chủ của Google / Apple → KHÔNG ghi tên, SĐT, địa chỉ, toạ độ, sức khoẻ.
 *    Chỉ "có SOS, mấy người" — chi tiết xem trong app (sau lớp đăng nhập).
 *  - Gửi hỏng không được làm hỏng việc chính (tạo SOS, giao đội): hàm `bao*` không bao giờ ném lỗi.
 */

let sanSang: boolean | null = null
function khoiDong(): boolean {
  if (sanSang !== null) return sanSang
  const cong = process.env.VAPID_PUBLIC
  const rieng = process.env.VAPID_PRIVATE
  if (!cong || !rieng) return (sanSang = false)
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://github.com/dungnguyen302007/Sosvunglu', cong, rieng)
    sanSang = true
  } catch (e) {
    console.error('[thong-bao] khoá VAPID không hợp lệ', e)
    sanSang = false
  }
  return sanSang
}

/** Chỉ nhận địa chỉ đẩy của các hãng trình duyệt — không để ai bắt máy chủ gọi tới địa chỉ tuỳ ý. */
const MAY_CHU_DAY = [/^fcm\.googleapis\.com$/, /\.push\.apple\.com$/, /^updates\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/]
export function diaChiDayHopLe(endpoint: string): boolean {
  try {
    const u = new URL(endpoint)
    return u.protocol === 'https:' && MAY_CHU_DAY.some((r) => r.test(u.hostname))
  } catch {
    return false
  }
}

type Tin = { title: string; body: string; tag: string }

async function gui(ds: DangKyThongBao[], tin: Tin) {
  if (!khoiDong() || ds.length === 0) return
  await Promise.all(
    ds.map(async (d) => {
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, JSON.stringify(tin), {
          TTL: 600, // quá 10 phút chưa tới máy thì bỏ — SOS cũ kêu muộn chỉ gây rối
          urgency: 'high',
        })
      } catch (e) {
        const ma = (e as { statusCode?: number }).statusCode
        // 404 / 410: máy đã gỡ đăng ký (xoá app, thu quyền) → bỏ dòng đăng ký chết.
        if (ma === 404 || ma === 410) await db.dangKyThongBao.deleteMany({ where: { endpoint: d.endpoint } }).catch(() => {})
        else console.error('[thong-bao] gửi lỗi', ma ?? e)
      }
    }),
  )
}

const DANG_TRUC: Prisma.NguoiDungWhereInput = { biKhoa: false, vaiTro: 'CUU_HO', viTri: { trongCa: true } }

/** Đội vừa được giao một SOS → báo các thành viên ĐANG TRONG CA của đội. */
export async function baoDoiCoViec(doiId: string, sosId: string) {
  try {
    if (!khoiDong()) return
    const [sos, ds] = await Promise.all([
      db.yeuCauSos.findUnique({ where: { id: sosId }, select: { soNguoi: true, nhanLuc: true } }),
      db.dangKyThongBao.findMany({ where: { nguoiDung: { ...DANG_TRUC, doiId } } }),
    ])
    if (!sos) return
    await gui(ds, {
      title: '🆘 SOS mới giao cho đội',
      body: `${sos.soNguoi} người cần cứu. ${sos.nhanLuc ? 'Mở app để xem.' : 'Mở app bấm "Nhận việc" trong 2 phút.'}`,
      tag: `sos-${sosId}`,
    })
  } catch (e) {
    console.error('[thong-bao] baoDoiCoViec', e)
  }
}

/** SOS đang CHỜ mà chưa có đội (không đội nào gần / các đội đã từ chối) → báo chỉ huy + cứu hộ đang trực trong 10 km. */
export async function baoSosChuaCoDoi(sosId: string) {
  try {
    if (!khoiDong()) return
    const sos = await db.yeuCauSos.findUnique({ where: { id: sosId }, select: { soNguoi: true, lat: true, lng: true, trangThai: true, doiId: true } })
    if (!sos || sos.doiId || sos.trangThai !== 'CHO_CUU') return
    const [chiHuy, gan] = await Promise.all([
      db.dangKyThongBao.findMany({ where: { nguoiDung: { biKhoa: false, vaiTro: 'CHI_HUY' } } }),
      db.dangKyThongBao.findMany({
        where: { nguoiDung: { ...DANG_TRUC, viTri: { trongCa: true, capNhatLuc: { gte: new Date(Date.now() - VI_TRI_SONG_MS) } } } },
        include: { nguoiDung: { select: { viTri: { select: { lat: true, lng: true } } } } },
      }),
    ])
    const cuuHoGan = gan.filter((d) => d.nguoiDung.viTri && distanceKm(d.nguoiDung.viTri, sos) <= BAN_KINH_GAN_KM)
    const tin = { title: '🆘 SOS chưa có đội nhận', body: `${sos.soNguoi} người cần cứu, chưa đội nào nhận. Mở app để xem.`, tag: `sos-${sosId}` }
    await gui([...chiHuy, ...cuuHoGan], tin)
  } catch (e) {
    console.error('[thong-bao] baoSosChuaCoDoi', e)
  }
}
