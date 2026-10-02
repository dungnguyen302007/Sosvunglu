import { db } from '@/lib/may-chu/db'
import { dangKyDay, huyDangKyDay } from '@/lib/may-chu/mau'
import { diaChiDayHopLe } from '@/lib/may-chu/thong-bao'
import { canNguoi, docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * Cứu hộ / chỉ huy đăng ký nhận THÔNG BÁO ĐẨY trên máy này (mỗi trình duyệt một dòng).
 * Một máy đổi người đăng nhập thì dòng đăng ký chuyển sang người mới (endpoint là duy nhất).
 */
export const POST = xuLy(async (req: Request) => {
  const nguoi = await canNguoi('CUU_HO', 'CHI_HUY')
  const f = await docJson(req, dangKyDay)
  if (!diaChiDayHopLe(f.endpoint)) throw new LoiNguoiDung('Trình duyệt này chưa được hỗ trợ thông báo đẩy.')
  const data = { nguoiDungId: nguoi.id, p256dh: f.keys.p256dh, auth: f.keys.auth }
  await db.dangKyThongBao.upsert({ where: { endpoint: f.endpoint }, create: { endpoint: f.endpoint, ...data }, update: data })
  // Mỗi người giữ tối đa 5 máy mới nhất.
  const cu = await db.dangKyThongBao.findMany({ where: { nguoiDungId: nguoi.id }, orderBy: { taoLuc: 'desc' }, skip: 5, select: { id: true } })
  if (cu.length) await db.dangKyThongBao.deleteMany({ where: { id: { in: cu.map((c) => c.id) } } })
  return ok()
})

/** Tắt thông báo đẩy trên máy này (đăng xuất). Chỉ gỡ được đăng ký của CHÍNH MÌNH. */
export const DELETE = xuLy(async (req: Request) => {
  const nguoi = await canNguoi()
  const f = await docJson(req, huyDangKyDay)
  await db.dangKyThongBao.deleteMany({ where: { endpoint: f.endpoint, nguoiDungId: nguoi.id } })
  return ok()
})
