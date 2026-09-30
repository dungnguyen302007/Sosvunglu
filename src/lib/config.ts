/**
 * Cấu hình đọc lúc CHẠY (không phải lúc build): layout.tsx của máy chủ chèn `window.__CAU_HINH__`
 * từ biến môi trường. Đổi số hotline / nền bản đồ chỉ cần sửa .env rồi khởi động lại, không build lại.
 */
export interface CauHinh {
  hotline: string
  soSms: string
  banDoUrl: string
  banDoNguon: string
}

declare global {
  interface Window {
    __CAU_HINH__?: Partial<CauHinh>
  }
}

function doc(): Partial<CauHinh> {
  return typeof window !== 'undefined' ? (window.__CAU_HINH__ ?? {}) : {}
}

export const cauHinh = {
  get hotline() {
    return doc().hotline || '112'
  },
  get soSms() {
    return doc().soSms || ''
  },
  get banDoUrl() {
    return doc().banDoUrl || ''
  },
  get banDoNguon() {
    return doc().banDoNguon || '&copy; OpenStreetMap contributors'
  },
}

/** Số gọi cứu hộ (mặc định 112). */
export const HOTLINE_MAC_DINH = '112'
