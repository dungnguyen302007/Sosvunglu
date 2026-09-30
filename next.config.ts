import type { NextConfig } from 'next'

/**
 * Chép khuôn An Gia/Greencie, sửa cho app công khai cần định vị:
 *  - Permissions-Policy CHO PHÉP geolocation (CRM chặn; app này sống nhờ GPS).
 *  - img-src cho phép ô bản đồ https từ nhà cung cấp ngoài (Esri, OSM, MapTiler…).
 *  - Trang "/" là cửa công khai cho dân (được lên Google); riêng /api/* gắn X-Robots-Tag noindex.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },

  async headers() {
    const chung = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "img-src 'self' data: blob: https:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline'",
          "connect-src 'self'",
          "worker-src 'self'",
          "font-src 'self' data:",
          "frame-ancestors 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ]
    return [
      { source: '/:path*', headers: chung },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ]
  },
}

export default nextConfig
