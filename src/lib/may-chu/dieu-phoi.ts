import 'server-only'

import type { Prisma, YeuCauSos } from '@prisma/client'

import { DISPATCH, pickTeam } from '@/lib/dispatch'
import { db } from './db'
import { doi as sangDoi, sosDayDu, viTri as sangViTri } from './chuyen-doi'
import { baoDoiCoViec, baoSosChuaCoDoi } from './thong-bao'

/** Gửi thông báo đẩy SAU khi giao dịch xong, không chờ, không để lỗi gửi làm hỏng việc giao đội. */
function bao(sosId: string, doiId: string | null) {
  void (doiId ? baoDoiCoViec(doiId, sosId) : baoSosChuaCoDoi(sosId))
}

/**
 * Điều phối tự động (thay pick_team / reassign_sos / run_dispatch của bản Supabase).
 *
 * Luật chọn đội nằm ở src/lib/dispatch.ts (`pickTeam`, có bài kiểm) — ở đây chỉ nạp dữ liệu,
 * gọi nó, rồi ghi. Mọi lần ghi chạy trong MỘT giao dịch có khoá tư vấn (advisory lock) để hai
 * lượt quét (cron mỗi phút + SOS mới + đội từ chối) không cùng giao một SOS cho hai đội.
 */

const KHOA_DIEU_PHOI = 20260930
type Tx = Prisma.TransactionClient

async function napBoiCanh(tx: Tx) {
  const [sos, teams, locs] = await Promise.all([
    tx.yeuCauSos.findMany({ where: { trangThai: { in: ['CHO_CUU', 'DA_GIAO', 'DANG_TOI', 'DA_TOI'] } } }),
    tx.doi.findMany(),
    tx.viTriCuuHo.findMany({ where: { trongCa: true } }),
  ])
  return { sos: sos.map((s) => sosDayDu(s)), teams: teams.map(sangDoi), locations: locs.map((l) => sangViTri(l)) }
}

type BoiCanh = Awaited<ReturnType<typeof napBoiCanh>>

/** Giao SOS cho đội kế tiếp (bỏ các đội đã thử); hết đội thì trả về "Chờ cứu" cho chỉ huy. */
async function giaoLai(tx: Tx, s: YeuCauSos, ctx: BoiCanh, nguoiLamId: string | null, lyDo: string): Promise<string | null> {
  const doiId = pickTeam(s, { ...ctx, exclude: s.doiDaThu, selfId: s.id })
  if (!doiId && !s.doiId) return null // đang chờ mà vẫn chưa có đội → để nguyên
  const now = new Date()
  await tx.yeuCauSos.update({
    where: { id: s.id },
    data: doiId
      ? { doiId, trangThai: 'DA_GIAO', giaoLuc: now, nhanLuc: null, doiDaThu: { push: doiId } }
      : { doiId: null, trangThai: 'CHO_CUU', giaoLuc: null, nhanLuc: null },
  })
  await tx.nhatKySos.create({
    data: { sosId: s.id, nguoiLamId, hanhDong: doiId ? 'tu-giao' : 'het-doi', chiTiet: { lyDo, doiId } },
  })
  // Cập nhật bối cảnh để SOS sau trong cùng lượt quét thấy SOS này đã có đội (gộp SOS trùng).
  const i = ctx.sos.findIndex((x) => x.id === s.id)
  if (i >= 0 && doiId) ctx.sos[i] = { ...ctx.sos[i], assigned_team_id: doiId, status: 'assigned' }
  return doiId
}

