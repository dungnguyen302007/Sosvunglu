import { db } from '@/lib/may-chu/db'
import { doi, TRANG_THAI_DOI_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { doiMoi } from '@/lib/may-chu/mau'
import { canNguoi, docJson, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Danh sách đội (tên, phương tiện, trạng thái) — ai đăng nhập cũng xem được, để người dân biết "Đội 3 đang tới". */
export const GET = xuLy(async () => {
  await canNguoi()
  const ds = await db.doi.findMany({ orderBy: { taoLuc: 'asc' } })
  return ok(ds.map(doi))
})

export const POST = xuLy(async (req: Request) => {
  await canNguoi('CHI_HUY')
  const f = await docJson(req, doiMoi)
  const d = await db.doi.create({
    data: { ten: f.name, phuongTien: f.vehicle, sucCho: f.capacity, trangThai: TRANG_THAI_DOI_NGUOC[f.status] },
  })
  return ok(doi(d), 201)
})
