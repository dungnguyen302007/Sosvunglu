import type { NguoiDung, TrangThaiSos, YeuCauSos } from '@prisma/client'
import { distanceKm, type LatLng } from './geo'

/**
 * Luật "ai được thấy / sửa SOS nào" — HÀM THUẦN (không đụng CSDL) để kiểm thử được bằng
 * vitest (quyen-sos.test.ts). Route API gọi các hàm này; ĐỪNG viết luật quyền rải rác trong route.
 *
 * Nhánh không khớp vai nào luôn trả "không có quyền" (null / ném lỗi) — vai mới quên xử lý
 * thì mặc định không thấy gì, chứ không phải thấy tất cả.
 */

/** Cứu hộ thấy SOS chưa có đội trong bán kính này (km) quanh vị trí cuối cùng của mình. */
export const BAN_KINH_GAN_KM = 10

/** Vị trí cứu hộ cũ hơn chừng này thì không dùng để lọc "gần tôi" (bật ca lại để cập nhật). */
export const VI_TRI_CU_MS = 6 * 3600 * 1000

export const DANG_MO: TrangThaiSos[] = ['CHO_CUU', 'DA_GIAO', 'DANG_TOI', 'DA_TOI']
/** SOS cứu hộ khác có thể nhận: chưa đội nào nhận, hoặc đội trước báo không tiếp cận được. */
export const CHO_NHAN: TrangThaiSos[] = ['CHO_CUU', 'KHONG_TIEP_CAN']

type Nguoi = Pick<NguoiDung, 'id' | 'vaiTro' | 'doiId'>
type Sos = Pick<YeuCauSos, 'nguoiGuiId' | 'doiId' | 'trangThai' | 'lat' | 'lng'>
type ViTri = { lat: number; lng: number; capNhatLuc: Date } | null

export type MucXem = 'day-du' | 'rut-gon' | null

/** SOS này có nằm trong vùng "chờ cứu gần tôi" của cứu hộ không. */
export function ganCuuHo(viTri: ViTri, sos: LatLng, now = Date.now()): boolean {
  if (!viTri || now - viTri.capNhatLuc.getTime() > VI_TRI_CU_MS) return false
  return distanceKm(viTri, sos) <= BAN_KINH_GAN_KM
}

/** Người này được xem SOS ở mức nào. */
export function mucXemSos(nguoi: Nguoi, sos: Sos, viTri: ViTri, now = Date.now()): MucXem {
  switch (nguoi.vaiTro) {
    case 'CHI_HUY':
      return 'day-du'
    case 'DAN':
      return sos.nguoiGuiId === nguoi.id ? 'day-du' : null
    case 'CUU_HO':
      if (nguoi.doiId && sos.doiId === nguoi.doiId && sos.trangThai !== 'DA_HUY') return 'day-du'
      if (CHO_NHAN.includes(sos.trangThai) && (sos.doiId == null || sos.trangThai === 'KHONG_TIEP_CAN') && ganCuuHo(viTri, sos, now))
        return 'rut-gon'
      return null
    default:
      return null
  }
}

/** Vị trí cứu hộ cũ hơn chừng này coi như mất tín hiệu — không hiện cho người dân / đội khác. */
export const VI_TRI_SONG_MS = 15 * 60 * 1000

type ViTriNguoi = { nguoiDungId: string; doiId: string | null; trongCa: boolean; lat: number; lng: number; capNhatLuc: Date }

/** 'day-du' = kèm tên + SĐT cứu hộ; 'an-danh' = chỉ chấm trên bản đồ + đội. */
export type MucXemViTri = 'day-du' | 'an-danh' | null

/**
 * Đội ĐANG ĐI CỨU người dân này: SOS còn mở, đã có đội VÀ đội đã bấm nhận.
 * (Mới tự giao, đội chưa xác nhận thì chưa cho dân thấy — 2 phút sau có thể đổi đội khác.)
 */
export function doiDangCuu(sos: Pick<YeuCauSos, 'doiId' | 'trangThai' | 'nhanLuc'> | null): string | null {
  if (!sos || !sos.doiId || !sos.nhanLuc) return null
  return sos.trangThai === 'DA_GIAO' || sos.trangThai === 'DANG_TOI' || sos.trangThai === 'DA_TOI' ? sos.doiId : null
}

