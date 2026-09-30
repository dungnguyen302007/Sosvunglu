import { db } from '@/lib/may-chu/db'
import { viTri } from '@/lib/may-chu/chuyen-doi'
import { quaHanMuc } from '@/lib/may-chu/han-muc'
import { viTriMoi } from '@/lib/may-chu/mau'
import { canNguoi, docJson, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Chỉ huy: vị trí mọi cứu hộ (kèm tên, SĐT). Vai khác: rỗng. */
export const GET = xuLy(async () => {
  const nguoi = await canNguoi()
  if (nguoi.vaiTro !== 'CHI_HUY') return ok([])
  const ds = await db.viTriCuuHo.findMany({ include: { nguoiDung: { select: { hoTen: true, sdt: true } } } })
  return ok(ds.map(viTri))
})

/** Cứu hộ / chỉ huy gửi vị trí của CHÍNH MÌNH (app gửi mỗi 60 giây khi đang trong ca). */
export const POST = xuLy(async (req: Request) => {
  const nguoi = await canNguoi('CUU_HO', 'CHI_HUY')
  if (quaHanMuc(`vi-tri:${nguoi.id}`, 30, 600)) return ok() // gửi dồn dập thì bỏ bớt, không báo lỗi
  const f = await docJson(req, viTriMoi)
  await db.viTriCuuHo.upsert({
    where: { nguoiDungId: nguoi.id },
    create: { nguoiDungId: nguoi.id, doiId: nguoi.doiId, lat: f.lat, lng: f.lng, trongCa: f.on_duty },
    update: { doiId: nguoi.doiId, lat: f.lat, lng: f.lng, trongCa: f.on_duty, capNhatLuc: new Date() },
  })
  return ok()
})
