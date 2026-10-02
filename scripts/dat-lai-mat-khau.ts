/**
 * Đặt lại mật khẩu cho một tài khoản (quên mật khẩu). Mật khẩu chỉ lưu dạng băm, không ai xem lại được
 * mật khẩu cũ — chỉ đặt mới. Người chạy TỰ GÕ mật khẩu mới khi được hỏi (không truyền qua tham số, để
 * không nằm lại trong lịch sử lệnh). Mọi phiên đang đăng nhập của tài khoản đó hết hiệu lực.
 *   docker compose --profile tools run --rm tools npx tsx scripts/dat-lai-mat-khau.ts 0702760399
 */
import { createInterface } from 'node:readline/promises'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

async function main() {
  const sdt = process.argv[2]
  if (!sdt) {
    console.error('Dung: npx tsx scripts/dat-lai-mat-khau.ts <sdt>')
    process.exit(1)
  }
  const db = new PrismaClient()
  const nguoi = await db.nguoiDung.findUnique({ where: { sdt }, select: { id: true, hoTen: true, vaiTro: true } })
  if (!nguoi) {
    console.error(`KHONG tim thay tai khoan ${sdt}`)
    process.exit(2)
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const mk = (await rl.question(`Mat khau MOI cho ${sdt} (${nguoi.hoTen}, ${nguoi.vaiTro}) - toi thieu 6 ky tu: `)).trim()
  rl.close()
  if (mk.length < 6) {
    console.error('Mat khau qua ngan, KHONG doi gi.')
    process.exit(1)
  }
  await db.nguoiDung.update({ where: { id: nguoi.id }, data: { matKhauBam: await bcrypt.hash(mk, 10), phienBan: { increment: 1 } } })
  console.log(`Da dat lai mat khau cho ${sdt}. Dang nhap lai bang mat khau moi.`)
  await db.$disconnect()
}
void main()
