import { z } from 'zod'

import { db } from '@/lib/may-chu/db'
import { ghiNhatKy } from '@/lib/may-chu/sos'
import { canNguoi, docJson, KHONG_THAY, ok, xuLy } from '@/lib/may-chu/tra-loi'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Chỉ huy gắn cờ BÁO GIẢ: huỷ SOS; nếu `khoaNguoiGui` thì khoá luôn tài khoản người gửi
 * (tăng phienBan → mọi phiên đang mở chết ngay). SĐT khách từng báo giả bị chặn gửi SOS khách.
 */
export const POST = xuLy(async (req: Request, { params }: Ctx) => {
  const nguoi = await canNguoi('CHI_HUY')
  const { id } = await params
  const f = await docJson(req, z.object({ khoaNguoiGui: z.boolean().default(false) }))
  const sos = await db.yeuCauSos.findUnique({ where: { id } })
  if (!sos) throw KHONG_THAY()
  await db.yeuCauSos.update({ where: { id }, data: { baoGia: true, trangThai: 'DA_HUY' } })
  if (f.khoaNguoiGui && sos.nguoiGuiId && sos.nguoiGuiId !== nguoi.id) {
    await db.nguoiDung.update({ where: { id: sos.nguoiGuiId }, data: { biKhoa: true, phienBan: { increment: 1 } } })
  }
  await ghiNhatKy(id, nguoi.id, 'bao-gia', { khoaNguoiGui: f.khoaNguoiGui })
  return ok()
})
