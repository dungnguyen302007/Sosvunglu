# Chép khuôn An Gia/Greencie (Next.js standalone + Prisma), bỏ phần ảnh (sharp) chưa dùng.

# ─── 1: cài phụ thuộc ─────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ─── 2: build (tầng này cũng làm ảnh cho service `tools` chạy migrate) ─
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npx next build

# ─── 3: chạy ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl tzdata libc6-compat \
 && cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
 && echo "Asia/Ho_Chi_Minh" > /etc/timezone
ENV NODE_ENV=production TZ=Asia/Ho_Chi_Minh NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/suc-khoe >/dev/null || exit 1
CMD ["node", "server.js"]
