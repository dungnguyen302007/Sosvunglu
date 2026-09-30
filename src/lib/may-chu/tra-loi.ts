import 'server-only'

import { NextResponse } from 'next/server'
import { ZodError, type z, type ZodTypeAny } from 'zod'
import type { NguoiDung, VaiTro } from '@prisma/client'

import { layNguoiDung } from './phien'

/** Lỗi có câu báo cho người dùng đọc được (tiếng Việt), kèm mã HTTP. */
export class LoiNguoiDung extends Error {
  constructor(
    message: string,
    public ma = 400,
  ) {
    super(message)
  }
}

/**
 * Không tìm thấy và không có quyền trả CÙNG MỘT câu (quy trình chung B2) — để người dò
 * không phân biệt được "SOS này có tồn tại nhưng không phải của mày" với "không tồn tại".
 */
export const KHONG_THAY = () => new LoiNguoiDung('Không tìm thấy hoặc không có quyền.', 404)

/** Bọc một route: bắt lỗi, trả JSON `{ loi }` thống nhất; lỗi lạ thì không lộ chi tiết. */
export function xuLy<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof LoiNguoiDung) return NextResponse.json({ loi: e.message }, { status: e.ma })
      if (e instanceof ZodError) return NextResponse.json({ loi: 'Dữ liệu gửi lên không hợp lệ.' }, { status: 400 })
      console.error('[api]', e)
      return NextResponse.json({ loi: 'Máy chủ gặp lỗi, thử lại sau ít phút.' }, { status: 500 })
    }
  }
}

export async function docJson<S extends ZodTypeAny>(req: Request, mau: S): Promise<z.output<S>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new LoiNguoiDung('Dữ liệu gửi lên không hợp lệ.')
  }
  return mau.parse(body)
}

/** Bắt buộc đăng nhập, và (nếu truyền) thuộc một trong các vai. */
export async function canNguoi(...vai: VaiTro[]): Promise<NguoiDung> {
  const nguoi = await layNguoiDung()
  if (!nguoi) throw new LoiNguoiDung('Phiên đăng nhập đã hết. Hãy đăng nhập lại.', 401)
  if (vai.length && !vai.includes(nguoi.vaiTro)) throw KHONG_THAY()
  return nguoi
}

export function ok(data: unknown = { ok: true }, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}
