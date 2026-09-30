import 'server-only';

import { PrismaClient } from '@prisma/client';

/**
 * Dùng chung một thể hiện PrismaClient cho toàn ứng dụng.
 * Khi chạy `next dev`, mã nguồn được nạp lại nhiều lần nên phải giữ ở globalThis,
 * nếu không mỗi lần nạp lại sẽ mở thêm một pool kết nối tới Postgres.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
