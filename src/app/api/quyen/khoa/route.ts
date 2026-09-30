import { db } from '@/lib/may-chu/db'
import { khoaTaiKhoan } from '@/lib/may-chu/mau'
import { canNguoi, docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Chỉ huy khoá / mở khoá tài khoản phá hoại. Khoá thì mọi phiên đang mở của người đó chết ngay. */
export const POST = xuLy(async (req: Request) => {
  const chiHuy = await canNguoi('CHI_HUY')
  const f = await docJson(req, khoaTaiKhoan)
  const nguoi = await db.nguoiDung.findUnique({ where: { sdt: f.phone }, select: { id: true } })
  if (!nguoi) throw new LoiNguoiDung('Không tìm thấy tài khoản có SĐT này.', 404)
  if (nguoi.id === chiHuy.id) throw new LoiNguoiDung('Không tự khoá chính mình.')
  await db.nguoiDung.update({
    where: { id: nguoi.id },
    data: f.khoa ? { biKhoa: true, phienBan: { increment: 1 } } : { biKhoa: false },
  })
  return ok()
})
