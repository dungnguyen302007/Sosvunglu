import { db } from '@/lib/may-chu/db'
import { sosDayDu } from '@/lib/may-chu/chuyen-doi'
import { canNguoi, ok, xuLy } from '@/lib/may-chu/tra-loi'
import { DANG_MO } from '@/lib/quyen-sos'

/** SOS đang mở của chính người đăng nhập (người dân xem trạng thái). */
export const GET = xuLy(async () => {
  const nguoi = await canNguoi()
  const s = await db.yeuCauSos.findFirst({
    where: { nguoiGuiId: nguoi.id, trangThai: { in: [...DANG_MO, 'KHONG_TIEP_CAN'] } },
    orderBy: { taoLuc: 'desc' },
  })
  return ok(s ? sosDayDu({ ...s, nguoiGui: nguoi }) : null)
})