async function trongKhoa<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${KHOA_DIEU_PHOI})`
    return fn(tx)
  })
}

/** SOS vừa tạo → thử giao ngay. */
export async function giaoSosMoi(sosId: string) {
  const doiId = await trongKhoa(async (tx) => {
    const s = await tx.yeuCauSos.findUnique({ where: { id: sosId } })
    if (!s || s.trangThai !== 'CHO_CUU' || s.doiId) return undefined
    return giaoLai(tx, s, await napBoiCanh(tx), null, 'sos-moi')
  })
  if (doiId !== undefined) bao(sosId, doiId) // có đội → báo đội; chưa có đội nào gần → báo chỉ huy + cứu hộ quanh đó
  return doiId ?? null
}

/** Đội từ chối → chuyển đội kế tiếp. Gọi SAU khi đã kiểm quyền. */
export async function doiTuChoi(sosId: string, nguoiLamId: string) {
  const doiId = await trongKhoa(async (tx) => {
    const s = await tx.yeuCauSos.findUnique({ where: { id: sosId } })
    if (!s) return undefined
    return giaoLai(tx, s, await napBoiCanh(tx), nguoiLamId, 'doi-tu-choi')
  })
  if (doiId !== undefined) bao(sosId, doiId)
  return doiId ?? null
}

/**
 * Một cứu hộ vừa tắt ca. Nếu đội KHÔNG còn ai trong ca mà còn việc đang dở → trả việc cho đội
 * khác (hết đội thì về "Chờ cứu" cho chỉ huy), để người dân không ngồi chờ một đội đã nghỉ.
 * Còn đồng đội trong ca thì để nguyên. Trả về số SOS đã trả.
 * (Không xét "còn tín hiệu": đồng đội đang lái xuồng, máy trong túi tắt màn hình vẫn là đang trực.)
 */
export async function doiHetNguoiTruc(doiId: string, nguoiLamId: string): Promise<number> {
  const daGiao: [string, string | null][] = []
  const n = await trongKhoa(async (tx) => {
    if ((await tx.viTriCuuHo.count({ where: { doiId, trongCa: true } })) > 0) return 0
    const dangDo = await tx.yeuCauSos.findMany({
      where: { doiId, trangThai: { in: ['DA_GIAO', 'DANG_TOI', 'DA_TOI'] } },
      orderBy: { taoLuc: 'asc' },
    })
    if (dangDo.length === 0) return 0
    const ctx = await napBoiCanh(tx)
    for (const s of dangDo) {
      daGiao.push([s.id, await giaoLai(tx, s, ctx, nguoiLamId, 'doi-tat-ca')])
      // SOS này không còn của đội vừa nghỉ → đừng để SOS sau "gộp" theo nó.
      const i = ctx.sos.findIndex((x) => x.id === s.id)
      if (i >= 0 && ctx.sos[i].assigned_team_id === doiId) ctx.sos[i] = { ...ctx.sos[i], assigned_team_id: null, status: 'waiting' }
    }
    return dangDo.length
  })
  for (const [sosId, doiMoi] of daGiao) bao(sosId, doiMoi)
  return n
}

/**
 * Quét định kỳ (container cron gọi mỗi phút, và app của cứu hộ/chỉ huy gọi dự phòng):
 *  - đội được giao mà quá 2 phút chưa bấm "Nhận việc" → chuyển đội khác;
 *  - SOS đang chờ, nay đã có đội vào ca → giao.
 */
export async function quetDieuPhoi(): Promise<number> {
  const daGiao: [string, string][] = []
  const n = await trongKhoa(async (tx) => {
    const han = new Date(Date.now() - DISPATCH.acceptMs)
    const canXuLy = await tx.yeuCauSos.findMany({
      where: {
        OR: [
          { trangThai: 'DA_GIAO', nhanLuc: null, giaoLuc: { lt: han } },
          { trangThai: 'CHO_CUU', doiId: null },
        ],
      },
      orderBy: { taoLuc: 'asc' },
    })
    if (canXuLy.length === 0) return 0
    const ctx = await napBoiCanh(tx)
    let n = 0
    for (const s of canXuLy) {
      const lyDo = s.trangThai === 'DA_GIAO' ? 'qua-2-phut' : 'cho-doi'
      const doiId = await giaoLai(tx, s, ctx, null, lyDo)
      if (doiId) {
        n++
        daGiao.push([s.id, doiId])
      }
    }
    return n
  })
  // Chỉ báo khi GIAO ĐƯỢC cho một đội; SOS vẫn chờ thì không báo lại mỗi phút.
  for (const [sosId, doiId] of daGiao) bao(sosId, doiId)
  return n
}
