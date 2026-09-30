import { describe, expect, it } from 'vitest'
import { BAN_KINH_GAN_KM, kiemTraViec, mucXemSos, TuChoi, VI_TRI_CU_MS } from './quyen-sos'

/**
 * Bộ kiểm phân quyền SOS (hàm thuần). Mỗi vai CỐ xem / sửa thứ không phải của mình → phải bị chặn.
 * Thêm luật quyền mới thì thêm bài ở đây, và THỬ NGƯỢC: sửa tạm luật cho sai, bài phải ĐỎ.
 */

const now = Date.parse('2026-10-01T08:00:00Z')
const HUE = { lat: 16.4637, lng: 107.5909 }
const XA = { lat: 16.4637 + (BAN_KINH_GAN_KM + 2) / 111, lng: 107.5909 } // ~12 km về phía bắc

const dan = { id: 'dan-1', vaiTro: 'DAN' as const, doiId: null }
const danKhac = { id: 'dan-2', vaiTro: 'DAN' as const, doiId: null }
const cuuHo = { id: 'ch-1', vaiTro: 'CUU_HO' as const, doiId: 'doi-A' }
const cuuHoKhongDoi = { id: 'ch-2', vaiTro: 'CUU_HO' as const, doiId: null }
const chiHuy = { id: 'hq-1', vaiTro: 'CHI_HUY' as const, doiId: null }
const vaiLa = { id: 'x', vaiTro: 'KHACH_LA' as never, doiId: null }

const viTriMoi = { ...HUE, capNhatLuc: new Date(now - 60_000) }
const viTriCu = { ...HUE, capNhatLuc: new Date(now - VI_TRI_CU_MS - 1) }

const sos = (o: Partial<{ nguoiGuiId: string | null; doiId: string | null; trangThai: never; lat: number; lng: number }> = {}) => ({
  nguoiGuiId: 'dan-1',
  doiId: null as string | null,
  trangThai: 'CHO_CUU' as never,
  ...HUE,
  ...o,
})

describe('xem SOS', () => {
  it('người dân chỉ thấy SOS của chính mình', () => {
    expect(mucXemSos(dan, sos(), null, now)).toBe('day-du')
    expect(mucXemSos(danKhac, sos(), null, now)).toBeNull()
  })

  it('chỉ huy thấy tất cả, đầy đủ', () => {
    expect(mucXemSos(chiHuy, sos({ doiId: 'doi-B', trangThai: 'DANG_TOI' as never }), null, now)).toBe('day-du')
  })

  it('vai lạ / chưa xử lý → không thấy gì (nhánh mặc định)', () => {
    expect(mucXemSos(vaiLa, sos(), viTriMoi, now)).toBeNull()
  })

  it('cứu hộ: SOS của đội mình → đầy đủ', () => {
    expect(mucXemSos(cuuHo, sos({ doiId: 'doi-A', trangThai: 'DA_GIAO' as never }), null, now)).toBe('day-du')
  })

  it('cứu hộ: SOS đội KHÁC đang cứu → không thấy', () => {
    expect(mucXemSos(cuuHo, sos({ doiId: 'doi-B', trangThai: 'DA_GIAO' as never }), viTriMoi, now)).toBeNull()
  })

  it('cứu hộ: SOS chờ trong bán kính → chỉ RÚT GỌN (không tên/SĐT/hồ sơ)', () => {
    expect(mucXemSos(cuuHo, sos(), viTriMoi, now)).toBe('rut-gon')
  })

  it('cứu hộ: SOS chờ NGOÀI bán kính → không thấy (không xem được dân cả nước)', () => {
    expect(mucXemSos(cuuHo, sos(XA), viTriMoi, now)).toBeNull()
  })

  it('cứu hộ: không có vị trí / vị trí quá cũ → không thấy SOS chờ', () => {
    expect(mucXemSos(cuuHo, sos(), null, now)).toBeNull()
    expect(mucXemSos(cuuHo, sos(), viTriCu, now)).toBeNull()
  })

  it('cứu hộ: SOS đội khác báo không tiếp cận được, ở gần → rút gọn (để nhận thay)', () => {
    expect(mucXemSos(cuuHo, sos({ doiId: 'doi-B', trangThai: 'KHONG_TIEP_CAN' as never }), viTriMoi, now)).toBe('rut-gon')
  })

  it('cứu hộ: SOS đã an toàn / đã huỷ của người khác → không thấy', () => {
    expect(mucXemSos(cuuHo, sos({ trangThai: 'DA_AN_TOAN' as never }), viTriMoi, now)).toBeNull()
    expect(mucXemSos(cuuHo, sos({ trangThai: 'DA_HUY' as never }), viTriMoi, now)).toBeNull()
  })
})

