export type Role = 'citizen' | 'rescuer' | 'commander'

export type SosStatus =
  | 'waiting'
  | 'assigned'
  | 'on_way'
  | 'arrived'
  | 'rescued'
  | 'cannot_reach'
  | 'cancelled'

export type WaterLevel = 'ankle' | 'knee' | 'chest' | 'roof'

export type Vulnerable = 'elderly' | 'child' | 'disabled' | 'chronic' | 'pregnant'

export type TeamStatus = 'ready' | 'busy' | 'resting' | 'out_of_fuel'

export interface Profile {
  id: string
  full_name: string
  phone: string
  role: Role
  team_id: string | null
  province: string | null
  ward: string | null
  hamlet: string | null
  address_detail: string | null
  household_size: number
  vulnerable: Vulnerable[]
  relative_phone: string | null
  note: string | null
  /** Vị trí nhà (người dân tự lưu khi đăng ký / trong hồ sơ). Chỉ huy xem để nắm toàn cảnh. */
  home_lat: number | null
  home_lng: number | null
}

export interface Team {
  id: string
  name: string
  vehicle: string
  capacity: number
  status: TeamStatus
}

export interface Sos {
  id: string
  user_id: string | null
  guest_name: string | null
  guest_phone: string | null
  lat: number
  lng: number
  accuracy: number | null
  battery: number | null
  people_count: number
  water_level: WaterLevel | null
  injured: boolean
  note: string | null
  status: SosStatus
  assigned_team_id: string | null
  /** Lúc giao cho đội hiện tại (đội phải xác nhận trong 2 phút) */
  assigned_at: string | null
  /** Lúc đội xác nhận nhận việc; null = chưa xác nhận */
  accepted_at: string | null
  /** Các đội đã từng được giao (để không giao lại đội đã từ chối / hết giờ) */
  tried_team_ids: string[]
  created_at: string
  updated_at: string
  /** Hồ sơ người gửi (null nếu là khách hoặc không có quyền xem) */
  profile?: Profile | null
}

export interface RescuerLocation {
  user_id: string
  team_id: string | null
  lat: number
  lng: number
  on_duty: boolean
  updated_at: string
  profile?: { full_name: string; phone: string } | null
}

export interface SignUpInput {
  full_name: string
  phone: string
  password: string
  province: string
  ward: string
  hamlet: string
  address_detail: string
  household_size: number
  vulnerable: Vulnerable[]
  relative_phone: string
  note: string
  home_lat: number | null
  home_lng: number | null
  /** Đồng ý cho đội cứu hộ / chỉ huy dùng thông tin (có dữ liệu sức khoẻ) — bắt buộc khi đăng ký */
  dong_y: boolean
}

/** Cứu hộ đăng ký bằng mã mời của đội — form ngắn, không cần hồ sơ hộ. */
export interface RescuerSignUpInput {
  full_name: string
  phone: string
  password: string
  ma_moi: string
}

/** Mã mời vào đội (chỉ huy tạo). */
export interface Invite {
  team_id: string
  code: string
  expires_at: string
  max_uses: number
  used: number
}

export interface NewSos {
  lat: number
  lng: number
  accuracy: number | null
  battery: number | null
  people_count: number
}

export interface GuestSosInput extends NewSos {
  name: string
  phone: string
}

export type CitizenSosPatch = Partial<Pick<Sos, 'water_level' | 'injured' | 'people_count' | 'note' | 'lat' | 'lng' | 'accuracy' | 'battery'>> & {
  status?: 'cancelled'
}

export type StaffSosPatch = Partial<Pick<Sos, 'status' | 'assigned_team_id' | 'accepted_at'>>

export const OPEN_STATUSES: SosStatus[] = ['waiting', 'assigned', 'on_way', 'arrived']
