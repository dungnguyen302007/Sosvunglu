import type { Metadata, Viewport } from 'next'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'SOS vùng lũ',
  description: 'Một nút bấm — đội cứu hộ biết bạn ở đâu. Gửi SOS kèm vị trí GPS tới đội cứu hộ gần nhất.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg' },
  appleWebApp: { capable: true, title: 'SOS lũ', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0d12',
}

/**
 * Cấu hình chạy (hotline, số SMS, nền bản đồ) đọc từ .env LÚC CHẠY rồi chèn vào trang
 * (src/lib/config.ts đọc lại) — đổi số không cần build lại ảnh Docker.
 * JSON.stringify + thay "<" để giá trị không phá được thẻ <script>.
 */
function cauHinhChay() {
  const c = {
    hotline: process.env.SO_HOTLINE ?? '',
    soSms: process.env.SO_SMS_SOS ?? '',
    banDoUrl: process.env.BAN_DO_URL ?? '',
    banDoNguon: process.env.BAN_DO_NGUON ?? '',
    vapid: process.env.VAPID_PUBLIC ?? '', // khoá CÔNG KHAI của thông báo đẩy (khoá riêng không bao giờ ra trang)
  }
  return `window.__CAU_HINH__=${JSON.stringify(c).replace(/</g, '\u003c')}`
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <script dangerouslySetInnerHTML={{ __html: cauHinhChay() }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
