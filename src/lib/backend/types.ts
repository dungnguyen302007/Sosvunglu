import type {
  AddressHit,
  CitizenSosPatch,
  GuestSosInput,
  GuestSosPatch,
  Invite,
  NewSos,
  Profile,
  RescuerLocation,
  RescuerSignUpInput,
  Role,
  SignUpInput,
  Sos,
  SosStatus,
  StaffSosPatch,
  Team,
  Vulnerable,
  WaterLevel,
} from '../../types'

export interface GuestStatus {
  status: SosStatus
  team_name: string | null
  accepted: boolean
  /** Những gì khách đã khai (để sửa tiếp) */
  sos: {
    lat: number
    lng: number
    accuracy: number | null
    people_count: number
    water_level: WaterLevel | null
    injured: boolean
    vulnerable: Vulnerable[]
    created_at: string
  }
  /** Xuồng của đội ĐÃ NHẬN đi cứu (ẩn danh); rỗng khi chưa có đội nhận */
  boats: RescuerLocation[]
}

/** Lớp dữ liệu chung: bản Supabase (thật) và bản demo (lưu trên máy) cùng giao diện. */
export interface Backend {
  mode: 'may-chu'

  getProfile(): Promise<Profile | null>
  onAuthChange(cb: () => void): () => void
  signUp(input: SignUpInput): Promise<void>
  /** Cứu hộ đăng ký bằng mã mời đội → vào thẳng đội đó. */
  signUpRescuer(input: RescuerSignUpInput): Promise<void>
  /** Người đã có tài khoản nhập mã mời → thành cứu hộ của đội phát mã. Trả tên đội. */
  joinTeam(code: string): Promise<string>
  signIn(phone: string, password: string): Promise<void>
  signOut(): Promise<void>
  updateProfile(patch: Partial<Omit<Profile, 'id' | 'role' | 'team_id' | 'phone'>>): Promise<void>

  createSos(input: NewSos): Promise<Sos>
  createGuestSos(input: GuestSosInput): Promise<string>
  guestSosStatus(id: string): Promise<GuestStatus | null>
  /** Khách bổ sung thông tin / huỷ SOS khẩn của mình (chìa khoá là mã SOS máy đang giữ). */
  updateGuestSos(id: string, patch: GuestSosPatch): Promise<void>
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
  /** Chỉ huy: mã mời đang sống của các đội / tạo mã mới (mã cũ của đội hết dùng) / thu hồi. */
  listInvites(): Promise<Invite[]>
  createInvite(teamId: string): Promise<Invite>
  revokeInvite(teamId: string): Promise<void>
  /** Chỉ huy: khoá / mở khoá tài khoản phá hoại. */
  lockUser(phone: string, lock: boolean): Promise<void>

  /** Chỉ huy: tất cả tài khoản cứu hộ / chỉ huy (kể cả chưa bật ca, chưa có vị trí). */
  listStaff(): Promise<Profile[]>
  /** Chỉ huy: các hộ dân đã lưu vị trí nhà. */
  listHouseholds(): Promise<Profile[]>

  upsertMyLocation(lat: number, lng: number, onDuty: boolean): Promise<void>
  /** Vị trí cứu hộ được thấy theo vai: chỉ huy = tất cả; cứu hộ = đồng đội + đội lân cận; dân = đội đang cứu mình. */
  listLocations(): Promise<RescuerLocation[]>
  /** Tắt ca (nghỉ). Trả số việc đang dở đã trả về trung tâm vì đội không còn ai trực. */
  endDuty(): Promise<number>

  /** Lưu / gỡ đăng ký thông báo đẩy của trình duyệt này. */
  savePush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void>
  removePush(endpoint: string): Promise<void>

  /** Tìm toạ độ theo địa chỉ gõ tay (ưu tiên quanh `near`). Không cần đăng nhập. */
  searchAddress(q: string, near?: { lat: number; lng: number } | null): Promise<AddressHit[]>

  /** Gọi cb mỗi khi SOS / vị trí / đội thay đổi. Trả về hàm hủy đăng ký. */
  subscribe(cb: () => void): () => void
}
