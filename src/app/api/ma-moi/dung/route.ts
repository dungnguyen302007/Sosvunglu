import { headers } from 'next/headers'

import { duocDungMa } from '@/lib/ma-moi'
import { db } from '@/lib/may-chu/db'
import { ipNguoiGoi, quaHanMuc } from '@/lib/may-chu/han-muc'
import { dungMa } from '@/lib/may-chu/ma-moi'
import { dungMaMoi } from '@/lib/may-chu/mau'
import { canNguoi, docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/**
 * Người ĐÃ có tài khoản nhập mã mời → thành cứu hộ của đội phát mã (người dân lỡ đăng ký trước,
 * hoặc cứu hộ chuyển đội). Chỉ huy không dùng được (tránh bấm nhầm link mà tự hạ quyền).
 */
export const POST = xuLy(async (req: Request) => {
  const nguoi = await canNguoi()
  const ip = ipNguoiGoi(await headers())
  // Chặn dò mã: tính theo cả tài khoản lẫn IP.
  if (quaHanMuc(`ma-moi:${nguoi.id}`, 10, 3600) || quaHanMuc(`ma-moi-ip:${ip}`, 40, 3600)) {
    throw new LoiNguoiDung('Thử quá nhiều lần. Thử lại sau 1 giờ.', 429)
  }
  const f = await docJson(req, dungMaMoi)
  if (!duocDungMa(nguoi)) throw new LoiNguoiDung('Tài khoản chỉ huy không dùng mã mời đội.')

  const doi = await db.$transaction(async (tx) => {
    const ma = await dungMa(tx, f.code)
    await tx.nguoiDung.update({ where: { id: nguoi.id }, data: { vaiTro: 'CUU_HO', doiId: ma.doiId, maMoiId: ma.id } })
    await tx.viTriCuuHo.updateMany({ where: { nguoiDungId: nguoi.id }, data: { doiId: ma.doiId } })
    return tx.doi.findUnique({ where: { id: ma.doiId }, select: { ten: true } })
  })
  return ok({ team_name: doi?.ten ?? '' })
})
