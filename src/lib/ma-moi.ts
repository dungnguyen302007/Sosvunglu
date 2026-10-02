import type { MaMoi, NguoiDung } from '@prisma/client'

/**
 * Luật MÃ MỜI ĐỘI — HÀM THUẦN (bài kiểm: ma-moi.test.ts).
 *
 * Chỉ huy tạo mã cho một đội, gửi link / QR vào nhóm của đội. Ai có mã thì đăng ký (hoặc nhập mã
 * trong app) là thành cứu hộ của ĐÚNG đội đó — chỉ huy không phải gõ từng SĐT.
 * Cứu hộ xem được vị trí + sức khoẻ của dân đang kêu cứu, nên mã phải: có hạn, có giới hạn lượt,
 * thu hồi được. Mã sai / hết hạn / bị thu hồi / hết lượt trả CÙNG MỘT câu.
 */

export const MA_MOI = {
  /** Mã sống bao lâu (giờ) */
  gio: 24,
  /** Tối đa bao nhiêu người dùng một mã */
  luot: 30,
  doDai: 6,
}

/** Bỏ 0/O, 1/I để đọc qua điện thoại không nhầm. */
export const BANG_CHU_MA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const MA_KHONG_DUNG = 'Mã mời không đúng, đã hết hạn hoặc đã bị thu hồi. Hỏi lại chỉ huy.'

/** Người gõ tay: chữ thường, dấu cách, gạch… đều bỏ qua. */
export function chuanHoaMa(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

type Ma = Pick<MaMoi, 'thuHoiLuc' | 'hetHanLuc' | 'luotDaDung' | 'luotToiDa'>

export function maConDung(ma: Ma | null, now = Date.now()): boolean {
  if (!ma) return false
  if (ma.thuHoiLuc) return false
  if (ma.hetHanLuc.getTime() <= now) return false
  return ma.luotDaDung < ma.luotToiDa
}

/**
 * Ai được dùng mã để vào đội: người dân (thành cứu hộ) và cứu hộ (đổi đội).
 * Chỉ huy KHÔNG — bấm nhầm link là tự hạ quyền, có khi không còn ai làm chỉ huy.
 */
export function duocDungMa(nguoi: Pick<NguoiDung, 'vaiTro'>): boolean {
  return nguoi.vaiTro === 'DAN' || nguoi.vaiTro === 'CUU_HO'
}
