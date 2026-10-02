import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'

import { db } from '@/lib/may-chu/db'
import { ipNguoiGoi, quaHanMuc } from '@/lib/may-chu/han-muc'
import { hoSo, NHOM_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { dungMa } from '@/lib/may-chu/ma-moi'
import { dangKy, dangKyCuuHo } from '@/lib/may-chu/mau'
import { taoPhien } from '@/lib/may-chu/phien'
import { docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

const DA_CO = () => new LoiNguoiDung('Số điện thoại này đã đăng ký. Hãy đăng nhập.', 409)

/**
 * Đăng ký.
 *  - Không có `ma_moi`: người dân (hồ sơ hộ + ô đồng ý).
 *  - Có `ma_moi` (mã mời đội do chỉ huy tạo): thành cứu hộ của đúng đội đó. Không có mã đúng thì
 *    KHÔNG tự thành cứu hộ được. Chỉ huy thì vẫn phải cấp tay.
 */
export const POST = xuLy(async (req: Request) => {
  const ip = ipNguoiGoi(await headers())
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new LoiNguoiDung('Dữ liệu gửi lên không hợp lệ.')
  }

  if (body && typeof body === 'object' && 'ma_moi' in body) {
    // Cả đội thường đăng ký cùng một chỗ (chung wifi / chung IP nhà mạng) → hạn mức rộng hơn người dân,
    // nhưng vẫn đủ chặt để không dò được mã 6 ký tự.
    if (quaHanMuc(`dang-ky-ma:${ip}`, 40, 3600)) throw new LoiNguoiDung('Thử quá nhiều lần. Thử lại sau 1 giờ.', 429)
    const f = dangKyCuuHo.parse(body)
    if (await db.nguoiDung.findUnique({ where: { sdt: f.phone }, select: { id: true } })) throw DA_CO()
    const matKhauBam = await bcrypt.hash(f.password, 10)
    const nguoi = await db.$transaction(async (tx) => {
      const ma = await dungMa(tx, f.ma_moi)
      return tx.nguoiDung.create({
        data: { hoTen: f.full_name, sdt: f.phone, matKhauBam, vaiTro: 'CUU_HO', doiId: ma.doiId, maMoiId: ma.id },
      })
    })
    await taoPhien(nguoi)
    return ok(hoSo(nguoi), 201)
  }

  if (quaHanMuc(`dang-ky:${ip}`, 10, 3600)) throw new LoiNguoiDung('Đăng ký quá nhiều lần. Thử lại sau 1 giờ.', 429)
  const f = dangKy.parse(body)

  const daCo = await db.nguoiDung.findUnique({ where: { sdt: f.phone }, select: { id: true } })
  if (daCo) throw DA_CO()

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
