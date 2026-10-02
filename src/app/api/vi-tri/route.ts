import type { Prisma } from '@prisma/client'

import { db } from '@/lib/may-chu/db'
import { viTri } from '@/lib/may-chu/chuyen-doi'
import { quaHanMuc } from '@/lib/may-chu/han-muc'
import { viTriMoi } from '@/lib/may-chu/mau'
import { viTriCuaToi } from '@/lib/may-chu/sos'
import { canNguoi, docJson, ok, xuLy } from '@/lib/may-chu/tra-loi'
import { DANG_MO, doiDangCuu, mucXemViTri, VI_TRI_SONG_MS } from '@/lib/quyen-sos'
import type { RescuerLocation } from '@/types'

/**
 * Vị trí cứu hộ mà người đang đăng nhập được thấy — luật ở `mucXemViTri` (src/lib/quyen-sos.ts):
 *  - Chỉ huy: mọi cứu hộ (kèm tên, SĐT), kể cả đã tắt ca.
 *  - Cứu hộ: đồng đội + đội khác trong 10 km, chỉ người đang trong ca (kèm tên, SĐT để gọi nhau).
 *  - Người dân: chỉ đội ĐÃ NHẬN đi cứu mình, ẩn danh.
 */
export const GET = xuLy(async () => {
  const nguoi = await canNguoi()
  const boiCanh = { viTriToi: null as Awaited<ReturnType<typeof viTriCuaToi>>, doiDangCuuToi: null as string | null }
  const song = { trongCa: true, capNhatLuc: { gte: new Date(Date.now() - VI_TRI_SONG_MS) } }
  let where: Prisma.ViTriCuuHoWhereInput

  if (nguoi.vaiTro === 'CHI_HUY') where = {}
  else if (nguoi.vaiTro === 'CUU_HO') {
    boiCanh.viTriToi = await viTriCuaToi(nguoi.id)
    where = { ...song, nguoiDungId: { not: nguoi.id } }
  } else {
    const sos = await db.yeuCauSos.findFirst({
      where: { nguoiGuiId: nguoi.id, trangThai: { in: DANG_MO } },
      orderBy: { taoLuc: 'desc' },
      select: { doiId: true, trangThai: true, nhanLuc: true },
    })
    boiCanh.doiDangCuuToi = doiDangCuu(sos)
    if (!boiCanh.doiDangCuuToi) return ok([])
    where = { ...song, doiId: boiCanh.doiDangCuuToi }
  }

  const ds = await db.viTriCuuHo.findMany({ where, include: { nguoiDung: { select: { hoTen: true, sdt: true } } }, take: 2000 })
  const ketQua: RescuerLocation[] = []
  for (const v of ds) {
    const muc = mucXemViTri(nguoi, v, boiCanh)
    if (muc === 'day-du') ketQua.push(viTri(v))
    else if (muc === 'an-danh') ketQua.push({ ...viTri({ ...v, nguoiDung: null }), user_id: `an-${ketQua.length}` })
  }
  return ok(ketQua)
})

/** Cứu hộ / chỉ huy gửi vị trí của CHÍNH MÌNH (app gửi mỗi 60 giây khi trong ca, 20 giây khi đang đi cứu). */
export const POST = xuLy(async (req: Request) => {
  const nguoi = await canNguoi('CUU_HO', 'CHI_HUY')
  if (quaHanMuc(`vi-tri:${nguoi.id}`, 60, 600)) return ok() // gửi dồn dập thì bỏ bớt, không báo lỗi
  const f = await docJson(req, viTriMoi)
  await db.viTriCuuHo.upsert({
    where: { nguoiDungId: nguoi.id },
    create: { nguoiDungId: nguoi.id, doiId: nguoi.doiId, lat: f.lat, lng: f.lng, trongCa: f.on_duty },
    update: { doiId: nguoi.doiId, lat: f.lat, lng: f.lng, trongCa: f.on_duty, capNhatLuc: new Date() },
  })
  return ok()
})
