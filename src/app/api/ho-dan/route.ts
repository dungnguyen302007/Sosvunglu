import { db } from '@/lib/may-chu/db'
import { hoSo } from '@/lib/may-chu/chuyen-doi'
import { canNguoi, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Chỉ huy: hộ dân đã lưu vị trí nhà — lớp "Nhà dân" trên bản đồ toàn cảnh. */
export const GET = xuLy(async () => {
  await canNguoi('CHI_HUY')
  const ds = await db.nguoiDung.findMany({
    where: { vaiTro: 'DAN', biKhoa: false, nhaLat: { not: null }, nhaLng: { not: null } },
    take: 20000,
  })
  return ok(ds.map(hoSo))
})
