'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

// Leaflet + localStorage + định vị chỉ có trên trình duyệt → không dựng sẵn ở máy chủ.
const App = dynamic(() => import('@/App'), {
  ssr: false,
  loading: () => <p className="center muted page">Đang mở…</p>,
})

export function KhungApp() {
  useEffect(() => {
    // Service worker: cất giao diện để lúc mất mạng vẫn mở được app và bấm SOS (vào hàng đợi).
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return <App />
}
