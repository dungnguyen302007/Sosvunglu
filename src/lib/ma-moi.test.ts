import { describe, expect, it } from 'vitest'
import { chuanHoaMa, duocDungMa, maConDung } from './ma-moi'

/** Mã mời đội: mã hỏng kiểu nào cũng KHÔNG vào được đội. Sửa luật thì thử ngược (bài phải đỏ). */

const now = Date.parse('2026-10-02T08:00:00Z')
const ma = (o: Partial<{ thuHoiLuc: Date | null; hetHanLuc: Date; luotDaDung: number; luotToiDa: number }> = {}) => ({
  thuHoiLuc: null,
  hetHanLuc: new Date(now + 3600_000),
  luotDaDung: 0,
  luotToiDa: 30,
  ...o,
})

describe('mã mời đội', () => {
  it('mã còn hạn, còn lượt, chưa thu hồi → dùng được', () => {
    expect(maConDung(ma(), now)).toBe(true)
  })

  it('không có mã như vậy → không', () => {
    expect(maConDung(null, now)).toBe(false)
  })

  it('mã hết hạn → không (kể cả đúng giây hết hạn)', () => {
    expect(maConDung(ma({ hetHanLuc: new Date(now - 1) }), now)).toBe(false)
    expect(maConDung(ma({ hetHanLuc: new Date(now) }), now)).toBe(false)
  })

  it('mã bị chỉ huy thu hồi → không, dù còn hạn còn lượt', () => {
    expect(maConDung(ma({ thuHoiLuc: new Date(now - 1000) }), now)).toBe(false)
  })

  it('mã hết lượt → không', () => {
    expect(maConDung(ma({ luotDaDung: 30 }), now)).toBe(false)
    expect(maConDung(ma({ luotDaDung: 29 }), now)).toBe(true)
  })

  it('người dân và cứu hộ dùng được mã; chỉ huy và vai lạ thì không', () => {
    expect(duocDungMa({ vaiTro: 'DAN' })).toBe(true)
    expect(duocDungMa({ vaiTro: 'CUU_HO' })).toBe(true)
    expect(duocDungMa({ vaiTro: 'CHI_HUY' })).toBe(false)
    expect(duocDungMa({ vaiTro: 'KHACH_LA' as never })).toBe(false)
  })

  it('gõ tay chữ thường, có dấu cách / gạch vẫn nhận', () => {
    expect(chuanHoaMa(' ab3-k9x ')).toBe('AB3K9X')
  })
})
