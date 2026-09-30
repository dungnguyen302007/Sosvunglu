import { db } from '@/lib/may-chu/db'

/** Cho bảng tổng quan / Docker healthcheck: app sống + nối được CSDL. Không lộ dữ liệu. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