/**
 * Người này được thấy vị trí của một cứu hộ ở mức nào.
 *  - Chỉ huy: tất cả, kể cả người đã tắt ca (hiện xám).
 *  - Cứu hộ: đồng đội + cứu hộ đội khác trong bán kính quanh mình — chỉ người ĐANG trong ca, còn tín hiệu.
 *  - Người dân: CHỈ đội đang đi cứu mình, ẩn danh. Không thấy đội nào khác (kẻ xấu đăng ký
 *    làm dân để theo dõi cứu hộ đang ở đâu là không được).
 * Tắt ca = biến khỏi bản đồ của dân và đội khác ngay.
 */
export function mucXemViTri(
  nguoi: Nguoi,
  v: ViTriNguoi,
  boiCanh: { viTriToi: ViTri; doiDangCuuToi: string | null },
  now = Date.now(),
): MucXemViTri {
  const dangTruc = v.trongCa && now - v.capNhatLuc.getTime() <= VI_TRI_SONG_MS
  switch (nguoi.vaiTro) {
    case 'CHI_HUY':
      return 'day-du'
    case 'CUU_HO':
      if (v.nguoiDungId === nguoi.id) return 'day-du'
      if (!dangTruc) return null
      if (nguoi.doiId && v.doiId === nguoi.doiId) return 'day-du'
      return ganCuuHo(boiCanh.viTriToi, v, now) ? 'day-du' : null
    case 'DAN':
      if (!dangTruc) return null
      return boiCanh.doiDangCuuToi != null && v.doiId === boiCanh.doiDangCuuToi ? 'an-danh' : null
    default:
      return null
  }
}

/**
 * KHÁCH (không tài khoản) xem / sửa SOS khẩn: "chìa khoá" là mã SOS (uuid) máy khách tự giữ.
 * Chỉ SOS do khách gửi; SOS của tài khoản thì không bao giờ mở được bằng đường này.
 * Sửa: chỉ khi còn đang cần cứu.
 */
export function khachDuocXem(sos: Pick<YeuCauSos, 'nguoiGuiId'>): boolean {
  return sos.nguoiGuiId == null
}
export function khachDuocSua(sos: Pick<YeuCauSos, 'nguoiGuiId' | 'trangThai'>): boolean {
  return khachDuocXem(sos) && (DANG_MO.includes(sos.trangThai) || sos.trangThai === 'KHONG_TIEP_CAN')
}

export class TuChoi extends Error {}

/** Việc cứu hộ / chỉ huy được làm trên một SOS. */
export type ViecNhanVien =
  | { loai: 'nhan-ve-doi' } // cứu hộ: "Đội tôi nhận" SOS đang chờ gần mình
  | { loai: 'xac-nhan' } // đội được giao bấm "Nhận việc"
  | { loai: 'doi-trang-thai'; trangThai: TrangThaiSos }
  | { loai: 'giao-doi'; doiId: string | null; trangThai?: TrangThaiSos } // chỉ huy

/** Trạng thái cứu hộ được tự chuyển trên SOS của đội mình. */
const CUU_HO_DUOC_DOI: TrangThaiSos[] = ['DANG_TOI', 'DA_TOI', 'DA_AN_TOAN', 'KHONG_TIEP_CAN']

/** Ném TuChoi nếu không được làm. Không trả gì nếu được. */
export function kiemTraViec(nguoi: Nguoi, sos: Sos, viec: ViecNhanVien, viTri: ViTri, now = Date.now()): void {
  if (nguoi.vaiTro === 'CHI_HUY') return
  if (nguoi.vaiTro !== 'CUU_HO' || !nguoi.doiId) throw new TuChoi()
  const muc = mucXemSos(nguoi, sos, viTri, now)
  switch (viec.loai) {
    case 'nhan-ve-doi':
      if (muc !== 'rut-gon') throw new TuChoi()
      return
    case 'xac-nhan':
      if (sos.doiId !== nguoi.doiId || sos.trangThai !== 'DA_GIAO') throw new TuChoi()
      return
    case 'doi-trang-thai':
      if (sos.doiId !== nguoi.doiId || !DANG_MO.includes(sos.trangThai)) throw new TuChoi()
      if (!CUU_HO_DUOC_DOI.includes(viec.trangThai)) throw new TuChoi()
      return
    default:
      throw new TuChoi()
  }
}
