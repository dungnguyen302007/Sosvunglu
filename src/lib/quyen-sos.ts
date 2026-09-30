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
