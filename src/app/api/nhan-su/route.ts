import { db } from '@/lib/may-chu/db'
import { hoSo } from '@/lib/may-chu/chuyen-doi'
import { canNguoi, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Chỉ huy: mọi tài khoản cứu hộ / chỉ huy (kể cả chưa bật ca lần nào). */
export const GET = xuLy(async () => {
  await canNguoi('CHI_HUY')
  const ds = await db.nguoiDung.findMany({ where: { vaiTro: { in: ['CUU_HO', 'CHI_HUY'] } }, orderBy: { hoTen: 'asc' } })
  return ok(ds.map(hoSo))
})
