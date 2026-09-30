import { headers } from 'next/headers'

import { db } from '@/lib/may-chu/db'
import { giaoSosMoi } from '@/lib/may-chu/dieu-phoi'
import { ipNguoiGoi, quaHanMuc } from '@/lib/may-chu/han-muc'
import { sosKhach } from '@/lib/may-chu/mau'
import { ghiNhatKy } from '@/lib/may-chu/sos'
import { docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'
import { DANG_MO } from '@/lib/quyen-sos'

/**
 * SOS khẩn KHÔNG cần tài khoản (lũ về mà chưa đăng ký). Đây là cửa công khai duy nhất ghi được
 * dữ liệu, nên chặn phá (bản Supabase cũ không chặn gì — đổi SĐT là gửi vô hạn):
 *  - mỗi IP: 3 SOS/giờ, 10 SOS/ngày;
 *  - mỗi SĐT: 1 SOS đang mở; SĐT từng bị chỉ huy gắn "báo giả" thì không gửi được nữa.
 * Nhiều người thật dùng chung một IP (wifi nhà văn hoá, mạng di động NAT) vẫn đủ chỗ: người
 * thứ tư trong giờ được mời gọi 112 / đăng ký tài khoản.
 */
export const POST = xuLy(async (req: Request) => {
  const ip = ipNguoiGoi(await headers())
  const f = await docJson(req, sosKhach)

  const dangMo = await db.yeuCauSos.findFirst({
    where: { sdtKhach: f.phone, nguoiGuiId: null, trangThai: { in: [...DANG_MO, 'KHONG_TIEP_CAN'] } },
    select: { id: true },
  })
  if (dangMo) return ok({ id: dangMo.id })

  if (quaHanMuc(`sos-khach-gio:${ip}`, 3, 3600) || quaHanMuc(`sos-khach-ngay:${ip}`, 10, 86400)) {
    throw new LoiNguoiDung('Máy này đã gửi nhiều SOS. Gọi ngay 112 hoặc số cứu hộ địa phương.', 429)
  }
  const tungBaoGia = await db.yeuCauSos.findFirst({ where: { sdtKhach: f.phone, baoGia: true }, select: { id: true } })
  if (tungBaoGia) throw new LoiNguoiDung('Số điện thoại này đã bị chặn gửi SOS. Gọi 112 nếu khẩn cấp.', 403)

  const s = await db.yeuCauSos.create({
    data: {
      tenKhach: f.name,
      sdtKhach: f.phone,
      lat: f.lat,
      lng: f.lng,
      saiSo: f.accuracy,
      pin: f.battery,
      soNguoi: f.people_count,
      ipGui: ip,
    },
  })
  await ghiNhatKy(s.id, null, 'tao-khach')
  await giaoSosMoi(s.id).catch((e) => console.error('[dieu-phoi] giao SOS khách lỗi', e))
  return ok({ id: s.id }, 201)
})
