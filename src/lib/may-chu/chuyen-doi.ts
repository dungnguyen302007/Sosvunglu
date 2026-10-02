import 'server-only'

import type {
  Doi,
  MucNuoc,
  NguoiDung,
  NhomDeTonThuong,
  TrangThaiDoi,
  TrangThaiSos,
  VaiTro,
  ViTriCuuHo,
  YeuCauSos,
} from '@prisma/client'
import type { Profile, RescuerLocation, Role, Sos, SosStatus, Team, TeamStatus, Vulnerable, WaterLevel } from '@/types'

/**
 * Chuyển bản ghi CSDL (tên tiếng Việt) sang kiểu giao diện (chép từ bản Vite, src/types.ts).
 *
 * 🔴 Đây cũng là chỗ CẮT TRƯỜNG theo quyền. Route nào cũng phải trả qua các hàm ở đây, không
 * trả thẳng bản ghi Prisma: bản ghi có `matKhauBam`, `ipGui`, `phienBan`… — lọt ra một lần là lộ.
 */

function dao<K extends string, V extends string>(m: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<V, K>
}

export const VAI: Record<VaiTro, Role> = { DAN: 'citizen', CUU_HO: 'rescuer', CHI_HUY: 'commander' }
export const VAI_NGUOC = dao(VAI)

export const TRANG_THAI: Record<TrangThaiSos, SosStatus> = {
  CHO_CUU: 'waiting',
  DA_GIAO: 'assigned',
  DANG_TOI: 'on_way',
  DA_TOI: 'arrived',
  DA_AN_TOAN: 'rescued',
  KHONG_TIEP_CAN: 'cannot_reach',
  DA_HUY: 'cancelled',
}
export const TRANG_THAI_NGUOC = dao(TRANG_THAI)

export const MUC_NUOC: Record<MucNuoc, WaterLevel> = { MAT_CA: 'ankle', DAU_GOI: 'knee', NGUC: 'chest', MAI_NHA: 'roof' }
export const MUC_NUOC_NGUOC = dao(MUC_NUOC)

export const NHOM: Record<NhomDeTonThuong, Vulnerable> = {
  NGUOI_GIA: 'elderly',
  TRE_NHO: 'child',
  KHUYET_TAT: 'disabled',
  BENH_NEN: 'chronic',
  MANG_THAI: 'pregnant',
}
export const NHOM_NGUOC = dao(NHOM)

export const TRANG_THAI_DOI: Record<TrangThaiDoi, TeamStatus> = {
  SAN_SANG: 'ready',
  DANG_LAM: 'busy',
  NGHI: 'resting',
  HET_NHIEN_LIEU: 'out_of_fuel',
}
export const TRANG_THAI_DOI_NGUOC = dao(TRANG_THAI_DOI)

/** Hồ sơ đầy đủ — chỉ cho chính chủ, chỉ huy, và đội ĐÃ được giao SOS của người này. */
export function hoSo(n: NguoiDung): Profile {
  return {
    id: n.id,
    full_name: n.hoTen,
    phone: n.sdt,
    role: VAI[n.vaiTro],
    team_id: n.doiId,
    province: n.tinh,
    ward: n.xa,
    hamlet: n.thon,
    address_detail: n.diaChi,
    household_size: n.soNguoi,
    vulnerable: n.deTonThuong.map((v) => NHOM[v]),
    relative_phone: n.sdtNguoiThan,
    note: n.ghiChu,
    home_lat: n.nhaLat,
    home_lng: n.nhaLng,
  }
}

type SosCoNguoi = YeuCauSos & { nguoiGui?: NguoiDung | null }

/** SOS đầy đủ, kèm hồ sơ người gửi (tên, SĐT, người dễ tổn thương, địa chỉ). */
export function sosDayDu(s: SosCoNguoi): Sos {
  return {
    id: s.id,
    user_id: s.nguoiGuiId,
    guest_name: s.tenKhach,
    guest_phone: s.sdtKhach,
    guest_vulnerable: s.deTonThuongKhach.map((v) => NHOM[v]),
    lat: s.lat,
    lng: s.lng,
    accuracy: s.saiSo,
    battery: s.pin,
    people_count: s.soNguoi,
    water_level: s.mucNuoc ? MUC_NUOC[s.mucNuoc] : null,
    injured: s.biThuong,
    note: s.ghiChu,
    status: TRANG_THAI[s.trangThai],
    assigned_team_id: s.doiId,
    assigned_at: s.giaoLuc?.toISOString() ?? null,
    accepted_at: s.nhanLuc?.toISOString() ?? null,
    tried_team_ids: s.doiDaThu,
    created_at: s.taoLuc.toISOString(),
    updated_at: s.capNhatLuc.toISOString(),
    profile: s.nguoiGui ? hoSo(s.nguoiGui) : null,
  }
}

/**
 * SOS RÚT GỌN cho cứu hộ xem "chờ cứu gần tôi" khi SOS CHƯA giao cho đội mình: vị trí, số người,
 * mức nước, bị thương, pin — đủ để quyết định nhận. KHÔNG tên, SĐT, ghi chú, hồ sơ sức khoẻ
 * (docs/PLAN.md mục 6: cứu hộ không xem được danh sách dân). Đội bấm "Đội tôi nhận" xong mới thấy đủ.
 */
export function sosRutGon(s: YeuCauSos): Sos {
  return {
    ...sosDayDu({ ...s, nguoiGui: null }),
    user_id: s.nguoiGuiId ? 'an' : null,
    guest_name: 'Ẩn — hiện khi đội nhận',
    guest_phone: null,
    guest_vulnerable: [],
    note: null,
    tried_team_ids: [],
  }
}

export function doi(d: Doi): Team {
  return { id: d.id, name: d.ten, vehicle: d.phuongTien, capacity: d.sucCho, status: TRANG_THAI_DOI[d.trangThai] }
}

export function viTri(v: ViTriCuuHo & { nguoiDung?: Pick<NguoiDung, 'hoTen' | 'sdt'> | null }): RescuerLocation {
  return {
    user_id: v.nguoiDungId,
    team_id: v.doiId,
    lat: v.lat,
    lng: v.lng,
    on_duty: v.trongCa,
    updated_at: v.capNhatLuc.toISOString(),
    profile: v.nguoiDung ? { full_name: v.nguoiDung.hoTen, phone: v.nguoiDung.sdt } : null,
  }
}
