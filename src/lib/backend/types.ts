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
  mode: 'may-chu'

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
  /** Chỉ huy: gắn cờ báo giả (huỷ SOS), có thể khoá luôn tài khoản người gửi. */
  reportFake(id: string, lockSender: boolean): Promise<void>

  listTeams(): Promise<Team[]>
  createTeam(team: Omit<Team, 'id'>): Promise<void>
  updateTeam(id: string, patch: Partial<Omit<Team, 'id'>>): Promise<void>
  setUserRole(phone: string, role: Role, teamId: string | null): Promise<void>
  /** Chỉ huy: khoá / mở khoá tài khoản phá hoại. */
  lockUser(phone: string, lock: boolean): Promise<void>

  /** Chỉ huy: tất cả tài khoản cứu hộ / chỉ huy (kể cả chưa bật ca, chưa có vị trí). */
  listStaff(): Promise<Profile[]>
  /** Chỉ huy: các hộ dân đã lưu vị trí nhà. */
  listHouseholds(): Promise<Profile[]>

  upsertMyLocation(lat: number, lng: number, onDuty: boolean): Promise<void>
  listLocations(): Promise<RescuerLocation[]>

  /** Gọi cb mỗi khi SOS / vị trí / đội thay đổi. Trả về hàm hủy đăng ký. */
  subscribe(cb: () => void): () => void
}
