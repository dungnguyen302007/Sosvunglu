import { timingSafeEqual } from 'node:crypto'

import { quetDieuPhoi } from '@/lib/may-chu/dieu-phoi'
import { LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * Container `cron` gọi mỗi phút (mạng nội bộ Docker), kèm tiêu đề `x-khoa-tac-vu`.
 * Khoá riêng KHOA_TAC_VU, KHÔNG dùng chung AUTH_SECRET (lộ khoá này không ký được phiên).
 */
function dungKhoa(guiLen: string | null): boolean {
  const khoa = process.env.KHOA_TAC_VU
  if (!khoa || khoa.length < 32 || !guiLen) return false
  const a = Buffer.from(guiLen)
  const b = Buffer.from(khoa)
  return a.length === b.length && timingSafeEqual(a, b)
}

export const POST = xuLy(async (req: Request) => {
  if (!dungKhoa(req.headers.get('x-khoa-tac-vu'))) throw new LoiNguoiDung('Không tìm thấy hoặc không có quyền.', 404)
  return ok({ n: await quetDieuPhoi() })
})
