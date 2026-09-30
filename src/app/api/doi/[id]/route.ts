import { db } from '@/lib/may-chu/db'
import { TRANG_THAI_DOI_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { suaDoi } from '@/lib/may-chu/mau'
import { canNguoi, docJson, KHONG_THAY, ok, xuLy } from '@/lib/may-chu/tra-loi'

type Ctx = { params: Promise<{ id: string }> }

/** Chỉ huy sửa mọi thứ của đội; cứu hộ chỉ đổi TRẠNG THÁI của chính đội mình (sẵn sàng / nghỉ…). */
export const PATCH = xuLy(async (req: Request, { params }: Ctx) => {
  const nguoi = await canNguoi('CUU_HO', 'CHI_HUY')
  const { id } = await params
  const f = await docJson(req, suaDoi)
  const d = await db.doi.findUnique({ where: { id }, select: { id: true } })
  if (!d) throw KHONG_THAY()
  if (nguoi.vaiTro === 'CUU_HO') {
    if (nguoi.doiId !== id || !f.status) throw KHONG_THAY()
    await db.doi.update({ where: { id }, data: { trangThai: TRANG_THAI_DOI_NGUOC[f.status] } })
    return ok()
  }
  await db.doi.update({
    where: { id },
    data: {
      ten: f.name,
      phuongTien: f.vehicle,
      sucCho: f.capacity,
      trangThai: f.status ? TRANG_THAI_DOI_NGUOC[f.status] : undefined,
    },
  })
  return ok()
})
