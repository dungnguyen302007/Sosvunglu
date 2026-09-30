/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Số tổng đài nhận SMS SOS dự phòng */
  readonly VITE_SOS_SMS_NUMBER?: string
  /** Số gọi cứu hộ địa phương (mặc định 112) */
  readonly VITE_RESCUE_HOTLINE?: string
  /** Địa chỉ ô bản đồ riêng (có khóa), dạng https://.../{z}/{x}/{y}.png */
  readonly VITE_MAP_TILE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
