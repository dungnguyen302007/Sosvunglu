import 'server-only'

import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { NguoiDung } from '@prisma/client'

import { db } from './db'

/**
 * Phiên đăng nhập: JWT ký bằng AUTH_SECRET trong cookie httpOnly (khuôn Greencie/An Gia).
 *
 * Phiên DÀI (mặc định 365 ngày) là chủ ý (docs/PLAN.md mục 3): người dân đăng nhập một lần
 * trước mùa lũ, lúc lũ về không được bắt gõ lại mật khẩu. Bù lại, MỖI lượt gọi đều đối chiếu
 * CSDL: tài khoản bị khoá hoặc `phienBan` đã tăng (chỉ huy khoá, đổi mật khẩu) thì phiên chết NGAY,
 * không chờ token hết hạn. Vai trò/đội luôn đọc từ CSDL, không tin giá trị trong token.
 */

const TEN_COOKIE = 'sos_phien'
const SO_NGAY_PHIEN = Number(process.env.SESSION_DAYS ?? 365)

function layKhoa(): Uint8Array {
  const khoa = process.env.AUTH_SECRET
  if (!khoa || khoa.length < 32) {
    throw new Error('Thiếu AUTH_SECRET (tối thiểu 32 ký tự). Sinh bằng: openssl rand -base64 48')
  }
  return new TextEncoder().encode(khoa)
}

export async function taoPhien(nguoi: Pick<NguoiDung, 'id' | 'phienBan'>) {
  const token = await new SignJWT({ pb: nguoi.phienBan })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(nguoi.id)
    .setIssuedAt()
    .setExpirationTime(`${SO_NGAY_PHIEN}d`)
    .sign(layKhoa())
  const kho = await cookies()
  kho.set(TEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SO_NGAY_PHIEN * 24 * 3600,
  })
}

export async function xoaPhien() {
  const kho = await cookies()
  kho.delete(TEN_COOKIE)
}

/** Người đang đăng nhập (đọc mới từ CSDL), hoặc null. Không bao giờ ném lỗi vì token hỏng. */
export async function layNguoiDung(): Promise<NguoiDung | null> {
  const kho = await cookies()
  const token = kho.get(TEN_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, layKhoa(), { algorithms: ['HS256'] })
    if (!payload.sub) return null
    const nguoi = await db.nguoiDung.findUnique({ where: { id: payload.sub } })
    if (!nguoi || nguoi.biKhoa || nguoi.phienBan !== payload.pb) return null
    return nguoi
  } catch {
    return null
  }
}
