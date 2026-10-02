import { db } from '@/lib/may-chu/db'
import { doiHetNguoiTruc } from '@/lib/may-chu/dieu-phoi'
import { canNguoi, ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * TẮT CA (nghỉ): ngừng hiện vị trí của mình cho dân / đội khác, hệ thống thôi tự giao việc.
 * Tính theo TỪNG NGƯỜI — đồng đội còn trong ca thì đội vẫn chạy. Cả đội cùng nghỉ mà còn việc dở
 * thì việc được trả về để điều đội khác (`tra_viec` = số SOS đã trả).
 * Bật ca lại: app gửi vị trí qua /api/vi-tri như thường.
 */
export const POST = xuLy(async () => {
  const nguoi = await canNguoi('CUU_HO', 'CHI_HUY')
  await db.viTriCuuHo.updateMany({ where: { nguoiDungId: nguoi.id }, data: { trongCa: false, capNhatLuc: new Date() } })
  const traViec = nguoi.doiId ? await doiHetNguoiTruc(nguoi.doiId, nguoi.id) : 0
  return ok({ tra_viec: traViec })
})
