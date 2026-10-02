import { db } from '@/lib/may-chu/db'
import { maDangSong, sangLoiMoi, taoMa } from '@/lib/may-chu/ma-moi'
import { doiCuaMa } from '@/lib/may-chu/mau'
import { canNguoi, docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Chỉ huy: các mã mời đang sống (mỗi đội tối đa một mã). */
export const GET = xuLy(async () => {
  await canNguoi('CHI_HUY')
  return ok((await maDangSong()).map(sangLoiMoi))
})

/** Chỉ huy: tạo mã mời mới cho một đội — mã cũ của đội đó hết dùng được ngay. */
export const POST = xuLy(async (req: Request) => {
  const chiHuy = await canNguoi('CHI_HUY')
  const f = await docJson(req, doiCuaMa)
  if (!(await db.doi.findUnique({ where: { id: f.team_id }, select: { id: true } }))) throw new LoiNguoiDung('Không tìm thấy đội.')
  return ok(sangLoiMoi(await taoMa(f.team_id, chiHuy.id)), 201)
})
