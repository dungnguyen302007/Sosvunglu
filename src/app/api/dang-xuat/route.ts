import { xoaPhien } from '@/lib/may-chu/phien'
import { ok, xuLy } from '@/lib/may-chu/tra-loi'

export const POST = xuLy(async () => {
  await xoaPhien()
  return ok()
})
