import { db } from '@/lib/may-chu/db'
import { hoSo, NHOM_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { suaHoSo } from '@/lib/may-chu/mau'
import { layNguoiDung } from '@/lib/may-chu/phien'
import { canNguoi, docJson, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Hồ sơ người đang đăng nhập; chưa đăng nhập trả null (không phải lỗi). */
export const GET = xuLy(async () => {
  const nguoi = await layNguoiDung()
  return ok(nguoi ? hoSo(nguoi) : null)
})

/** Tự sửa hồ sơ. Không đổi được SĐT, vai trò, đội (khuôn `suaHoSo` không có các trường đó). */
export const PATCH = xuLy(async (req: Request) => {
  const nguoi = await canNguoi()
  const f = await docJson(req, suaHoSo)
  const moi = await db.nguoiDung.update({
    where: { id: nguoi.id },
    data: {
      hoTen: f.full_name,
      tinh: f.province,
      xa: f.ward,
      thon: f.hamlet,
      diaChi: f.address_detail,
      soNguoi: f.household_size,
      deTonThuong: f.vulnerable?.map((v) => NHOM_NGUOC[v]),
      sdtNguoiThan: f.relative_phone,
      ghiChu: f.note,
      nhaLat: f.home_lat,
      nhaLng: f.home_lng,
    },
  })
  return ok(hoSo(moi))
})
