import { z } from 'zod'

import { db } from '@/lib/may-chu/db'
import { TRANG_THAI } from '@/lib/may-chu/chuyen-doi'
import { ok, xuLy } from '@/lib/may-chu/tra-loi'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Khách xem trạng thái SOS của mình — chỉ ai biết mã (uuid, máy khách tự lưu) mới xem được,
 * và chỉ thấy trạng thái + tên đội, không thấy vị trí hay SĐT.
 */
export const GET = xuLy(async (_req: Request, { params }: Ctx) => {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return ok(null)
  const s = await db.yeuCauSos.findFirst({
    where: { id, nguoiGuiId: null },
    select: { trangThai: true, nhanLuc: true, doi: { select: { ten: true } } },
  })
  if (!s) return ok(null)
  return ok({ status: TRANG_THAI[s.trangThai], team_name: s.doi?.ten ?? null, accepted: s.nhanLuc != null })
})
