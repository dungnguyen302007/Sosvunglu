import type { Prisma } from '@prisma/client'

import { db } from '@/lib/may-chu/db'
import { TRANG_THAI_NGUOC } from '@/lib/may-chu/chuyen-doi'
import { nhanVienSuaSos } from '@/lib/may-chu/mau'
import { ghiNhatKy, viTriCuaToi } from '@/lib/may-chu/sos'
import { canNguoi, docJson, KHONG_THAY, LoiNguoiDung, ok, xuLy } from '@/lib/may-chu/tra-loi'
import { CHO_NHAN, kiemTraViec, TuChoi, type ViecNhanVien } from '@/lib/quyen-sos'

type Ctx = { params: Promise<{ id: string }> }

/**
 * Cứu hộ / chỉ huy cập nhật SOS. Body giữ dạng cũ của giao diện ({status, assigned_team_id,
 * accepted_at}); ở đây dịch sang MỘT việc cụ thể rồi hỏi `kiemTraViec` (src/lib/quyen-sos.ts).
 * Giờ "đã nhận" luôn lấy giờ MÁY CHỦ, không tin giờ điện thoại gửi lên.
 */
export const PATCH = xuLy(async (req: Request, { params }: Ctx) => {
  const nguoi = await canNguoi('CUU_HO', 'CHI_HUY')
  const { id } = await params
  const f = await docJson(req, nhanVienSuaSos)
  const sos = await db.yeuCauSos.findUnique({ where: { id } })
  if (!sos) throw KHONG_THAY()
  const now = new Date()

  let viec: ViecNhanVien
  if (nguoi.vaiTro === 'CHI_HUY') viec = { loai: 'giao-doi', doiId: f.assigned_team_id ?? null }
  else if (f.assigned_team_id !== undefined) viec = { loai: 'nhan-ve-doi' }
  else if (f.accepted_at) viec = { loai: 'xac-nhan' }
  else if (f.status) viec = { loai: 'doi-trang-thai', trangThai: TRANG_THAI_NGUOC[f.status] }
  else throw new LoiNguoiDung('Không có gì để cập nhật.')

  try {
    kiemTraViec(nguoi, sos, viec, await viTriCuaToi(nguoi.id))
  } catch (e) {
    if (e instanceof TuChoi) throw KHONG_THAY()
    throw e
  }

  if (viec.loai === 'nhan-ve-doi') {
    if (f.assigned_team_id !== nguoi.doiId) throw KHONG_THAY()
    // Có điều kiện trong WHERE: hai đội bấm "Đội tôi nhận" cùng lúc thì chỉ một đội thắng.
    const r = await db.yeuCauSos.updateMany({
      where: { id, trangThai: { in: CHO_NHAN }, OR: [{ doiId: null }, { trangThai: 'KHONG_TIEP_CAN' }] },
      data: { doiId: nguoi.doiId, trangThai: 'DA_GIAO', giaoLuc: now, nhanLuc: now, doiDaThu: { push: nguoi.doiId! } },
    })
    if (r.count === 0) throw new LoiNguoiDung('SOS này vừa được đội khác nhận.', 409)
    await ghiNhatKy(id, nguoi.id, 'doi-tu-nhan', { doiId: nguoi.doiId })
    return ok()
  }

  const data: Prisma.YeuCauSosUpdateInput = {}
  if (viec.loai === 'xac-nhan') data.nhanLuc = now
  if (viec.loai === 'doi-trang-thai') data.trangThai = viec.trangThai

  if (viec.loai === 'giao-doi') {
    // Chỉ huy: đổi đội và/hoặc trạng thái, hoặc xác nhận thay đội.
    if (f.assigned_team_id !== undefined && f.assigned_team_id !== sos.doiId) {
      if (f.assigned_team_id) {
        const coDoi = await db.doi.findUnique({ where: { id: f.assigned_team_id }, select: { id: true } })
        if (!coDoi) throw new LoiNguoiDung('Không tìm thấy đội.')
        data.doi = { connect: { id: f.assigned_team_id } }
        data.giaoLuc = now
        data.nhanLuc = null
        if (!sos.doiDaThu.includes(f.assigned_team_id)) data.doiDaThu = { push: f.assigned_team_id }
      } else {
        data.doi = { disconnect: true }
        data.giaoLuc = null
        data.nhanLuc = null
      }
    }
    if (f.status) data.trangThai = TRANG_THAI_NGUOC[f.status]
    if (f.accepted_at) data.nhanLuc = now
  }

  await db.yeuCauSos.update({ where: { id }, data })
  await ghiNhatKy(id, nguoi.id, viec.loai, { status: f.status ?? null, doiId: f.assigned_team_id ?? null })
  return ok()
})
