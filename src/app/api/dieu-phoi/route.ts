import { quetDieuPhoi } from '@/lib/may-chu/dieu-phoi'
import { quaHanMuc } from '@/lib/may-chu/han-muc'
import { canNguoi, ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * Quét điều phối DỰ PHÒNG từ app cứu hộ / chỉ huy (container cron đã gọi mỗi phút qua
 * /api/tac-vu/dieu-phoi). Giới hạn chung toàn máy: tối đa 1 lượt / 20 giây dù bao nhiêu người mở app.
 */
export const POST = xuLy(async () => {
  await canNguoi('CUU_HO', 'CHI_HUY')
  if (quaHanMuc('dieu-phoi-app', 1, 20)) return ok({ n: 0 })
  return ok({ n: await quetDieuPhoi() })
})
