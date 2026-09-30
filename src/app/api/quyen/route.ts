import { db } from '@/lib/may-chu/db'
import { VAI_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { capQuyen } from '@/lib/may-chu/mau'
import { canNguoi, docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * Chỉ huy cấp vai (người dân / cứu hộ / chỉ huy) + đội cho một tài khoản ĐÃ đăng ký, theo SĐT.
 * Vai luôn đọc lại từ CSDL ở mỗi lượt gọi, nên đổi vai có hiệu lực ngay, không cần đăng nhập lại.
 */
export const POST = xuLy(async (req: Request) => {
  const chiHuy = await canNguoi('CHI_HUY')
  const f = await docJson(req, capQuyen)
  const nguoi = await db.nguoiDung.findUnique({ where: { sdt: f.phone }, select: { id: true } })
  if (!nguoi) throw new LoiNguoiDung('Không tìm thấy tài khoản có SĐT này. Người đó cần đăng ký trước.', 404)
  if (nguoi.id === chiHuy.id && f.role !== 'commander') {
    throw new LoiNguoiDung('Không tự hạ quyền chính mình (tránh không còn ai làm chỉ huy).')
  }
  const vaiTro = VAI_NGUOC[f.role]
  const doiId = vaiTro === 'CUU_HO' ? f.team_id : null
  if (doiId && !(await db.doi.findUnique({ where: { id: doiId }, select: { id: true } }))) {
    throw new LoiNguoiDung('Không tìm thấy đội.')
  }
  await db.nguoiDung.update({ where: { id: nguoi.id }, data: { vaiTro, doiId } })
  // Cứu hộ đổi đội → vị trí đang trực cũng theo đội mới; hết là cứu hộ → tắt ca.
  await db.viTriCuuHo.updateMany({
    where: { nguoiDungId: nguoi.id },
    data: vaiTro === 'DAN' ? { trongCa: false, doiId: null } : { doiId },
  })
  return ok()
})
