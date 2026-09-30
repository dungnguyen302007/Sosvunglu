import { db } from '@/lib/may-chu/db'
import { layNguoiDung } from '@/lib/may-chu/phien'
import { ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * Thay cho "realtime" của Supabase: app hỏi mỗi ~10 giây "có gì đổi không" (một con số rất nhỏ),
 * đổi thì mới tải lại danh sách. Trên mạng yếu vùng lũ, hỏi định kỳ bền hơn giữ kết nối mở.
 * Chỉ trả dấu thời gian, không lộ dữ liệu gì.
 */
export const GET = xuLy(async () => {
  const nguoi = await layNguoiDung()
  if (!nguoi) return ok({ v: '' })
  const [sos, doi, viTri] = await Promise.all([
    db.yeuCauSos.aggregate({ _max: { capNhatLuc: true }, _count: true }),
    db.doi.aggregate({ _max: { capNhatLuc: true } }),
    db.viTriCuuHo.aggregate({ _max: { capNhatLuc: true } }),
  ])
  const v = [sos._max.capNhatLuc?.getTime(), sos._count, doi._max.capNhatLuc?.getTime(), viTri._max.capNhatLuc?.getTime()].join('.')
  return ok({ v })
})
