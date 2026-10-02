import { thuHoiMa } from '@/lib/may-chu/ma-moi'
import { doiCuaMa } from '@/lib/may-chu/mau'
import { canNguoi, docJson, ok, xuLy } from '@/lib/may-chu/tra-loi'

/** Chỉ huy: thu hồi mã mời của một đội (mã lộ ra ngoài). Người đã vào đội bằng mã đó vẫn ở lại — cần thì khoá riêng. */
export const POST = xuLy(async (req: Request) => {
  await canNguoi('CHI_HUY')
  const f = await docJson(req, doiCuaMa)
  await thuHoiMa(f.team_id)
  return ok()
})
