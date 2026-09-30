import 'server-only'

import type { NguoiDung, Prisma } from '@prisma/client'

import { BAN_KINH_GAN_KM, CHO_NHAN, mucXemSos } from '@/lib/quyen-sos'
import { db } from './db'
import { sosDayDu, sosRutGon } from './chuyen-doi'
import type { Sos } from '@/types'

/** Vị trí cuối cùng của cứu hộ (để lọc "chờ cứu gần tôi"). */
export function viTriCuaToi(nguoiId: string) {
  return db.viTriCuuHo.findUnique({ where: { nguoiDungId: nguoiId }, select: { lat: true, lng: true, capNhatLuc: true } })
}

/** Khung vuông bao quanh bán kính — lọc thô ở CSDL, lọc đúng khoảng cách bằng `mucXemSos`. */
function khungQuanh(lat: number, lng: number, km: number): Prisma.YeuCauSosWhereInput {
  const dLat = km / 111
  const dLng = km / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2))
  return { lat: { gte: lat - dLat, lte: lat + dLat }, lng: { gte: lng - dLng, lte: lng + dLng } }
}

/**
 * Danh sách SOS người này được xem, đã cắt trường theo quyền.
 *  - Chỉ huy: tất cả (30 ngày gần nhất).
 *  - Cứu hộ: SOS của đội mình (đầy đủ) + SOS chờ nhận trong 10 km quanh vị trí cuối (rút gọn).
 *  - Người dân / vai khác: rỗng (người dân dùng /api/sos/cua-toi).
 */
export async function danhSachSos(nguoi: NguoiDung): Promise<Sos[]> {
  if (nguoi.vaiTro === 'CHI_HUY') {
    const ds = await db.yeuCauSos.findMany({
      where: { taoLuc: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
      include: { nguoiGui: true },
      orderBy: { taoLuc: 'desc' },
      take: 5000,
    })
    return ds.map(sosDayDu)
  }
  if (nguoi.vaiTro !== 'CUU_HO') return []

  const viTri = await viTriCuaToi(nguoi.id)
  const hoac: Prisma.YeuCauSosWhereInput[] = []
  if (nguoi.doiId) hoac.push({ doiId: nguoi.doiId, trangThai: { in: ['DA_GIAO', 'DANG_TOI', 'DA_TOI', 'KHONG_TIEP_CAN'] } })
  if (viTri) hoac.push({ trangThai: { in: CHO_NHAN }, ...khungQuanh(viTri.lat, viTri.lng, BAN_KINH_GAN_KM) })
  if (hoac.length === 0) return []

  const ds = await db.yeuCauSos.findMany({ where: { OR: hoac }, include: { nguoiGui: true }, take: 2000 })
  const ketQua: Sos[] = []
  for (const s of ds) {
    const muc = mucXemSos(nguoi, s, viTri)
    if (muc === 'day-du') ketQua.push(sosDayDu(s))
    else if (muc === 'rut-gon') ketQua.push(sosRutGon(s))
  }
  return ketQua
}

export async function ghiNhatKy(sosId: string, nguoiLamId: string | null, hanhDong: string, chiTiet?: Prisma.InputJsonValue) {
  await db.nhatKySos.create({ data: { sosId, nguoiLamId, hanhDong, chiTiet } })
}
