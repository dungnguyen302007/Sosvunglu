import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'

import { db } from '@/lib/may-chu/db'
import { ipNguoiGoi, quaHanMuc } from '@/lib/may-chu/han-muc'
import { hoSo, NHOM_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { dangKy } from '@/lib/may-chu/mau'
import { taoPhien } from '@/lib/may-chu/phien'
import { docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Đăng ký người dân. Vai cứu hộ / chỉ huy KHÔNG tự đăng ký được — chỉ huy nâng quyền sau. */
export const POST = xuLy(async (req: Request) => {
  const ip = ipNguoiGoi(await headers())
  if (quaHanMuc(`dang-ky:${ip}`, 10, 3600)) throw new LoiNguoiDung('Đăng ký quá nhiều lần. Thử lại sau 1 giờ.', 429)
  const f = await docJson(req, dangKy)

  const daCo = await db.nguoiDung.findUnique({ where: { sdt: f.phone }, select: { id: true } })
  if (daCo) throw new LoiNguoiDung('Số điện thoại này đã đăng ký. Hãy đăng nhập.', 409)

  const nguoi = await db.nguoiDung.create({
    data: {
      hoTen: f.full_name,
      sdt: f.phone,
      matKhauBam: await bcrypt.hash(f.password, 10),
      tinh: f.province,
      xa: f.ward,
      thon: f.hamlet,
      diaChi: f.address_detail,
      soNguoi: f.household_size,
      deTonThuong: f.vulnerable.map((v) => NHOM_NGUOC[v]),
      sdtNguoiThan: f.relative_phone,
      ghiChu: f.note,
      nhaLat: f.home_lat ?? null,
      nhaLng: f.home_lng ?? null,
      dongYLuc: new Date(),
    },
  })
  await taoPhien(nguoi)
  return ok(hoSo(nguoi), 201)
})
