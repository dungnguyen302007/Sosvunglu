import type { Prisma } from '@prisma/client'
import { headers } from 'next/headers'
import { z } from 'zod'

import { db } from '@/lib/may-chu/db'
import { MUC_NUOC, MUC_NUOC_NGUOC, NHOM, NHOM_NGUOC, TRANG_THAI, viTri } from '@/lib/may-chu/chuyen-doi'
import { ipNguoiGoi, quaHanMuc } from '@/lib/may-chu/han-muc'
import { khachSuaSos } from '@/lib/may-chu/mau'
import { ghiNhatKy } from '@/lib/may-chu/sos'
import { docJson, KHONG_THAY, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'
import { doiDangCuu, khachDuocSua, khachDuocXem, VI_TRI_SONG_MS } from '@/lib/quyen-sos'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Khách xem SOS khẩn của mình — chỉ ai biết mã (uuid, máy khách tự lưu) mới xem được.
 * Thấy: trạng thái, tên đội, đúng những gì chính mình đã khai (không có SĐT), và — khi đội ĐÃ NHẬN —
 * vị trí xuồng của đội đó, ẩn danh (cùng luật với người dân có tài khoản).
 */
export const GET = xuLy(async (_req: Request, { params }: Ctx) => {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return ok(null)
  const s = await db.yeuCauSos.findUnique({ where: { id }, include: { doi: { select: { ten: true } } } })
  if (!s || !khachDuocXem(s)) return ok(null)

  const doiId = doiDangCuu(s)
  const xuong = doiId
    ? await db.viTriCuuHo.findMany({
        where: { doiId, trongCa: true, capNhatLuc: { gte: new Date(Date.now() - VI_TRI_SONG_MS) } },
        take: 50,
      })
    : []
  return ok({
    status: TRANG_THAI[s.trangThai],
    team_name: s.doi?.ten ?? null,
    accepted: s.nhanLuc != null,
    sos: {
      lat: s.lat,
      lng: s.lng,
      accuracy: s.saiSo,
      people_count: s.soNguoi,
      water_level: s.mucNuoc ? MUC_NUOC[s.mucNuoc] : null,
      injured: s.biThuong,
      vulnerable: s.deTonThuongKhach.map((v) => NHOM[v]),
      created_at: s.taoLuc.toISOString(),
    },
    boats: xuong.map((v, i) => ({ ...viTri(v), user_id: `an-${i}`, profile: null })),
  })
})

/**
 * Khách bổ sung cho SOS khẩn của mình: mức nước, bị thương, số người, người dễ tổn thương, vị trí,
 * hoặc huỷ ("tôi đã an toàn"). Không đổi được tên, SĐT, đội, trạng thái khác.
 */
export const PATCH = xuLy(async (req: Request, { params }: Ctx) => {
  const ip = ipNguoiGoi(await headers())
  if (quaHanMuc(`sua-khach:${ip}`, 120, 3600)) throw new LoiNguoiDung('Cập nhật quá nhiều lần. Thử lại sau ít phút.', 429)
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) throw KHONG_THAY()
  const f = await docJson(req, khachSuaSos)
  const s = await db.yeuCauSos.findUnique({ where: { id }, select: { nguoiGuiId: true, trangThai: true } })
  if (!s || !khachDuocSua(s)) throw KHONG_THAY()

  const data: Prisma.YeuCauSosUpdateInput = {
    mucNuoc: f.water_level === undefined ? undefined : f.water_level ? MUC_NUOC_NGUOC[f.water_level] : null,
    biThuong: f.injured,
    soNguoi: f.people_count,
    ghiChu: f.note,
    lat: f.lat,
    lng: f.lng,
    saiSo: f.lat !== undefined ? (f.accuracy ?? null) : undefined,
    pin: f.battery,
    deTonThuongKhach: f.vulnerable?.map((v) => NHOM_NGUOC[v]),
  }
  if (f.status === 'cancelled') data.trangThai = 'DA_HUY'
  await db.yeuCauSos.update({ where: { id }, data })
  await ghiNhatKy(id, null, f.status === 'cancelled' ? 'khach-huy' : 'khach-cap-nhat', f as Prisma.InputJsonValue)
  return ok()
})
