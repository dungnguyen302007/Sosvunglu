import { db } from '@/lib/may-chu/db'
import { sosDayDu } from '@/lib/may-chu/chuyen-doi'
import { giaoSosMoi } from '@/lib/may-chu/dieu-phoi'
import { quaHanMuc } from '@/lib/may-chu/han-muc'
import { sosMoi } from '@/lib/may-chu/mau'
import { danhSachSos, ghiNhatKy } from '@/lib/may-chu/sos'
import { canNguoi, docJson, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'
import { DANG_MO } from '@/lib/quyen-sos'

/** Trạng thái coi như "còn đang cần cứu" — trùng với chỉ mục riêng trong migration. */
const CON_MO = [...DANG_MO, 'KHONG_TIEP_CAN' as const]

export const GET = xuLy(async () => {
  const nguoi = await canNguoi()
  return ok(await danhSachSos(nguoi))
})

/** Gửi SOS cho chính mình. Mỗi người chỉ có MỘT SOS đang mở (chặn thêm ở CSDL bằng chỉ mục riêng). */
export const POST = xuLy(async (req: Request) => {
  const nguoi = await canNguoi()
  if (quaHanMuc(`sos:${nguoi.id}`, 10, 3600)) throw new LoiNguoiDung('Gửi quá nhiều lần. Gọi 112 nếu khẩn cấp.', 429)
  const f = await docJson(req, sosMoi)

  const sosDangMo = () => db.yeuCauSos.findFirst({ where: { nguoiGuiId: nguoi.id, trangThai: { in: CON_MO } } })
  const dangMo = await sosDangMo()
  if (dangMo) return ok(sosDayDu({ ...dangMo, nguoiGui: nguoi })) // bấm lại khi đã có SOS → trả SOS cũ, không tạo trùng

  let s
  try {
    s = await db.yeuCauSos.create({
      data: { nguoiGuiId: nguoi.id, lat: f.lat, lng: f.lng, saiSo: f.accuracy, pin: f.battery, soNguoi: f.people_count },
    })
  } catch (e) {
    // Hai lượt gửi cùng lúc (hàng đợi mất mạng gửi lại): chỉ mục riêng chặn bản thứ hai → trả bản đã có.
    if ((e as { code?: string }).code !== 'P2002') throw e
    const daCo = await sosDangMo()
    if (!daCo) throw e
    return ok(sosDayDu({ ...daCo, nguoiGui: nguoi }))
  }
  await ghiNhatKy(s.id, nguoi.id, 'tao')
  await giaoSosMoi(s.id).catch((e) => console.error('[dieu-phoi] giao SOS mới lỗi', e))
  const moi = await db.yeuCauSos.findUniqueOrThrow({ where: { id: s.id }, include: { nguoiGui: true } })
  return ok(sosDayDu(moi), 201)
})
