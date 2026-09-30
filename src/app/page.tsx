import { KhungApp } from './khung-app'

/**
 * Cả app là MỘT trang: giao diện chép từ bản Vite (src/App.tsx) chạy phía điện thoại, đổi màn
 * theo vai (người dân / cứu hộ / chỉ huy). Một trang thì service worker cất được trọn để mở
 * khi mất mạng. Dữ liệu đi qua /api/* (src/app/api), quyền chặn ở đó.
 */
export default function TrangChu() {
  return <KhungApp />
}
