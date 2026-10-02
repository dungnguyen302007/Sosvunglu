import 'server-only'

import { randomInt } from 'node:crypto'
import type { MaMoi, Prisma } from '@prisma/client'

import { BANG_CHU_MA, chuanHoaMa, MA_KHONG_DUNG, MA_MOI, maConDung } from '@/lib/ma-moi'
import type { Invite } from '@/types'
import { db } from './db'
import { LoiNguoiDung } from './tra-loi'

type Tx = Prisma.TransactionClient

function sinhMa(): string {
  let s = ''
  for (let i = 0; i < MA_MOI.doDai; i++) s += BANG_CHU_MA[randomInt(BANG_CHU_MA.length)]
  return s
}

export function sangLoiMoi(m: MaMoi): Invite {
  return { team_id: m.doiId, code: m.ma, expires_at: m.hetHanLuc.toISOString(), max_uses: m.luotToiDa, used: m.luotDaDung }
}

/** Các mã đang sống (chỉ huy xem). */
export async function maDangSong(): Promise<MaMoi[]> {
  const ds = await db.maMoi.findMany({ where: { thuHoiLuc: null, hetHanLuc: { gt: new Date() } }, orderBy: { taoLuc: 'desc' } })
  return ds.filter((m) => maConDung(m))
}

/** Thu hồi mọi mã đang sống của đội. Trả số mã đã thu hồi. */
export async function thuHoiMa(doiId: string, tx: Tx = db): Promise<number> {
  const r = await tx.maMoi.updateMany({ where: { doiId, thuHoiLuc: null }, data: { thuHoiLuc: new Date() } })
  return r.count
}

/** Tạo mã mới cho đội; mã cũ của đội bị thu hồi luôn (mỗi đội chỉ một mã đang sống). */
export async function taoMa(doiId: string, taoBoiId: string): Promise<MaMoi> {
  for (let lan = 0; lan < 5; lan++) {
    try {
      return await db.$transaction(async (tx) => {
        await thuHoiMa(doiId, tx)
        return tx.maMoi.create({
          data: { ma: sinhMa(), doiId, taoBoiId, hetHanLuc: new Date(Date.now() + MA_MOI.gio * 3600_000), luotToiDa: MA_MOI.luot },
        })
      })
    } catch (e) {
      // Trùng mã (hiếm): sinh lại.
      if ((e as { code?: string }).code !== 'P2002') throw e
    }
  }
  throw new LoiNguoiDung('Chưa tạo được mã, thử lại.', 500)
}

/**
 * Dùng một lượt của mã. Gọi TRONG giao dịch cùng với việc đổi vai / tạo tài khoản, để việc sau
 * hỏng thì lượt được trả lại. Điều kiện nằm trong WHERE: 2 người dùng lượt cuối cùng lúc thì
 * chỉ một người được.
 */
export async function dungMa(tx: Tx, raw: string): Promise<MaMoi> {
  const m = await tx.maMoi.findUnique({ where: { ma: chuanHoaMa(raw) } })
  if (!m || !maConDung(m)) throw new LoiNguoiDung(MA_KHONG_DUNG)
  const r = await tx.maMoi.updateMany({
    where: { id: m.id, thuHoiLuc: null, hetHanLuc: { gt: new Date() }, luotDaDung: { lt: m.luotToiDa } },
    data: { luotDaDung: { increment: 1 } },
  })
  if (r.count === 0) throw new LoiNguoiDung(MA_KHONG_DUNG)
  return m
}
