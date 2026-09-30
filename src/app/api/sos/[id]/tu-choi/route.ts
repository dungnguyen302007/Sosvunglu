import { db } from '@/lib/may-chu/db'
import { doiTuChoi } from '@/lib/may-chu/dieu-phoi'
import { canNguoi, KHONG_THAY, ok, xuLy } from '@/lib/may-chu/tra-loi'

type Ctx = { params: Promise<{ id: string }> }

/** Đội được giao bấm "Từ chối" → hệ thống chuyển cho đội gần nhất kế tiếp. */
export const POST = xuLy(async (_req: Request, { params }: Ctx) => {
  const nguoi = await canNguoi('CUU_HO')
  const { id } = await params
  const sos = await db.yeuCauSos.findUnique({ where: { id }, select: { doiId: true, trangThai: true } })
  if (!sos || !nguoi.doiId || sos.doiId !== nguoi.doiId || sos.trangThai !== 'DA_GIAO') throw KHONG_THAY()
  await doiTuChoi(id, nguoi.id)
  return ok()
})
