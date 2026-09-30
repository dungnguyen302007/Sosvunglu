import type { Prisma } from '@prisma/client'

import { db } from '@/lib/may-chu/db'
import { MUC_NUOC_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { danSuaSos } from '@/lib/may-chu/mau'
import { ghiNhatKy } from '@/lib/may-chu/sos'
import { canNguoi, docJson, KHONG_THAY, ok, xuLy } from '@/lib/may-chu/tra-loi'
import { DANG_MO } from '@/lib/quyen-sos'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Người gửi cập nhật SOS của CHÍNH MÌNH: mức nước, bị thương, số người, vị trí, pin, ghi chú,
 * hoặc huỷ ("tôi đã an toàn"). Không đổi được đội, trạng thái khác, hay SOS của người khác.
 */
export const PATCH = xuLy(async (req: Request, { params }: Ctx) => {
  const nguoi = await canNguoi()
  const { id } = await params
  const f = await docJson(req, danSuaSos)
  const sos = await db.yeuCauSos.findUnique({ where: { id } })
  if (!sos || sos.nguoiGuiId !== nguoi.id || ![...DANG_MO, 'KHONG_TIEP_CAN'].includes(sos.trangThai)) throw KHONG_THAY()

  const data: Prisma.YeuCauSosUpdateInput = {
    mucNuoc: f.water_level === undefined ? undefined : f.water_level ? MUC_NUOC_NGUOC[f.water_level] : null,
    biThuong: f.injured,
    soNguoi: f.people_count,
    ghiChu: f.note,
    lat: f.lat,
    lng: f.lng,
    saiSo: f.lat !== undefined ? (f.accuracy ?? null) : undefined,
    pin: f.battery,
  }
  if (f.status === 'cancelled') data.trangThai = 'DA_HUY'
  await db.yeuCauSos.update({ where: { id }, data })
  await ghiNhatKy(id, nguoi.id, f.status === 'cancelled' ? 'dan-huy' : 'dan-cap-nhat', f as Prisma.InputJsonValue)
  return ok()
})