describe('sửa SOS', () => {
  const chan = (fn: () => void) => expect(fn).toThrow(TuChoi)

  it('người dân không làm được việc của nhân viên', () => {
    chan(() => kiemTraViec(dan, sos(), { loai: 'nhan-ve-doi' }, viTriMoi, now))
    chan(() => kiemTraViec(dan, sos(), { loai: 'doi-trang-thai', trangThai: 'DA_AN_TOAN' as never }, null, now))
  })

  it('cứu hộ chưa có đội → không nhận được việc', () => {
    chan(() => kiemTraViec(cuuHoKhongDoi, sos(), { loai: 'nhan-ve-doi' }, viTriMoi, now))
  })

  it('cứu hộ nhận SOS chờ gần mình → được; ở xa → bị chặn', () => {
    expect(() => kiemTraViec(cuuHo, sos(), { loai: 'nhan-ve-doi' }, viTriMoi, now)).not.toThrow()
    chan(() => kiemTraViec(cuuHo, sos(XA), { loai: 'nhan-ve-doi' }, viTriMoi, now))
  })

  it('cứu hộ không cướp SOS đội khác đang cứu', () => {
    chan(() => kiemTraViec(cuuHo, sos({ doiId: 'doi-B', trangThai: 'DANG_TOI' as never }), { loai: 'nhan-ve-doi' }, viTriMoi, now))
    chan(() =>
      kiemTraViec(cuuHo, sos({ doiId: 'doi-B', trangThai: 'DANG_TOI' as never }), { loai: 'doi-trang-thai', trangThai: 'DA_AN_TOAN' as never }, viTriMoi, now),
    )
  })

  it('đội được giao: xác nhận + báo tiến độ được; không tự huỷ / trả về chờ', () => {
    const cuaDoi = sos({ doiId: 'doi-A', trangThai: 'DA_GIAO' as never })
    expect(() => kiemTraViec(cuuHo, cuaDoi, { loai: 'xac-nhan' }, null, now)).not.toThrow()
    expect(() => kiemTraViec(cuuHo, cuaDoi, { loai: 'doi-trang-thai', trangThai: 'DANG_TOI' as never }, null, now)).not.toThrow()
    chan(() => kiemTraViec(cuuHo, cuaDoi, { loai: 'doi-trang-thai', trangThai: 'DA_HUY' as never }, null, now))
    chan(() => kiemTraViec(cuuHo, cuaDoi, { loai: 'doi-trang-thai', trangThai: 'CHO_CUU' as never }, null, now))
  })

  it('cứu hộ không tự giao đội (việc của chỉ huy)', () => {
    chan(() => kiemTraViec(cuuHo, sos(), { loai: 'giao-doi', doiId: 'doi-A' }, viTriMoi, now))
  })

  it('chỉ huy làm được mọi việc', () => {
    expect(() => kiemTraViec(chiHuy, sos({ doiId: 'doi-B' }), { loai: 'giao-doi', doiId: null }, null, now)).not.toThrow()
  })

  it('vai lạ → bị chặn', () => {
    chan(() => kiemTraViec(vaiLa, sos(), { loai: 'xac-nhan' }, viTriMoi, now))
  })
})
