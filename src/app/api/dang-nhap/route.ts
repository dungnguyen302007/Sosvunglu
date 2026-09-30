import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'

import { normalizePhone } from '@/lib/geo'
import { db } from '@/lib/may-chu/db'
import { ipNguoiGoi, quaHanMuc } from '@/lib/may-chu/han-muc'
import { hoSo } from '@/lib/may-chu/chuyen-doi'
import { dangNhap } from '@/lib/may-chu/mau'
import { taoPhien } from '@/lib/may-chu/phien'
import { docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Băm giả để thời gian trả lời như nhau dù SĐT có tồn tại hay không (không cho dò SĐT). */
const BAM_GIA = bcrypt.hashSync('khong-phai-mat-khau-that', 10)

export const POST = xuLy(async (req: Request) => {
  const ip = ipNguoiGoi(await headers())
  const f = await docJson(req, dangNhap)
  const sdt = normalizePhone(f.phone)
  if (quaHanMuc(`dang-nhap-ip:${ip}`, 30, 900) || quaHanMuc(`dang-nhap-sdt:${sdt}`, 8, 900)) {
    throw new LoiNguoiDung('Sai quá nhiều lần. Chờ 15 phút rồi thử lại.', 429)
  }
  const nguoi = await db.nguoiDung.findUnique({ where: { sdt } })
  const dung = await bcrypt.compare(f.password, nguoi?.matKhauBam ?? BAM_GIA)
  if (!nguoi || !dung) throw new LoiNguoiDung('Số điện thoại hoặc mật khẩu không đúng.', 401)
  if (nguoi.biKhoa) throw new LoiNguoiDung('Tài khoản đã bị khoá. Liên hệ trung tâm chỉ huy.', 403)
  await taoPhien(nguoi)
  return ok(hoSo(nguoi))
})
