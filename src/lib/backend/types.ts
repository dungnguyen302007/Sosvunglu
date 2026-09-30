import type {
  CitizenSosPatch,
  GuestSosInput,
  NewSos,
  Profile,
  RescuerLocation,
  Role,
  SignUpInput,
  Sos,
  SosStatus,
  StaffSosPatch,
  Team,
} from '../../types'

export interface GuestStatus {
  status: SosStatus
  team_name: string | null
  accepted: boolean
}

/** Lớp dữ liệu chung: bản Supabase (thật) và bản demo (lưu trên máy) cùng giao diện. */
export interface Backend {
  mode: 'supabase' | 'demo'

  getProfile(): Promise<Profile | null>
  onAuthChange(cb: () => void): () => void
  signUp(input: SignUpInput): Promise<void>
  signIn(phone: string, password: string): Promise<void>
  signOut(): Promise<void>
  updateProfile(patch: Partial<Omit<Profile, 'id' | 'role' | 'team_id' | 'phone'>>): Promise<void>

  createSos(input: NewSos): Promise<Sos>
  createGuestSos(input: GuestSosInput): Promise<string>
  guestSosStatus(id: string): Promise<GuestStatus | null>
  myOpenSos(): Promise<Sos | null>
  updateMySos(id: string, patch: CitizenSosPatch): Promise<void>

  /** SOS mà người đang đăng nhập được xem (cứu hộ: đang mở; chỉ huy: tất cả). */
  listSos(): Promise<Sos[]>
  updateSos(id: string, patch: StaffSosPatch): Promise<void>
  /** Đội từ chối → hệ thống chuyển đội kế tiếp. */
  declineSos(id: string): Promise<void>
  /** Quét điều phối: hết 2 phút chưa xác nhận → đổi đội; SOS đang chờ → thử giao. */
  runDispatch(): Promise<void>

  listTeams(): Promise<Team[]>
  createTeam(team: Omit<Team, 'id'>): Promise<void>
  updateTeam(id: string, patch: Partial<Omit<Team, 'id'>>): Promise<void>
  setUserRole(phone: string, role: Role, teamId: string | null): Promise<void>

  upsertMyLocation(lat: number, lng: number, onDuty: boolean): Promise<void>
  listLocations(): Promise<RescuerLocation[]>

  /** Gọi cb mỗi khi SOS / vị trí / đội thay đổi. Trả về hàm hủy đăng ký. */
  subscribe(cb: () => void): () => void
}
