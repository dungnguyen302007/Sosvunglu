/** Link mời vào đội: https://<app>/?moi=<MÃ> — chỉ huy gửi vào nhóm của đội hoặc cho quét QR. */

export function maTrongLink(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('moi') || null
  } catch {
    return null
  }
}

/** Dùng xong thì bỏ mã khỏi thanh địa chỉ (tải lại trang không hỏi lại). */
export function boMaKhoiLink() {
  try {
    window.history.replaceState(null, '', window.location.pathname)
  } catch {
    /* bỏ qua */
  }
}

export function linkMoi(code: string): string {
  return `${window.location.origin}/?moi=${encodeURIComponent(code)}`
}
