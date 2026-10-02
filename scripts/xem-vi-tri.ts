/**
 * Soi nhanh khi "không thấy đội trên bản đồ": liệt kê cứu hộ / chỉ huy, đội, đã gửi vị trí chưa,
 * đang trong ca không, và các SOS đang mở. Chỉ ĐỌC. SĐT che bớt.
 *   docker compose --profile tools run --rm tools npx tsx scripts/xem-vi-tri.ts
 */
import { PrismaClient } from '@prisma/client'

const che = (s: string | null) => (s ? s.slice(0, 3) + '****' + s.slice(-3) : '-')
const phut = (d: Date) => `${Math.round((Date.now() - d.getTime()) / 60000)} phut truoc`

async function main() {
  const db = new PrismaClient()
  const nv = await db.nguoiDung.findMany({ where: { vaiTro: { in: ['CUU_HO', 'CHI_HUY'] } }, include: { doi: true, viTri: true } })
  console.log('--- CUU HO / CHI HUY ---')
  for (const n of nv) {
    const v = n.viTri
    console.log(
      `${n.vaiTro} ${che(n.sdt)} | doi: ${n.doi ? `${n.doi.ten} (${n.doi.trangThai})` : 'CHUA CO DOI'} | ` +
        (v ? `vi tri ${v.lat.toFixed(4)},${v.lng.toFixed(4)} ${v.trongCa ? 'TRONG CA' : 'da tat ca'} ${phut(v.capNhatLuc)}` : 'CHUA GUI VI TRI LAN NAO'),
    )
  }
  const sos = await db.yeuCauSos.findMany({
    where: { trangThai: { in: ['CHO_CUU', 'DA_GIAO', 'DANG_TOI', 'DA_TOI', 'KHONG_TIEP_CAN'] } },
    include: { doi: true },
    orderBy: { taoLuc: 'desc' },
    take: 20,
  })
  console.log('--- SOS DANG MO ---')
  for (const s of sos) {
    console.log(`${s.trangThai} ${s.lat.toFixed(4)},${s.lng.toFixed(4)} | doi: ${s.doi?.ten ?? '-'} | da thu: ${s.doiDaThu.length} doi | ${phut(s.taoLuc)}`)
  }
  if (!sos.length) console.log('(khong co)')
  await db.$disconnect()
}
void main()
