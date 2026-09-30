import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// base './' → build chạy được ở bất kỳ đường dẫn nào (GitHub Pages /ten-repo/ hoặc VPS /)
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SOS vùng lũ',
        short_name: 'SOS lũ',
        description: 'Một nút bấm gửi vị trí cứu hộ khi gặp lũ lụt',
        lang: 'vi',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Lưu sẵn giao diện → mất mạng vẫn mở được app
        globPatterns: ['**/*.{js,css,html,svg}'],
        runtimeCaching: [
          {
            // Ô bản đồ đã xem được lưu lại, lúc mất mạng vẫn thấy
            urlPattern: /^https:\/\/(tile\.openstreetmap\.org|server\.arcgisonline\.com)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
