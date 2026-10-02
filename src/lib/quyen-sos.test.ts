import { describe, expect, it } from 'vitest'
import { BAN_KINH_GAN_KM, doiDangCuu, kiemTraViec, mucXemSos, mucXemViTri, TuChoi, VI_TRI_CU_MS, VI_TRI_SONG_MS } from './quyen-sos'

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

describe('xem vị trí cứu hộ', () => {
  const vt = (o: Partial<{ nguoiDungId: string; doiId: string | null; trongCa: boolean; lat: number; lng: number; capNhatLuc: Date }> = {}) => ({
    nguoiDungId: 'ch-9',
    doiId: 'doi-B' as string | null,
    trongCa: true,
    ...HUE,
    capNhatLuc: new Date(now - 60_000),
    ...o,
  })
  const khongCo = { viTriToi: null, doiDangCuuToi: null }
  const sosDaNhan = { doiId: 'doi-B', trangThai: 'DANG_TOI' as never, nhanLuc: new Date(now - 60_000) }

  it('đội đang cứu = SOS mở, có đội VÀ đội đã bấm nhận', () => {
    expect(doiDangCuu(sosDaNhan)).toBe('doi-B')
    expect(doiDangCuu({ ...sosDaNhan, nhanLuc: null })).toBeNull() // mới tự giao, đội chưa xác nhận
    expect(doiDangCuu({ ...sosDaNhan, trangThai: 'DA_AN_TOAN' as never })).toBeNull()
    expect(doiDangCuu({ ...sosDaNhan, trangThai: 'DA_HUY' as never })).toBeNull()
    expect(doiDangCuu({ ...sosDaNhan, trangThai: 'KHONG_TIEP_CAN' as never })).toBeNull()
    expect(doiDangCuu({ ...sosDaNhan, doiId: null })).toBeNull()
    expect(doiDangCuu(null)).toBeNull()
  })

  it('người dân: thấy đội đang cứu mình, ẨN DANH (không tên/SĐT cứu hộ)', () => {
    expect(mucXemViTri(dan, vt(), { viTriToi: null, doiDangCuuToi: 'doi-B' }, now)).toBe('an-danh')
  })

  it('người dân: KHÔNG thấy đội khác, và không thấy ai khi chưa có đội nhận', () => {
    expect(mucXemViTri(dan, vt({ doiId: 'doi-C' }), { viTriToi: null, doiDangCuuToi: 'doi-B' }, now)).toBeNull()
    expect(mucXemViTri(dan, vt(), khongCo, now)).toBeNull()
    expect(mucXemViTri(dan, vt({ doiId: null }), khongCo, now)).toBeNull()
  })

  it('người dân: cứu hộ tắt ca / mất tín hiệu → biến khỏi bản đồ', () => {
    const ctx = { viTriToi: null, doiDangCuuToi: 'doi-B' }
    expect(mucXemViTri(dan, vt({ trongCa: false }), ctx, now)).toBeNull()
    expect(mucXemViTri(dan, vt({ capNhatLuc: new Date(now - VI_TRI_SONG_MS - 1) }), ctx, now)).toBeNull()
  })

  it('cứu hộ: thấy đội khác ở gần, không thấy đội khác ở xa', () => {
    expect(mucXemViTri(cuuHo, vt(), { viTriToi: viTriMoi, doiDangCuuToi: null }, now)).toBe('day-du')
    expect(mucXemViTri(cuuHo, vt(XA), { viTriToi: viTriMoi, doiDangCuuToi: null }, now)).toBeNull()
  })

  it('cứu hộ: chưa bật ca lần nào (không có vị trí) → không thấy đội khác', () => {
    expect(mucXemViTri(cuuHo, vt(), khongCo, now)).toBeNull()
    expect(mucXemViTri(cuuHo, vt(), { viTriToi: viTriCu, doiDangCuuToi: null }, now)).toBeNull()
  })

  it('cứu hộ: đồng đội đang trực thì thấy dù ở xa; đồng đội tắt ca thì không', () => {
    expect(mucXemViTri(cuuHo, vt({ doiId: 'doi-A', ...XA }), khongCo, now)).toBe('day-du')
    expect(mucXemViTri(cuuHo, vt({ doiId: 'doi-A', trongCa: false }), { viTriToi: viTriMoi, doiDangCuuToi: null }, now)).toBeNull()
  })

  it('cứu hộ: người đội khác đã tắt ca → không thấy dù ở ngay cạnh', () => {
    expect(mucXemViTri(cuuHo, vt({ trongCa: false }), { viTriToi: viTriMoi, doiDangCuuToi: null }, now)).toBeNull()
  })

  it('chỉ huy thấy tất cả, kể cả người đã tắt ca', () => {
    expect(mucXemViTri(chiHuy, vt({ trongCa: false, ...XA }), khongCo, now)).toBe('day-du')
  })

  it('vai lạ → không thấy vị trí nào', () => {
    expect(mucXemViTri(vaiLa, vt(), { viTriToi: viTriMoi, doiDangCuuToi: 'doi-B' }, now)).toBeNull()
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
