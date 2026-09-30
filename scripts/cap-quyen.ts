/**
 * Cấp vai cho một tài khoản ĐÃ ĐĂNG KÝ (dùng cho chỉ huy ĐẦU TIÊN — sau đó chỉ huy tự cấp trong app).
 *   docker compose run --rm tools npx tsx scripts/cap-quyen.ts 0702760399 chi-huy
 * Vai: dan | cuu-ho | chi-huy
 */
import { PrismaClient, type VaiTro } from '@prisma/client'

const VAI: Record<string, VaiTro> = { dan: 'DAN', 'cuu-ho': 'CUU_HO', 'chi-huy': 'CHI_HUY' }

async function main() {
  const [sdt, vai] = process.argv.slice(2)
  if (!sdt || !vai || !VAI[vai]) {
    console.error('Dung: npx tsx scripts/cap-quyen.ts <sdt> <dan|cuu-ho|chi-huy>')
    process.exit(1)
  }
  const db = new PrismaClient()
  const r = await db.nguoiDung.updateMany({ where: { sdt }, data: { vaiTro: VAI[vai], doiId: null } })
  console.log(r.count ? `Da cap vai ${vai} cho ${sdt}` : `KHONG tim thay tai khoan ${sdt} - nguoi do can dang ky truoc`)
  await db.$disconnect()
  process.exit(r.count ? 0 : 2)
}
void main()
